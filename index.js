// require("dotenv").config();
// const app = require("./app");

// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });


// src/server.js
// require('dotenv').config();
// const app = require('./app');
// const { connectWithRetry, registerGracefulShutdown } = require('./config/database');

// const PORT = process.env.PORT || 3000;
// const MONGODB_URI = process.env.MONGODB_URI;

// (async () => {
//   try {
//     await connectWithRetry(MONGODB_URI);
//     registerGracefulShutdown();

//     app.listen(PORT, () => {
//       console.log(`Server listening on port ${PORT}`);
//     });
//   } catch (err) {
//     console.error('Failed to start app due to DB error:', err);
//     process.exit(1);
//   }
// })();





require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectWithRetry, registerGracefulShutdown } = require('./config/database');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  // Test event
  socket.on('ping', (data) => {
    console.log('Ping received:', data);
    socket.emit('pong', { message: 'Hello from server!', timestamp: new Date() });
  });
});

// Make io accessible in routes
app.set('io', io);

// Start the server
(async () => {
  try {
    await connectWithRetry(MONGODB_URI);
    registerGracefulShutdown();

    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      console.log(`Socket.IO server running on ws://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start app:', err);
    process.exit(1);
  }
})();



// AI check (best AI tool for backend)
// work on profile completed Step 
// otp API for testing 
// relationship goal 
// Id verification (URL)
// third parties required 





// missing:
// visibility
// error handling -- structure rmeove array.
// hasSelfie -- isSelfieVerified




// Kyc

// kyc has enums : [pending,approve,rejected]
// kyc hasa object : selfie {
//   url
//   Status
//   msg 
// }

// // block and deactivate


// in photos user can change the order




// 1) add superlike in get feed API
// 2) social auth -- google, facebook
// 3) Get matches API
// 4) Discovery preferenc