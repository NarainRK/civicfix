const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");

// Connects to MongoDB Atlas (cloud-hosted database) using the connection
// string supplied via the MONGODB_URI environment variable.
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Modern mongoose versions no longer need useNewUrlParser/useUnifiedTopology,
      // they are kept here as comments for reference on older driver versions.
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
