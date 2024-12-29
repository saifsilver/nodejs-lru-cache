# Node.js Generic LRU Cache with Time-to-Live (TTL) and Multi-Storage Support

A generic **Least Recently Used (LRU) Cache** implementation with support for:

- **Capacity-based eviction**: Automatically removes the least recently used items when the cache exceeds its capacity.
- **Time-to-Live (TTL)**: Items expire and are removed automatically after a specified time.
- **Automated expiry checking**: Periodic background checks clean up expired items.
- **Graceful shutdown**: Ensures cleanup of background processes on application exit or interruption.
- **Multi-Storage Support**: Flexible storage backends including in-memory, file, Redis, and S3.

## Features

- **Generic Type Support**: Store any type of value in the cache.
- **Configurable Expiry Check Interval**: Control how frequently the cache checks for expired items.
- **Optimized for Performance**: Efficient use of `Map` for O(1) get and put operations in in-memory storage.
- **Flexible Storage Options**:
  - **MemoryStorage**: Fast and ephemeral storage in memory.
  - **FileStorage**: Persistent storage using local files.
  - **RedisStorage**: Distributed and scalable storage using Redis.
  - **S3Storage**: Durable and cloud-based storage using AWS S3.
- **Example Usage Included**: Demonstrates how to use the cache with various storage options.

## Installation

To use this class in your project:

1. Clone the repository or copy the `multi_storage_lru_cache.ts` file.
2. Import the required classes into your project:
   ```typescript
   import LRUCacheWithExpiry, { MemoryStorage, FileStorage, RedisStorage, S3Storage } from './multi_storage_lru_cache';
   ```

## Example Usage

### In-Memory Storage
```typescript
const memoryStorage = new MemoryStorage<string>();
const lruCache = new LRUCacheWithExpiry<string>(3, 5000, 2000, memoryStorage);

await lruCache.put(1, 'A');
console.log(await lruCache.get(1)); // Access 1 -> 'A'
```

### File Storage
```typescript
const fileStorage = new FileStorage<string>('cache.json');
const lruCache = new LRUCacheWithExpiry<string>(3, 5000, 2000, fileStorage);

await lruCache.put(1, 'A');
console.log(await lruCache.get(1)); // Access 1 -> 'A'
```

### Redis Storage
```typescript
const redisStorage = new RedisStorage<string>();
const lruCache = new LRUCacheWithExpiry<string>(3, 5000, 2000, redisStorage);

await lruCache.put(1, 'A');
console.log(await lruCache.get(1)); // Access 1 -> 'A'
```

### S3 Storage
```typescript
const s3Storage = new S3Storage<string>('my-bucket', 'cache.json');
const lruCache = new LRUCacheWithExpiry<string>(3, 5000, 2000, s3Storage);

await lruCache.put(1, 'A');
console.log(await lruCache.get(1)); // Access 1 -> 'A'
```

## Parameters

### Constructor

```typescript
new LRUCacheWithExpiry<T>(
  capacity: number,
  ttl: number,
  expiryCheckInterval: number = 1000,
  storage: CacheStorage<T>
)
```

- **capacity**: Maximum number of items the cache can hold.
- **ttl**: Time-to-live for each cache item in milliseconds.
- **expiryCheckInterval** (optional): Interval (in ms) to check for expired items (default: 1000ms).
- **storage**: A storage backend implementing the `CacheStorage` interface (e.g., `MemoryStorage`, `FileStorage`, etc.).

### Methods

#### `get(key: string | number): Promise<T | -1>`

- Retrieve the value associated with the given key.
- Returns `-1` if the key does not exist or has expired.

#### `put(key: string | number, value: T): Promise<void>`

- Insert or update a value associated with the given key.
- Evicts the least recently used item if the cache exceeds its capacity.

#### `stop(): Promise<void>`

- Stops the background expiry automation process and performs cleanup for the storage backend.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

This project is licensed under the MIT License.

## Author

- **Saif** - Creator of the Multi-Storage LRU Cache implementation.
