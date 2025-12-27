import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixSubscriptionIndex() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        const db = mongoose.connection.db;
        const collection = db.collection('users');

        // List current indexes
        console.log('📋 Current indexes:');
        const indexes = await collection.indexes();
        indexes.forEach(index => {
            console.log(`   - ${index.name}:`, JSON.stringify(index.key));
        });
        console.log();

        // Drop the old subscriptionId index
        console.log('🗑️  Dropping old subscriptionId_1 index...');
        try {
            await collection.dropIndex('subscriptionId_1');
            console.log('   ✅ Old index dropped');
        } catch (error) {
            console.log('   ℹ️  Index may not exist:', error.message);
        }

        // Create new sparse index
        console.log('\n✨ Creating new sparse index on subscriptionId...');
        await collection.createIndex(
            { subscriptionId: 1 },
            { unique: true, sparse: true }
        );
        console.log('   ✅ Sparse index created');

        // Verify
        console.log('\n✅ Updated indexes:');
        const newIndexes = await collection.indexes();
        newIndexes.forEach(index => {
            if (index.key.subscriptionId) {
                console.log(`   - ${index.name}:`, {
                    key: index.key,
                    unique: index.unique,
                    sparse: index.sparse
                });
            }
        });

        console.log('\n✅ Index fix complete! Free tier users can now be created.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

fixSubscriptionIndex();
