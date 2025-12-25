
import { classifierService } from './ClassifierService.js';


export class AudioProcessor {
    /**
     * Processes an audio chunk.
     * @param {string} filePath - Path to the audio file.
     * @param {Object} options - Processing options (mode, threshold).
     * @returns {Promise<Object>} - The processing result.
     */
    async processChunk(filePath, options) {
        const { mode, threshold } = options;
        console.log(`Processing chunk: ${filePath} with mode = ${mode}, threshold = ${threshold} `);

        try {
            const result = await classifierService.classify(filePath, { threshold });
            return result;
        } catch (error) {
            console.error('Classification error:', error);
            throw new Error(`Audio processing failed: ${error.message} `);
        }
    }
}

export const audioProcessor = new AudioProcessor();

