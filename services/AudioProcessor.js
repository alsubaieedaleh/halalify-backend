
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

            // Try python3 first on non-windows, fallback to python
            const isWindows = process.platform === 'win32';
            let pythonExecutable = isWindows ? 'python' : 'python3';

            const startProcess = (cmd) => {
                const proc = spawn(cmd, [
                    pythonScript,
                    '--input', filePath,
                    '--threshold', String(threshold || 0.45)
                ], { shell: true });

                proc.on('error', (err) => {
                    if (err.code === 'ENOENT' && cmd === 'python3' && !isWindows) {
                        console.warn('python3 not found, falling back to python');
                        startProcess('python');
                        return;
                    }
                    console.error(`Failed to start python script with ${cmd}:`, err);
                    reject(new Error(`Failed to spawn python script: ${err.message}`));
                });

                let stdoutData = '';
                let stderrData = '';

                proc.stdout.on('data', (data) => {
                    stdoutData += data.toString();
                });

                proc.stderr.on('data', (data) => {
                    stderrData += data.toString();
                });

                proc.on('close', (code) => {
                    if (code !== 0) {
                        console.error(`Python script (${cmd}) exited with code ${code}`);
                        console.error(`Stderr: ${stderrData}`);
                        return reject(new Error(`Audio processing failed: ${stderrData}`));
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
            };

            startProcess(pythonExecutable);
        });
    }
}

export const audioProcessor = new AudioProcessor();

