// src/modules/kyc/kyc.model.js
const mongoose = require('mongoose');

const KycSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  selfieUrl: { 
    type: String, 
    required: true 
  },
  IDVerificationUrl: { 
    type: String, 
    required: true 
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  verifiedAt: {
    type: Date,
    default: null
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Kyc', KycSchema);
