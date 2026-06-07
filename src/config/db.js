const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/finance-os",
    );
    console.log(
      `[SUCCESS] Database Engine Core Linked: ${conn.connection.host}`,
    );
  } catch (error) {
    console.error(
      `[CRITICAL DESTRUCTION] DB Connection Collapse: ${error.message}`,
    );
    process.exit(1);
  }
};

module.exports = connectDB;
