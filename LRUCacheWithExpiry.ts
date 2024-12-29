/**
 * LRUCacheWithExpiry
 * 
 * A generic Least Recently Used (LRU) Cache implementation with support for:
 * - Capacity-based eviction
 * - Time-to-Live (TTL)
 * - Automated expiry checking
 * - Graceful shutdown
 * 
 * Created by Saif <pay.saif@gmail.com>
 * 
 * License: MIT
 */

class LRUCacheWithExpiry<T> {
  /**
   * Constructor for the LRUCacheWithExpiry class.
   *
   * @param {number} capacity - The maximum capacity of the cache.
   * @param {number} ttl - The time-to-live in milliseconds.
   * @param {number} [expiryCheckInterval=1000] - The interval (in ms) to check for expired items.
   */
  constructor(
    private capacity: number,
    private ttl: number,
    private expiryCheckInterval: number = 1000
  ) {
    this.cache = new Map<string | number, { value: T; expiry: number }>();
    this.startExpiryAutomation();

    // Graceful shutdown on process exit or interruption
    process.on('exit', () => this.stopExpiryAutomation());
    process.on('SIGINT', () => {
      this.stopExpiryAutomation();
      process.exit();
    });
  }

  private cache: Map<string | number, { value: T; expiry: number }>;
  private expiryTimer?: NodeJS.Timeout;

  /**
   * Get a value by its key.
   *
   * @param {string|number} key - The key to retrieve the value for.
   * @returns {T | -1} The value associated with the key, or -1 if the key does not exist or has expired.
   */
  get(key: string | number): T | -1 {
    const item = this.cache.get(key);

    if (!item) {
      return -1;
    }

    const now = Date.now();
    if (item.expiry < now) {
      this.cache.delete(key);
      return -1;
    }

    // Update key as recently used by deleting and re-setting it
    this.cache.delete(key);
    this.cache.set(key, { value: item.value, expiry: item.expiry });

    return item.value;
  }

  /**
   * Insert or update a value by its key.
   *
   * @param {string|number} key - The key to insert or update.
   * @param {T} value - The value to associate with the key.
   */
  put(key: string | number, value: T): void {
    const now = Date.now();
    const expiry = now + this.ttl;

    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, { value, expiry });

    // If the capacity is exceeded, evict the least recently used item
    if (this.cache.size > this.capacity) {
      const leastUsedKey = this.cache.keys().next().value;
      this.cache.delete(leastUsedKey);
    }
  }

  /**
   * Start automated expiry checking.
   */
  private startExpiryAutomation(): void {
    this.expiryTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (item.expiry < now) {
          this.cache.delete(key);
        }
      }
    }, this.expiryCheckInterval);
  }

  /**
   * Stop automated expiry checking.
   */
  private stopExpiryAutomation(): void {
    if (this.expiryTimer) {
      clearInterval(this.expiryTimer);
    }
  }
}

// // Example Usage
// const lruCache = new LRUCacheWithExpiry<string>(3, 5000, 2000); // Check expiry every 2 seconds

// lruCache.put(1, 'A');
// lruCache.put(2, 'B');
// lruCache.put(3, 'C');

// console.log(lruCache.get(1)); // Access 1 -> 'A'

// setTimeout(() => {
//   console.log(lruCache.get(1)); // Returns -1 (expired after 5 seconds)
//   lruCache.put(4, 'D');         // Add 4 -> 'D'
//   console.log(lruCache.get(2)); // Returns -1 (expired)
// }, 6000);
