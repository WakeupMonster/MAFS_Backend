// const { io } = require("socket.io-client");

// const socket = io("http://localhost:4001", {
//   query: { userId: "69326e698057256d8ceea096" }
// });

// socket.on("connect_error", (err) => {
//   console.log("❌ A CONNECT ERROR:", err.message);
// });

// socket.on("connect", () => {
//   console.log("A Connected:", socket.id);

//   socket.emit("join_chat", { matchId: "693a82300cea3c9090330892" });

//   setTimeout(() => {
//     socket.emit("send_message", {
//       matchId: "693a82300cea3c9090330892",
//       receiver: "6932b4f93ac2e6d679eca9d8",
//       text: "Hello B! 👋",
//     });
//   }, 2000);
// });

// socket.on("new_message", (msg) =>
//   console.log("A RECEIVED =>", msg.text)
// );



const { io } = require("socket.io-client");

console.log("Starting testA...");

const USER_A_ID = "69326e698057256d8ceea096";   // 👈 REAL USER ID
const USER_B_ID = "6932b4f93ac2e6d679eca9d8";   // 👈 REAL USER ID
const MATCH_ID  = "693a82300cea3c9090330892";   // 👈 REAL MATCH ID

const socket = io("http://localhost:3001", {
  query: { userId: USER_A_ID }
});

socket.on("connect", () => {
  console.log("✅ A CONNECTED:", socket.id);

  socket.emit("join_chat", { matchId: MATCH_ID });

  setTimeout(() => {
    socket.emit("send_message", {
      matchId: MATCH_ID,
      receiver: USER_B_ID,
      text: "Hello B"
    });
  }, 2000);
});

socket.on("connect_error", (err) => {
  console.log("❌ A CONNECT ERROR:", err.message);
});

socket.on("new_message", (msg) => {
  console.log("📩 A RECEIVED:", msg.text);
});


socket.on("connect", () => {

  socket.emit("join_chat", { matchId: MATCH_ID });

  setTimeout(() => {
  socket.emit("messages_read", { matchId: MATCH_ID });
}, 4000);

});