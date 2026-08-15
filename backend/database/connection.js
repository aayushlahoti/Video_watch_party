import mongoose from 'mongoose';

/**
 * Connects to the MongoDB Atlas database.
 */
export const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('CRITICAL ERROR: MONGODB_URI is not defined in .env file.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`Successfully connected to MongoDB Atlas host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    // Wait for 5 seconds and retry
    console.log('Retrying database connection in 5 seconds...');
    setTimeout(connectDatabase, 5000);
  }
};

/**
 * Disconnects from the MongoDB database.
 */
export const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();
    console.log('Successfully disconnected from MongoDB');
  } catch (error) {
    console.error(`Error disconnecting database: ${error.message}`);
  }
};
