/**
 * KeepAliveService - Prevents Replicate model from going into Cold Boot
 * 
 * Pings Replicate every 3 minutes with a silent audio file.
 * Smart scheduling: Sleeps during low-usage hours (1AM-5AM UTC) to save costs.
 * 
 * Cost: ~$0.0021 per ping × 20 pings/hour × 19 hours = ~$0.80/day
 */

import Replicate from 'replicate';

class KeepAliveService {
    constructor() {
        this.replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });
        
        // Spleeter model version
        this.modelVersion = 'soykertje/spleeter:cd128044253523c86abfd743dea680c88559ad975ccd72378c8433f067ab5d0a';
        
        // Silent audio file (1 second) hosted on GitHub
        this.silentAudioUrl = 'https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3';
        
        // Statistics
        this.stats = {
            success: 0,
            failed: 0,
            lastPing: null,
            isRunning: false
        };
        
        // Interval reference
        this.intervalId = null;
        
        // Ping interval: 3 minutes (180000 ms)
        this.pingInterval = 180000;
        
        // Sleep hours (UTC): 1AM - 5AM
        this.sleepStartHour = 1;
        this.sleepEndHour = 5;
    }

    /**
     * Check if current time is within sleep hours (cost saving)
     */
    isSleepTime() {
        const currentHour = new Date().getUTCHours();
        return currentHour >= this.sleepStartHour && currentHour < this.sleepEndHour;
    }

    /**
     * Send a ping to Replicate to keep the model warm
     */
    async ping() {
        // Skip during sleep hours
        if (this.isSleepTime()) {
            console.log('💤 [Keep-Alive] Sleep mode active (1AM-5AM UTC). Skipping ping...');
            return { skipped: true, reason: 'sleep_hours' };
        }

        try {
            console.log('⏰ [Keep-Alive] Pinging Replicate...');
            
            // Run the model with silent audio
            const output = await this.replicate.run(this.modelVersion, {
                input: { audio: this.silentAudioUrl }
            });
            
            // Update stats
            this.stats.success++;
            this.stats.lastPing = new Date().toISOString();
            
            console.log(`✅ [Keep-Alive] Pulse sent! (Total: ${this.stats.success})`);
            
            return { success: true, output };
            
        } catch (error) {
            this.stats.failed++;
            console.error(`❌ [Keep-Alive] Error: ${error.message}`);
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Start the keep-alive loop
     */
    start() {
        if (this.stats.isRunning) {
            console.log('⚠️ [Keep-Alive] Already running!');
            return;
        }

        if (!process.env.REPLICATE_API_TOKEN) {
            console.error('❌ [Keep-Alive] No REPLICATE_API_TOKEN found! Keep-alive disabled.');
            return;
        }

        console.log('🛡️ [Keep-Alive] Starting keep-alive service...');
        console.log(`   📊 Ping interval: ${this.pingInterval / 1000}s (${this.pingInterval / 60000} minutes)`);
        console.log(`   💤 Sleep hours: ${this.sleepStartHour}:00 - ${this.sleepEndHour}:00 UTC`);
        
        this.stats.isRunning = true;
        
        // First ping immediately
        this.ping();
        
        // Then ping every 3 minutes
        this.intervalId = setInterval(() => {
            this.ping();
        }, this.pingInterval);
    }

    /**
     * Stop the keep-alive loop
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.stats.isRunning = false;
        console.log('🛑 [Keep-Alive] Service stopped.');
    }

    /**
     * Get current statistics
     */
    getStats() {
        return {
            ...this.stats,
            pingInterval: `${this.pingInterval / 60000} minutes`,
            sleepHours: `${this.sleepStartHour}:00 - ${this.sleepEndHour}:00 UTC`,
            currentlyInSleepMode: this.isSleepTime()
        };
    }
}

// Export singleton instance
export const keepAliveService = new KeepAliveService();
