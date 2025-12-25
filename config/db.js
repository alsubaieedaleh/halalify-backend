import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/halalify', {
            // These options are no longer needed in newer Mongoose versions but kept for compatibility logic if needed
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        // If DB is critical, we exit. 
        // process.exit(1); 
        // For development without a DB, we might want to just log the error and continue
        console.warn("Continuing without database connection...");
    }
};

export default connectDB;
