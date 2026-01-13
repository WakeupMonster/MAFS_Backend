const { io } = require("socket.io-client");

const socket = io("http://localhost:3000", {
  auth: {
    token: "PASTE_VALID_JWT_TOKEN_HERE",
  },
  transports: ["websocket"],
});

// connection
socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);

  // join chat
  socket.emit("join_chat", { matchId: "MATCH_ID" });

  // send message
  socket.emit(
    "send_message",
    {
      matchId: "MATCH_ID",
      receiver: "RECEIVER_USER_ID",
      text: "Hello from test script",
      clientTempId: "temp-123",
    },
    (ack) => {
      console.log("ACK:", ack);
    }
  );
});

// listeners
socket.on("new_message", (msg) => {
  console.log("📩 New Message:", msg);
});

socket.on("typing", (data) => {
  console.log("⌨️ Typing:", data);
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected");
});
