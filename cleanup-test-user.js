import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/userModel.js';

dotenv.config();

async function cleanupTestUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Delete test user
        const result = await User.deleteOne({ email: 'authtest@halalify.com' });

        if (result.deletedCount > 0) {
            console.log('🗑️  Deleted existing test user: authtest@halalify.com');
        } else {
            console.log('ℹ️  No test user found to delete');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Cleanup complete');
    }
}

cleanupTestUser();
