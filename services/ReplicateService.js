import Replicate from 'replicate';
import fetch from 'node-fetch';
import fs from 'fs/promises';
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
        
        // 🔍 VALIDATION: Check file size before processing
        const fileBuffer = await fs.readFile(inputFilePath);
        if (fileBuffer.length < 1024) {
            throw new Error(`Audio file too small (${fileBuffer.length} bytes) - possibly corrupted`);
        }
        
        console.log(`📤 [Replicate] Uploading file (${(fileBuffer.length / 1024).toFixed(1)} KB)...`);
        
        // 🔄 RETRY LOGIC: Try up to 3 times
        const maxRetries = 2;
        let lastError = null;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🤖 [Replicate] Attempt ${attempt + 1}/${maxRetries + 1}...`);
                
                // 1. Upload to Replicate file hosting
                const uploadedFile = await this.replicate.files.create(fileBuffer, {
                    filename: path.basename(inputFilePath),
                    content_type: 'audio/mpeg'
                });
                
                console.log(`✅ [Replicate] File uploaded, URL: ${uploadedFile.urls.get}`);
                
                // 2. Run Spleeter model with the hosted URL
                const output = await this.replicate.run(this.modelVersion, {
                    input: { audio: uploadedFile.urls.get }
                });
                
                console.log(`📦 [Replicate] Output received:`, typeof output);
                
                // 3. Extract vocals URL from response
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
                
                console.log(`✅ [Replicate] Vocals URL received (attempt ${attempt + 1})`);
                
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
                lastError = error;
                console.error(`❌ [Replicate] Attempt ${attempt + 1} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    console.log(`🔄 [Replicate] Retrying in 1 second...`);
                    await new Promise(r => setTimeout(r, 1000));
                    continue;
                }
            }
        }
        
        // All retries exhausted
        throw new Error(`Replicate failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
    }
}

export const replicateService = new ReplicateService();
