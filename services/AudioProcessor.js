
import { spawn } from 'child_process';
import path from 'path';


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

        return new Promise((resolve, reject) => {
            const pythonScript = path.join(process.cwd(), 'python', 'classifier.py');
            // Use python3 on Linux/Mac (Railway), python on Windows
            const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';

            const pythonProcess = spawn(pythonExecutable, [
                pythonScript,
                '--input', filePath,
                '--threshold', String(threshold || 0.45)
            ]);

            pythonProcess.on('error', (err) => {
                console.error('Failed to start python script:', err);
                reject(new Error(`Failed to spawn python script: ${err.message}`));
            });

            let stdoutData = '';
            let stderrData = '';

            pythonProcess.stdout.on('data', (data) => {
                stdoutData += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderrData += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error(`Python script exited with code ${code} `);
                    console.error(`Stderr: ${stderrData} `);
                    return reject(new Error(`Audio processing failed: ${stderrData} `));
                }

                try {
                    const result = JSON.parse(stdoutData.trim());
                    if (result.status === 'error') {
                        return reject(new Error(result.message));
                    }
                    resolve(result);
                } catch (error) {
                    console.error('Failed to parse Python output:', stdoutData);
                    reject(new Error('Failed to parse processing results'));
                }
            });
        });
    }
}

export const audioProcessor = new AudioProcessor();

