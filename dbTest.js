const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://yagnikprolix_db_user:DaCQgt5H7zssz2uj@cluster0.g36v6cf.mongodb.net/?appName=Cluster0';

console.log('Attempting to connect to MongoDB Atlas...');
console.time('DB Connection Time');

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000 // fail fast in 5 seconds if connection hangs
})
.then(() => {
  console.log('✓ Successfully connected to MongoDB Atlas!');
  console.timeEnd('DB Connection Time');
  process.exit(0);
})
.catch((err) => {
  console.error('✗ MongoDB connection failed:', err);
  console.timeEnd('DB Connection Time');
  process.exit(1);
});
