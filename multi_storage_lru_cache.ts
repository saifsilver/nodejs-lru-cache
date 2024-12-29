import { createClient } from 'redis';
import { promises as fs } from 'fs';
import AWS from 'aws-sdk';

interface CacheStorage<T> {
  get(key: string | number): Promise<T | -1>;
  put(key: string | number, value: T): Promise<void>;
  delete(key: string | number): Promise<void>;
  stop(): Promise<void>;
}

class MemoryStorage<T> implements CacheStorage<T> {
  private cache: Map<string | number, { value: T; expiry: number }>;

  constructor() {
    this.cache = new Map();
  }

  async get(key: string | number): Promise<T | -1> {
    const item = this.cache.get(key);
    if (!item || item.expiry < Date.now()) {
      this.cache.delete(key);
      return -1;
    }
    return item.value;
  }

  async put(key: string | number, value: T, ttl: number): Promise<void> {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  async delete(key: string | number): Promise<void> {
    this.cache.delete(key);
  }

  async stop(): Promise<void> {
    // No additional cleanup needed for memory
  }
}

class RedisStorage<T> implements CacheStorage<T> {
  private client;

  constructor(existingClient?: ReturnType<typeof createClient>) {
    this.client = existingClient || createClient();
    if (!existingClient) {
      this.client.connect().catch(console.error);
    }
  }

  async get(key: string | number): Promise<T | -1> {
    const value = await this.client.get(key.toString());
    return value ? (JSON.parse(value) as T) : -1;
  }

  async put(key: string | number, value: T, ttl: number): Promise<void> {
    await this.client.set(key.toString(), JSON.stringify(value), { EX: Math.ceil(ttl / 1000) });
  }

  async delete(key: string | number): Promise<void> {
    await this.client.del(key.toString());
  }

  async stop(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.disconnect();
    }
  }
}

class FileStorage<T> implements CacheStorage<T> {
  private filePath: string;
  private cache: Map<string | number, { value: T; expiry: number }>;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.cache = new Map();
    this.loadFromFile();
  }

  private async loadFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data) as Array<[string | number, { value: T; expiry: number }]>
      this.cache = new Map(parsed);
    } catch {
      this.cache = new Map();
    }
  }

  private async saveToFile(): Promise<void> {
    const data = JSON.stringify(Array.from(this.cache.entries()));
    await fs.writeFile(this.filePath, data, 'utf-8');
  }

  async get(key: string | number): Promise<T | -1> {
    const item = this.cache.get(key);
    if (!item || item.expiry < Date.now()) {
      this.cache.delete(key);
      await this.saveToFile();
      return -1;
    }
    return item.value;
  }

  async put(key: string | number, value: T, ttl: number): Promise<void> {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
    await this.saveToFile();
  }

  async delete(key: string | number): Promise<void> {
    this.cache.delete(key);
    await this.saveToFile();
  }

  async stop(): Promise<void> {
    await this.saveToFile();
  }
}

class S3Storage<T> implements CacheStorage<T> {
  private s3: AWS.S3;
  private bucketName: string;
  private cacheKey: string;
  private cache: Map<string | number, { value: T; expiry: number }>;

  constructor(bucketName: string, cacheKey: string, s3Config?: AWS.S3.Types.ClientConfiguration) {
    this.s3 = new AWS.S3(s3Config);
    this.bucketName = bucketName;
    this.cacheKey = cacheKey;
    this.cache = new Map();
    this.loadFromS3();
  }

  private async loadFromS3(): Promise<void> {
    try {
      const data = await this.s3
        .getObject({ Bucket: this.bucketName, Key: this.cacheKey })
        .promise();
      if (data.Body) {
        const parsed = JSON.parse(data.Body.toString('utf-8')) as Array<[
          string | number,
          { value: T; expiry: number }
        ]>;
        this.cache = new Map(parsed);
      }
    } catch {
      this.cache = new Map();
    }
  }

  private async saveToS3(): Promise<void> {
    const data = JSON.stringify(Array.from(this.cache.entries()));
    await this.s3
      .putObject({ Bucket: this.bucketName, Key: this.cacheKey, Body: data })
      .promise();
  }

  async get(key: string | number): Promise<T | -1> {
    const item = this.cache.get(key);
    if (!item || item.expiry < Date.now()) {
      this.cache.delete(key);
      await this.saveToS3();
      return -1;
    }
    return item.value;
  }

  async put(key: string | number, value: T, ttl: number): Promise<void> {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
    await this.saveToS3();
  }

  async delete(key: string | number): Promise<void> {
    this.cache.delete(key);
    await this.saveToS3();
  }

  async stop(): Promise<void> {
    await this.saveToS3();
  }
}

class LRUCacheWithExpiry<T> {
  private storage: CacheStorage<T>;
  private ttl: number;
  private expiryTimer?: NodeJS.Timeout;

  constructor(
    private capacity: number,
    ttl: number,
    private expiryCheckInterval: number = 1000,
    storage: CacheStorage<T>
  ) {
    this.ttl = ttl;
    this.storage = storage;
    this.startExpiryAutomation();

    process.on('exit', () => this.stop());
    process.on('SIGINT', () => {
      this.stop();
      process.exit();
    });
  }

  async get(key: string | number): Promise<T | -1> {
    return await this.storage.get(key);
  }

  async put(key: string | number, value: T): Promise<void> {
    await this.storage.put(key, value, this.ttl);
  }

  private startExpiryAutomation(): void {
    this.expiryTimer = setInterval(async () => {
      const keysToDelete: string[] = [];
      if (this.storage instanceof MemoryStorage) {
        for (const key of (this.storage as MemoryStorage<T>).keys()) {
          const value = await this.get(key);
          if (value === -1) keysToDelete.push(key.toString());
        }
      }
      keysToDelete.forEach((key) => this.storage.delete(key));
    }, this.expiryCheckInterval);
  }

  private async stop(): Promise<void> {
    if (this.expiryTimer) {
      clearInterval(this.expiryTimer);
    }
    await this.storage.stop();
  }
}

// Example Usage
(async () => {
  const s3Storage = new S3Storage<string>('my-bucket', 'cache.json');
  const lruCache = new LRUCacheWithExpiry<string>(3, 5000, 2000, s3Storage); // Use S3Storage for persistence

  await lruCache.put(1, 'A');
  await lruCache.put(2, 'B');
  await lruCache.put(3, 'C');

  console.log(await lruCache.get(1)); // Access 1 -> 'A'

  setTimeout(async () => {
    console.log(await lruCache.get(1)); // Returns -1 (expired after 5 seconds)
    await lruCache.put(4, 'D');         // Add 4 -> 'D'
    console.log(await lruCache.get(2)); // Returns -1 (expired)
  }, 6000);
})();
