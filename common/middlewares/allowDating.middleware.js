module.exports.allowDating = (req, res, next) => {
  const status = req.user.accountStatus;

  if (status !== "active") {
    return res.status(403).json({
      success: false,
      message: "Dating features are disabled for your account."
    });
  }

  next();
};