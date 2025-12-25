import fs from 'fs/promises';
import path from 'path';

export class StorageService {
    constructor() {
        this.uploadDir = path.join(process.cwd(), 'uploads');
    }

    /**
     * Deletes a file from the storage.
     * @param {string} filePath - Absolute path to the file.
     */
    async deleteFile(filePath) {
        try {
            await fs.unlink(filePath);
            console.log(`Deleted file: ${filePath}`);
        } catch (error) {
            console.error(`Error deleting file ${filePath}:`, error.message);
            // We don't throw here to avoid interrupting the main flow if cleanup fails
        }
    }

    /**
     * Cleans up multiple files.
     * @param {string[]} filePaths - Array of file paths.
     */
    async cleanup(filePaths) {
        await Promise.all(filePaths.map(p => this.deleteFile(p)));
    }
}

export const storageService = new StorageService();
