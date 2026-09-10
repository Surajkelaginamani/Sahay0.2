import mongoose from 'mongoose';
import dns from 'node:dns';

// Prioritize IPv4 to prevent hanging on networks with broken IPv6 NAT64 routes
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // fallback for older node versions
}

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/sahay';
  const options = {
    family: 4,
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
  };

  try {
    const conn = await mongoose.connect(uri, options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    // If standard system DNS failed with an SRV resolution error, attempt fallback DNS
    if (
      error.message &&
      (error.message.includes('ENOTFOUND') ||
        error.message.includes('querySrv') ||
        error.message.includes('ENODATA') ||
        error.message.includes('ECONNREFUSED'))
    ) {
      console.warn(`[DB] Standard DNS resolution failed (${error.message}). Retrying with alternate DNS resolvers...`);
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        const conn = await mongoose.connect(uri, options);
        console.log(`MongoDB Connected via alternate DNS: ${conn.connection.host}`);
        return conn;
      } catch (fallbackError) {
        console.error(`MongoDB connection error (after fallback): ${fallbackError.message}`);
        process.exit(1);
      }
    } else {
      console.error(`MongoDB connection error: ${error.message}`);
      process.exit(1);
    }
  }
};

export default connectDB;
