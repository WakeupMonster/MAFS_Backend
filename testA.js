// // // const { io } = require("socket.io-client");

// // // const socket = io("http://localhost:4001", {
// // //   query: { userId: "69326e698057256d8ceea096" }
// // // });

// // // socket.on("connect_error", (err) => {
// // //   console.log("❌ A CONNECT ERROR:", err.message);
// // // });

// // // socket.on("connect", () => {
// // //   console.log("A Connected:", socket.id);

// // //   socket.emit("join_chat", { matchId: "693a82300cea3c9090330892" });

// // //   setTimeout(() => {
// // //     socket.emit("send_message", {
// // //       matchId: "693a82300cea3c9090330892",
// // //       receiver: "6932b4f93ac2e6d679eca9d8",
// // //       text: "Hello B! 👋",
// // //     });
// // //   }, 2000);
// // // });

// // // socket.on("new_message", (msg) =>
// // //   console.log("A RECEIVED =>", msg.text)
// // // );



// // const { io } = require("socket.io-client");

// // console.log("Starting testA...");

// // const USER_A_ID = "69326e698057256d8ceea096";   // 👈 REAL USER ID
// // const USER_B_ID = "6932b4f93ac2e6d679eca9d8";   // 👈 REAL USER ID
// // const MATCH_ID  = "693a82300cea3c9090330892";   // 👈 REAL MATCH ID

// // const socket = io("http://localhost:3001", {
// //   query: { userId: USER_A_ID }
// // });

// // socket.on("connect", () => {
// //   console.log("✅ A CONNECTED:", socket.id);

// //   socket.emit("join_chat", { matchId: MATCH_ID });

// //   setTimeout(() => {
// //     socket.emit("send_message", {
// //       matchId: MATCH_ID,
// //       receiver: USER_B_ID,
// //       text: "Hello B"
// //     });
// //   }, 2000);
// // });

// // socket.on("connect_error", (err) => {
// //   console.log("❌ A CONNECT ERROR:", err.message);
// // });

// // socket.on("new_message", (msg) => {
// //   console.log("📩 A RECEIVED:", msg.text);
// // });


// // socket.on("connect", () => {

// //   socket.emit("join_chat", { matchId: MATCH_ID });

// //   setTimeout(() => {
// //   socket.emit("messages_read", { matchId: MATCH_ID });
// // }, 4000);
// // });


// const { io } = require("socket.io-client");

// console.log("🚀 Starting testA...");

// // const USER_A_ID = "69326e698057256d8ceea096";   // SAME
// // const USER_B_ID = "6932b4f93ac2e6d679eca9d8";   // SAME
// const MATCH_ID  = "69550c123399db3c39b09871";   // SAME

// const USER_A_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTUzYjE1ZGU4NzdiYzM3ZDM1NDM1ZTMiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc2NzMzNzY3MywiZXhwIjoxNzY3NDA5NjczfQ.vXwNjxa7PtvNd-aFLzePlKQoT4YIFXqLQR0yGftyDKg"; // 🔥 REQUIRED

// const socket = io("http://localhost:3001", {
//   auth: {
//     token: USER_A_TOKEN
//   },
//   transports: ["websocket"]
// });

// socket.on("connect", () => {
//   console.log("✅ A CONNECTED:", socket.id);

//   // 1️⃣ Chat screen open
//   socket.emit("join_chat", { matchId: MATCH_ID });

//   // 2️⃣ Send message after 2 sec
//   setTimeout(() => {
//     socket.emit("send_message", {
//       matchId: MATCH_ID,
//       text: "Hello B 👋",
//       clientMessageId: "a-1"
//     });
//   }, 2000);

//   // 3️⃣ Mark messages as read after 4 sec
//   setTimeout(() => {
//     socket.emit("messages_read", { matchId: MATCH_ID });
//   }, 4000);
// });

// socket.on("new_message", (msg) => {
//   console.log("📩 A RECEIVED MESSAGE:", msg.text, "| status:", msg.status);
// });

// socket.on("chat_list_update", (data) => {
//   console.log("⬆️ A CHAT LIST UPDATE:", data);
// });

// socket.on("message_delivered", (data) => {
//   console.log("✓✓ A MESSAGE DELIVERED:", data);
// });

// socket.on("messages_read", (data) => {
//   console.log("👀 A MESSAGES READ EVENT:", data);
// });

// socket.on("disconnect", () => {
//   console.log("❌ A DISCONNECTED");
// });

// socket.on("connect_error", (err) => {
//   console.log("❌ A CONNECT ERROR:", err.message);
// });


const { io } = require("socket.io-client");
const readline = require("readline");

const MATCH_ID  = "69550c123399db3c39b09871";   // SAME

const USER_A_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTUzYjE1ZGU4NzdiYzM3ZDM1NDM1ZTMiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc2NzMzNzY3MywiZXhwIjoxNzY3NDA5NjczfQ.vXwNjxa7PtvNd-aFLzePlKQoT4YIFXqLQR0yGftyDKg"; // 🔥 REQUIRED

const socket = io("http://localhost:3001", {
  auth: { token: USER_A_TOKEN },
  transports: ["websocket"]
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

socket.on("connect", () => {
  console.log("✅ A connected:", socket.id);
  socket.emit("join_chat", { matchId: MATCH_ID });
  console.log("✍️ Type message and press Enter (A → B):");
});

socket.on("new_message", (msg) => {
  console.log(`📩 A RECEIVED: ${msg.text}`);

  // 👉 Chat open hai, toh read mark kar do
  socket.emit("messages_read", { matchId: MATCH_ID });
});

socket.on("messages_read", () => {
  console.log("👀 A saw READ receipt");
});

rl.on("line", (input) => {
  if (!input.trim()) return;

  socket.emit("send_message", {
    matchId: MATCH_ID,
    text: input,
    clientMessageId: "a-" + Date.now()
  });
});
