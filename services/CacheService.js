import { createClient } from 'redis';

class CacheService {
    constructor() {
        this.client = createClient({
            url: process.env.REDIS_URL
        });

        this.client.on('error', (err) => {
            console.warn('Redis Client Error', err.message);
            // We don't crash, just log. The methods will check isReady or similar.
        });

        this.isConnected = false;
        this.connect();
    }

    async connect() {
        try {
            await this.client.connect();
            this.isConnected = true;
            console.log('Redis Connected');
        } catch (err) {
            console.warn('Failed to connect to Redis. Caching disabled.');
        }
    }

    async get(key) {
        if (!this.isConnected) return null;
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (err) {
            return null;
        }
    }

    async set(key, value, ttlSeconds = 3600) {
        if (!this.isConnected) return;
        try {
            await this.client.set(key, JSON.stringify(value), {
                EX: ttlSeconds
            });
        } catch (err) {
            console.warn('Cache set failed', err.message);
        }
    }
}

export const cacheService = new CacheService();
