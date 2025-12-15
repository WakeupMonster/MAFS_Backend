// const { io } = require("socket.io-client");

// const socket = io("http://localhost:4001", {
//   query: { userId: "6932b4f93ac2e6d679eca9d8" }
// });

// socket.on("connect_error", (err) => {
//   console.log("❌ A CONNECT ERROR:", err.message);
// });

// socket.on("connect", () => {
//   console.log("B Connected:", socket.id);
//   socket.emit("join_chat", { matchId: "693a82300cea3c9090330892" });
// });

// socket.on("new_message", (msg) =>
//   console.log("B RECEIVED =>", msg.text)
// );


const { io } = require("socket.io-client");

console.log("Starting testB...");

const USER_B_ID = "6932b4f93ac2e6d679eca9d8";   // 👈 SAME AS ABOVE
const MATCH_ID  = "693a82300cea3c9090330892";   // 👈 SAME MATCH ID

const socket = io("http://localhost:3001", {
  query: { userId: USER_B_ID }
});

socket.on("connect", () => {
  console.log("✅ B CONNECTED:", socket.id);
  socket.emit("join_chat", { matchId: MATCH_ID });
   setTimeout(() => {
    socket.emit("send_message", {
      matchId: MATCH_ID,
      receiver: USER_B_ID,
      text: "Hello A from B, How are you?"
    });
  }, 2000);
});

socket.on("connect_error", (err) => {
  console.log("❌ B CONNECT ERROR:", err.message);
});

socket.on("new_message", (msg) => {
  console.log("📩 B RECEIVED:", msg.text);
});

setTimeout(() => {
  socket.emit("messages_read", { matchId: MATCH_ID });
}, 4000);


