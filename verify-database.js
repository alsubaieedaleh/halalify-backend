import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/userModel.js';
import UsageLog from './models/usageLogModel.js';

dotenv.config();

async function verifyDatabaseChanges() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        const userId = '694da365d6ba9a2e331c6d85';

        // Check user quota
        const user = await User.findById(userId);
        console.log('📊 User Status:');
        console.log('   Email:', user.email);
        console.log('   Plan:', user.plan);
        console.log('   Quota:', user.minutesRemaining, '/', user.minutesTotal);
        console.log('   Status:', user.status);
        console.log();

        // Check usage logs
        const usageLogs = await UsageLog.find({ userId: user._id }).sort({ processedAt: -1 });
        console.log('📋 Usage Logs:', usageLogs.length, 'entries');
        usageLogs.forEach((log, index) => {
            console.log(`   ${index + 1}. Video: ${log.videoUrl}`);
            console.log(`      Chunk: ${log.chunkIndex}`);
            console.log(`      Minutes: ${log.minutesProcessed}`);
            console.log(`      Cached: ${log.cached}`);
            console.log(`      Time: ${log.processedAt.toISOString()}`);
            console.log();
        });

        console.log('✅ Database verification complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

verifyDatabaseChanges();
