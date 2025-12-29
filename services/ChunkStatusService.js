/**
 * ChunkStatusService - Manages chunk processing status (in-memory)
 * Used for polling by Native Host to check processing progress
 */
class ChunkStatusService {
    constructor() {
        this.statuses = new Map();
        this.MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
        
        // Cleanup old entries every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    /**
     * Set status for a chunk
     * @param {string} chunkKey - Unique chunk identifier
     * @param {Object} status - Status object
     */
    set(chunkKey, status) {
        this.statuses.set(chunkKey, {
            ...status,
            updatedAt: Date.now()
        });
    }

    /**
     * Update existing status
     * @param {string} chunkKey 
     * @param {Object} updates 
     */
    update(chunkKey, updates) {
        const current = this.statuses.get(chunkKey) || {};
        this.set(chunkKey, { ...current, ...updates });
    }

    /**
     * Get status for a chunk
     * @param {string} chunkKey 
     * @returns {Object|null}
     */
    get(chunkKey) {
        return this.statuses.get(chunkKey) || null;
    }

    /**
     * Delete a chunk status
     * @param {string} chunkKey 
     */
    delete(chunkKey) {
        this.statuses.delete(chunkKey);
    }

    /**
     * Cleanup old entries
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, value] of this.statuses.entries()) {
            if (now - value.updatedAt > this.MAX_AGE_MS) {
                this.statuses.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 [ChunkStatus] Cleaned up ${cleaned} old entries`);
        }
    }

    /**
     * Get all statuses (for debugging)
     */
    getAll() {
        return Object.fromEntries(this.statuses);
    }
}

export const chunkStatusService = new ChunkStatusService();
