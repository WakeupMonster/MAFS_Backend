module.exports.validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name) return res.status(400).json({ success: false, message: "Name is required" });
  if (!email) return res.status(400).json({ success: false, message: "Email is required" });
  if (!password) return res.status(400).json({ success: false, message: "Password is required" });

  next();
};
