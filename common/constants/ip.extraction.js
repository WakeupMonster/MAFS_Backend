module.exports.getClientIp = (req) => {
  let ip = "";

  const xForwardedFor = req.headers["x-forwarded-for"];

  if (xForwardedFor) {
    ip = xForwardedFor.split(",")[0].trim();
  } else if (req.headers["x-real-ip"]) {
    ip = req.headers["x-real-ip"];
  } else if (req.socket?.remoteAddress) {
    ip = req.socket.remoteAddress;
  } else if (req.ip) {
    ip = req.ip;
  }

  // Normalize IPv6 formats
  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  if (ip === "::1") {
    ip = "127.0.0.1";
  }

  return ip;
};
