export class LRUCache<T> {
    private capacity: number;
    private cache: Map<string, T>;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    get(key: string): T | undefined {
        if (!this.cache.has(key)) return undefined;

        // Refresh item
        const value = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    set(key: string, value: T): void {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.capacity) {
            // Evict oldest (first inserted)
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    has(key: string): boolean {
        return this.cache.has(key);
    }
}

export const apiCache = new LRUCache<any>(500);
