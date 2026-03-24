const mongoose = require('mongoose');
require('dotenv').config();
const Subscription = require('./modules/subscription/models_v3/Subscription');

async function debugSub() {
    await mongoose.connect(process.env.MONGODB_URI);
    const userId = "69b98f0c7ab7e7b8f8ea9fa5";
    const subs = await Subscription.find({ userId }).sort({ expiresAt: -1 }).lean();
    console.log(JSON.stringify(subs, null, 2));
    process.exit(0);
}

debugSub();
