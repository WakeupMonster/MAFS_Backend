const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({_id: Object}, { strict: false, collection: 'users' }));
  const giveawaywinhistories = mongoose.model('GiveawayWinHistory', new mongoose.Schema({}, { strict: false, collection: 'giveawaywinhistories' }));

  const userIds = [
    new mongoose.Types.ObjectId("69b98f0c7ab7e7b8f8ea9fa5"),
    new mongoose.Types.ObjectId("69bc31407ab7e7b8f8eabbf7")
  ];

  const step1 = await User.aggregate([
    {
      $match: {
        _id: { $in: userIds },
        isPremium: true,
        accountStatus: "active"
      }
    }
  ]);
  console.log('Step 1 (basic match):', step1.length);
  process.exit(0);
}

test();
