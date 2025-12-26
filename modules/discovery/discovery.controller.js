const service = require("./discovery.service");

exports.updatePreference = async (req, res) => {
  try {
    const pref = await service.upsertPreference(req.user._id, req.body);
    res.json({ success: true, data: pref });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPreference = async (req, res) => {
  try {
    const pref = await service.getPreference(req.user._id);
    res.json({ success: true, data: pref });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};