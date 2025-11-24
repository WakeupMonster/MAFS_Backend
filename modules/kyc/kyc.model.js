// src/modules/kyc/kyc.model.js
const mongoose = require('mongoose');

const KycSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',   // must match model name in auth.model.js
    required: true,
    index: true
  },

  // Only selfie required for current flow (retake/update allowed)
  selfieUrl: { type: String, required: true },

}, { timestamps: true });

module.exports = mongoose.model('Kyc', KycSchema);