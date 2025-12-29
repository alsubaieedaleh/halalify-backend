import Replicate from 'replicate';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';

/**
 * ReplicateService - Handles AI audio processing via Replicate API
 * Model: Spleeter (soykertje/spleeter) - Cost: ~$0.0021 per prediction
 */
class ReplicateService {
    constructor() {
        this.replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });
        
        // Spleeter model - economical choice
        this.modelVersion = 'soykertje/spleeter:cd128044253523c86abfd743dea680c88559ad975ccd72378c8433f067ab5d0a';
        
        this.uploadsDir = path.join(process.cwd(), 'uploads');
    }

    /**
     * Process audio file through Replicate AI
     * @param {string} inputFilePath - Path to the audio file
     * @returns {Promise<{vocalsPath: string, vocalsUrl: string}>}
     */
    async processAudio(inputFilePath) {
        console.log(`🎵 [Replicate] Processing: ${inputFilePath}`);
        
        try {
            // 1. Create file stream (NOT base64 - Spleeter's ffprobe can't parse data URIs!)
            // This matches how Python's replicate.run() works with open(file, 'rb')
            const fileStats = await fs.stat(inputFilePath);
            const fileStream = createReadStream(inputFilePath);
            
            console.log(`📤 [Replicate] Sending to AI (${(fileStats.size / 1024).toFixed(1)} KB)...`);
            
            // 2. Run Spleeter model with file stream
            const output = await this.replicate.run(this.modelVersion, {
                input: { audio: fileStream }
            });
            
            console.log(`📦 [Replicate] Output received:`, typeof output);
            
            // 3. Extract vocals URL from response
            // Spleeter returns: { vocals: 'url', accompaniment: 'url' }
            let vocalsUrl;
            if (typeof output === 'object' && output.vocals) {
                vocalsUrl = output.vocals;
            } else if (typeof output === 'string') {
                vocalsUrl = output;
            } else {
                throw new Error('Unexpected Replicate output format');
            }
            
            if (!vocalsUrl) {
                throw new Error('No vocals URL in Replicate response');
            }
            
            console.log(`✅ [Replicate] Vocals URL received`);
            
            // 4. Download the processed vocals file
            const filename = `vocals_${Date.now()}_${Math.random().toString(36).substr(2, 8)}.mp3`;
            const vocalsPath = path.join(this.uploadsDir, filename);
            
            const response = await fetch(vocalsUrl);
            if (!response.ok) {
                throw new Error(`Failed to download vocals: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            await fs.writeFile(vocalsPath, Buffer.from(arrayBuffer));
            
            console.log(`💾 [Replicate] Saved to: ${vocalsPath}`);
            
            return {
                vocalsPath,
                filename,
                size: arrayBuffer.byteLength
            };
            
        } catch (error) {
            console.error(`❌ [Replicate] Error:`, error.message);
            throw error;
        }
    }
}

export const replicateService = new ReplicateService();
