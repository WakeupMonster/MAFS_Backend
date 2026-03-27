const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/mafs');
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
  const giveawaywinhistories = mongoose.model('GiveawayWinHistory', new mongoose.Schema({}, { strict: false, collection: 'giveawaywinhistories' }));

  const userIds = [
    new mongoose.Types.ObjectId("69b98f0c7ab7e7b8f8ea9fa5"),
    new mongoose.Types.ObjectId("69ba466b7ab7e7b8f8eaa749")
  ];

  console.log('Testing raw lookup...');
  
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

  const step2 = await User.aggregate([
    {
      $match: {
        _id: { $in: userIds },
        isPremium: true,
        accountStatus: "active"
      }
    },
    {
      $lookup: {
        from: "giveawaywinhistories",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$userId"] },
                  { $eq: ["$year", 2026] }
                ]
              }
            }
          }
        ],
        as: "winsThisYear"
      }
    }
  ]);
  
  console.log('Step 2 (with lookup):', step2.length, step2.map(u => u.winsThisYear));

  const step3 = await User.aggregate([
    {
      $match: {
        _id: { $in: userIds },
        isPremium: true,
        accountStatus: "active"
      }
    },
    {
      $lookup: {
        from: "giveawaywinhistories",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$userId"] },
                  { $eq: ["$year", 2026] }
                ]
              }
            }
          }
        ],
        as: "winsThisYear"
      }
    },
    {
      $match: {
        $expr: { $lt: [{ $size: "$winsThisYear" }, 2] }
      }
    }
  ]);

  console.log('Step 3 (with size match):', step3.length);

  process.exit(0);
}

test();
