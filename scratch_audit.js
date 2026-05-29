require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./modules/subscription/models/SubscriptionTransaction');
const Subscription = require('./modules/subscription/models/Subscription');
const User = require('./modules/auth/auth.model');

async function runAudit() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mafs');
    console.log("Connected to DB");

    const totalTransactions = await Transaction.countDocuments();
    const sandboxTransactions = await Transaction.countDocuments({ $or: [{ isSandbox: true }, { environment: 'sandbox' }] });
    const prodTransactions = await Transaction.countDocuments({ $or: [{ isSandbox: false }, { environment: 'production' }] });

    const totalSubs = await Subscription.countDocuments();
    const sandboxSubs = await Subscription.countDocuments({ environment: 'sandbox' });
    const prodSubs = await Subscription.countDocuments({ environment: 'production' });

    console.log("--- TRANSACTIONS ---");
    console.log("Total:", totalTransactions);
    console.log("Sandbox:", sandboxTransactions);
    console.log("Production:", prodTransactions);

    console.log("--- SUBSCRIPTIONS ---");
    console.log("Total:", totalSubs);
    console.log("Sandbox:", sandboxSubs);
    console.log("Production:", prodSubs);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

runAudit();