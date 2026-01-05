// // // // const { io } = require("socket.io-client");

// // // // const socket = io("http://localhost:4001", {
// // // //   query: { userId: "6932b4f93ac2e6d679eca9d8" }
// // // // });

// // // // socket.on("connect_error", (err) => {
// // // //   console.log("❌ A CONNECT ERROR:", err.message);
// // // // });

// // // // socket.on("connect", () => {
// // // //   console.log("B Connected:", socket.id);
// // // //   socket.emit("join_chat", { matchId: "693a82300cea3c9090330892" });
// // // // });

// // // // socket.on("new_message", (msg) =>
// // // //   console.log("B RECEIVED =>", msg.text)
// // // // );


// // // const { io } = require("socket.io-client");

// // // console.log("Starting testB...");

// // // const USER_B_ID = "6932b4f93ac2e6d679eca9d8";   // 👈 SAME AS ABOVE
// // // const MATCH_ID  = "693a82300cea3c9090330892";   // 👈 SAME MATCH ID

// // // const socket = io("http://localhost:3001", {
// // //   query: { userId: USER_B_ID }
// // // });

// // // socket.on("connect", () => {
// // //   console.log("✅ B CONNECTED:", socket.id);
// // //   socket.emit("join_chat", { matchId: MATCH_ID });
// // //    setTimeout(() => {
// // //     socket.emit("send_message", {
// // //       matchId: MATCH_ID,
// // //       receiver: USER_B_ID,
// // //       text: "Hello A from B, How are you?"
// // //     });
// // //   }, 2000);
// // // });

// // // socket.on("connect_error", (err) => {
// // //   console.log("❌ B CONNECT ERROR:", err.message);
// // // });

// // // socket.on("new_message", (msg) => {
// // //   console.log("📩 B RECEIVED:", msg.text);
// // // });

// // // setTimeout(() => {
// // //   socket.emit("messages_read", { matchId: MATCH_ID });
// // // }, 4000);




// // const { io } = require("socket.io-client");

// // console.log("🚀 Starting testA...");

// // const USER_A_ID = "69326e698057256d8ceea096";   // SAME
// // const USER_B_ID = "6932b4f93ac2e6d679eca9d8";   // SAME
// // const MATCH_ID  = "693a82300cea3c9090330892";   // SAME

// // const USER_A_TOKEN = "PASTE_USER_A_JWT_TOKEN"; // 🔥 REQUIRED

// // const socket = io("http://localhost:3001", {
// //   auth: {
// //     token: USER_A_TOKEN
// //   },
// //   transports: ["websocket"]
// // });

// // socket.on("connect", () => {
// //   console.log("✅ A CONNECTED:", socket.id);

// //   // 1️⃣ Chat screen open
// //   socket.emit("join_chat", { matchId: MATCH_ID });

// //   // 2️⃣ Send message after 2 sec
// //   setTimeout(() => {
// //     socket.emit("send_message", {
// //       matchId: MATCH_ID,
// //       text: "Hello B 👋",
// //       clientMessageId: "a-1"
// //     });
// //   }, 2000);

// //   // 3️⃣ Mark messages as read after 4 sec
// //   setTimeout(() => {
// //     socket.emit("messages_read", { matchId: MATCH_ID });
// //   }, 4000);
// // });

// // socket.on("new_message", (msg) => {
// //   console.log("📩 A RECEIVED MESSAGE:", msg.text, "| status:", msg.status);
// // });

// // socket.on("chat_list_update", (data) => {
// //   console.log("⬆️ A CHAT LIST UPDATE:", data);
// // });

// // socket.on("message_delivered", (data) => {
// //   console.log("✓✓ A MESSAGE DELIVERED:", data);
// // });

// // socket.on("messages_read", (data) => {
// //   console.log("👀 A MESSAGES READ EVENT:", data);
// // });

// // socket.on("disconnect", () => {
// //   console.log("❌ A DISCONNECTED");
// // });

// // socket.on("connect_error", (err) => {
// //   console.log("❌ A CONNECT ERROR:", err.message);
// // });


// const { io } = require("socket.io-client");

// console.log("🚀 Starting testB...");

// // const USER_B_ID = "6932b4f93ac2e6d679eca9d8";   // SAME
// const MATCH_ID  = "693a82300cea3c9090330892";   // SAME

// const USER_B_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTUyMWRmMjAyMGNhMzgyOGVmZDMzYmEiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc2NzMzNzc2NywiZXhwIjoxNzY3NDA5NzY3fQ.uLaM0-e4ia8vnZ0tGfhGnAI0i9TlCHWfe2AJrUFsYkQ"; // 🔥 REQUIRED

// const socket = io("http://localhost:3001", {
//   auth: {
//     token: USER_B_TOKEN
//   },
//   transports: ["websocket"]
// });

// socket.on("connect", () => {
//   console.log("✅ B CONNECTED:", socket.id);

//   // 1️⃣ Chat screen open
//   socket.emit("join_chat", { matchId: MATCH_ID });

//   // 2️⃣ Reply after 2 sec
//   setTimeout(() => {
//     socket.emit("send_message", {
//       matchId: MATCH_ID,
//       text: "Hello A 👋 How are you?",
//       clientMessageId: "b-1"
//     });
//   }, 2000);


//   // 3️⃣ Read messages after 4 sec
//   setTimeout(() => {
//     socket.emit("messages_read", { matchId: MATCH_ID });
//   }, 4000);
// });

// socket.on("new_message", (msg) => {
//   console.log("📩 B RECEIVED MESSAGE:", msg.text, "| status:", msg.status);
// });

// socket.on("chat_list_update", (data) => {
//   console.log("⬆️ B CHAT LIST UPDATE:", data);
// });

// socket.on("message_delivered", (data) => {
//   console.log("✓✓ B MESSAGE DELIVERED:", data);
// });

// socket.on("messages_read", (data) => {
//   console.log("👀 B MESSAGES READ EVENT:", data);
// });

// socket.on("disconnect", () => {
//   console.log("❌ B DISCONNECTED");
// });

// socket.on("connect_error", (err) => {
//   console.log("❌ B CONNECT ERROR:", err.message);
// });




const { io } = require("socket.io-client");
const readline = require("readline");


const MATCH_ID  = "69550c123399db3c39b09871";   // SAME

const USER_B_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTUyMWRmMjAyMGNhMzgyOGVmZDMzYmEiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc2NzMzNzc2NywiZXhwIjoxNzY3NDA5NzY3fQ.uLaM0-e4ia8vnZ0tGfhGnAI0i9TlCHWfe2AJrUFsYkQ"; // 🔥 REQUIRED

const socket = io("http://localhost:3001", {
  auth: { token: USER_B_TOKEN },
  transports: ["websocket"]
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

socket.on("connect", () => {
  console.log("✅ B connected:", socket.id);
  socket.emit("join_chat", { matchId: MATCH_ID });
  console.log("✍️ Type message and press Enter (B → A):");
});

socket.on("new_message", (msg) => {
  console.log(`📩 B RECEIVED: ${msg.text}`);

  // 👉 Chat open hai, toh read mark
  socket.emit("messages_read", { matchId: MATCH_ID });
});

socket.on("messages_read", () => {
  console.log("👀 B saw READ receipt");
});

rl.on("line", (input) => {
  if (!input.trim()) return;

  socket.emit("send_message", {
    matchId: MATCH_ID,
    text: input,
    clientMessageId: "b-" + Date.now()
  });
});
