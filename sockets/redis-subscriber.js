module.exports = (io, redisSub) => {
  redisSub.subscribe("chat:deliver", async (data) => {
    const { receiver, msg } = JSON.parse(data);

    // 🔥 Safe emit (multi-server supported)
    io.to(`user:${receiver}`).emit("new_message", msg);
  });
};
