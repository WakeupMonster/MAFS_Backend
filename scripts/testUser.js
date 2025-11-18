const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const User = require("../modules/auth/auth.model");


const testUser = async () => {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // 2. Create test user
    const user = await User.create({
      username: "testuser1",
      email: "test1@example.com",
      password: "123456",
    });
 
    console.log("User Created:", user);

    // 3. Close connection
    await mongoose.connection.close();
    console.log("Connection Closed");
  } catch (error) {
    console.error("Error:", error.message);
  }
};
testUser();