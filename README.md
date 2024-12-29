# Node.js Generic LRU Cache with Time-to-Live (TTL) and Automated Expiry

A generic **Least Recently Used (LRU) Cache** implementation with support for:

- **Capacity-based eviction**: Automatically removes the least recently used items when the cache exceeds its capacity.
- **Time-to-Live (TTL)**: Items expire and are removed automatically after a specified time.
- **Automated expiry checking**: Periodic background checks clean up expired items.
- **Graceful shutdown**: Ensures cleanup of background processes on application exit or interruption.

## Features

- **Generic Type Support**: Store any type of value in the cache.
- **Configurable Expiry Check Interval**: Control how frequently the cache checks for expired items.
- **Optimized for Performance**: Efficient use of `Map` for O(1) get and put operations.
- **Example Usage Included**: Demonstrates how to use the cache.

## Installation

To use this class in your project:

1. Clone the repository or copy the `LRUCacheWithExpiry.tsx` file.
2. Import the class into your project:
   ```typescript
   import LRUCacheWithExpiry from './LRUCacheWithExpiry';
   ```

## Example Usage

```typescript
const lruCache = new LRUCacheWithExpiry<string>(3, 5000, 2000); // Capacity: 3 items, TTL: 5 seconds, Expiry check: 2 seconds

lruCache.put(1, 'A');
lruCache.put(2, 'B');
lruCache.put(3, 'C');

console.log(lruCache.get(1)); // Access 1 -> 'A'

setTimeout(() => {
  console.log(lruCache.get(1)); // Returns -1 (expired after 5 seconds)
  lruCache.put(4, 'D');         // Add 4 -> 'D'
  console.log(lruCache.get(2)); // Returns -1 (expired)
}, 6000);
```

## Parameters

### Constructor

```typescript
new LRUCacheWithExpiry<T>(
  capacity: number,
  ttl: number,
  expiryCheckInterval: number = 1000
)
```

- **capacity**: Maximum number of items the cache can hold.
- **ttl**: Time-to-live for each cache item in milliseconds.
- **expiryCheckInterval** (optional): Interval (in ms) to check for expired items (default: 1000ms).

### Methods

#### `get(key: string | number): T | -1`

- Retrieve the value associated with the given key.
- Returns `-1` if the key does not exist or has expired.

#### `put(key: string | number, value: T): void`

- Insert or update a value associated with the given key.
- Evicts the least recently used item if the cache exceeds its capacity.

#### `stopExpiryAutomation(): void`

- Stops the background expiry automation process.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

This project is licensed under the MIT License.

## Author

- **Saif** - Creator of the LRUCacheWithExpiry implementation.


