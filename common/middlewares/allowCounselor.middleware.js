module.exports.allowCounselor = (req, res, next) => {
  const status = req.user.accountStatus;

  if (status !== "married") {
    return res.status(403).json({
      success: false,
      message: "This feature is available only for married users."
    });
  }
  next();
};