const mongoose = require('mongoose');

// Mongoose schema definition
const ProfileSchema = new mongoose.Schema({
  onboarding: {
    nextstep: { type: Number, default: 1 },
    currentScreenSlug: { type: String, default: 'welcome_screen' },
    isComplete: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
  }
});

const Profile = mongoose.model('ProfileTest', ProfileSchema);

async function runTest() {
  await mongoose.connect('mongodb://localhost:27017/mafs-test');
  let p = new Profile();
  
  // Simulated request
  const updateData = { isComplete: "true", nextstep: 11, currentScreenSlug: "test" };
  const isComplete = updateData.isComplete !== undefined ? updateData.isComplete : undefined;

  if (isComplete !== undefined) {
    p.onboarding.isComplete = isComplete === 'true' || isComplete === true;
  }
  
  console.log("Before save:", p.onboarding.isComplete);
  await p.save();
  
  const saved = await Profile.findById(p._id);
  console.log("After save:", saved.onboarding.isComplete);
  process.exit(0);
}
runTest();
