import { connectDatabase, disconnectDatabase } from '../database/connection.js';
import User from '../models/User.js';
import Room from '../models/Room.js';

const run = async () => {
  try {
    await connectDatabase();
    console.log('Creating indexes...');
    await Promise.all([User.createIndexes(), Room.createIndexes()]);
    console.log('Indexes created successfully');
  } catch (err) {
    console.error('Failed to create indexes:', err);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
};

run();
