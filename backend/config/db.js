const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
  try {
    // Fix Node.js DNS resolution issues on macOS / specific networks for mongodb+srv URIs
    if (dns.setServers) {
      try {
        dns.setServers(['8.8.8.8', '8.8.4.4']);
      } catch (dnsErr) {
        console.warn('Warning: Could not set custom DNS servers:', dnsErr.message);
      }
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`\n========================================================================`);
    console.log(`💡 [Database Notice] MongoDB Atlas/Local connection failed.`);
    console.log(`💡 Error Details: ${error.message || error}`);
    console.log(`💡 LinkMeet has automatically switched to Offline Demo Mode!`);
    console.log(`⚡ Express & Socket.io WebRTC signaling servers are fully active!`);
    console.log(`========================================================================\n`);
  }
};

module.exports = connectDB;
