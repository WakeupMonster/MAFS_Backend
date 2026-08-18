const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  milestone: {
    targetUserCount: { type: Number, default: 1000 },
    currentCount: { type: Number, default: 0 },
    grantDurationDays: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true }
  }
});
const Model = mongoose.model('Test', schema);
const doc = new Model({ milestone: { currentCount: 5, isActive: true, targetUserCount: 10 } });

console.log('Before spread:', doc.milestone.toObject());

const reqBody = { targetUserCount: 2, grantDurationDays: 30, isActive: true };
doc.milestone = { ...doc.milestone, ...reqBody };

console.log('After spread:', doc.milestone.toObject());
