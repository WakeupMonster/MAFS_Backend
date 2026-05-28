/**
 * MAFS Load Test — Seed Script
 * Creates 10,000 test users + profiles in MongoDB
 * 
 * Usage: node scripts/seed-load-test-users.js
 * 
 * WARNING: This creates FAKE data marked with isFake=true and isTest=true.
 *          Run cleanup with: node scripts/seed-load-test-users.js --cleanup
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../modules/auth/auth.model");
const Profile = require("../modules/profile/profile.model");

const TOTAL_USERS = 10000;
const BATCH_SIZE = 500; // Insert in batches to avoid memory issues on free tier

// Sydney-area coordinates (100km radius)
const SYDNEY_CENTER = { lat: -33.8688, lng: 151.2093 };

// Realistic data pools
const NICKNAMES = [
  "Alex", "Jamie", "Sam", "Morgan", "Taylor", "Jordan", "Casey", "Riley",
  "Quinn", "Avery", "Drew", "Blake", "Charlie", "Dakota", "Skyler", "Finley",
  "Hayden", "Reese", "Sage", "Phoenix", "Rowan", "Emerson", "Marley", "Lennon",
  "Harper", "Aspen", "River", "Sterling", "Indigo", "Oakley"
];

const GENDERS = ["men", "women", "non-binary"];
const RELATIONSHIP_GOALS = ["serious", "casual", "friendship", "marriage", "open"];
const CITIES = ["Sydney", "Parramatta", "Bondi", "Manly", "Chatswood", "Newtown",
  "Surry Hills", "Darling Harbour", "Randwick", "Cronulla", "Penrith", "Liverpool"];

const INTERESTS = ["hiking", "cooking", "photography", "gym", "reading", "travel",
  "music", "movies", "art", "yoga", "gaming", "dancing", "surfing", "coffee",
  "wine", "dogs", "cats", "tech", "fashion", "meditation"];

const ZODIAC_SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset(arr, min, max) {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomCoordinate() {
  // Random point within ~100km of Sydney center
  const latOffset = (Math.random() - 0.5) * 1.8; // ~100km in latitude
  const lngOffset = (Math.random() - 0.5) * 2.2; // ~100km in longitude
  return [
    SYDNEY_CENTER.lng + lngOffset, // MongoDB uses [lng, lat]
    SYDNEY_CENTER.lat + latOffset
  ];
}

function randomDOB() {
  // Age between 18-55
  const age = Math.floor(Math.random() * 37) + 18;
  const now = new Date();
  return new Date(now.getFullYear() - age, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
}

async function seedUsers() {
  const isCleanup = process.argv.includes("--cleanup");

  console.log("🔌 Connecting to MongoDB...");
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  console.log(`📡 Using URI: ${uri.split('@')[1]} (sanitized)`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
    });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ Connection failed!");
    if (err.message.includes("ECONNREFUSED")) {
      console.error("👉 TIP: This is usually a DNS issue or IP Whitelist issue.");
      console.error("👉 Try changing your DNS to 8.8.8.8 or check MongoDB Atlas Network Access.");
    }
    throw err;
  }

  if (isCleanup) {
    console.log("🧹 Cleaning up load test data...\n");

    // Step 1: Find all test user IDs FIRST (primary key for all cleanup)
    const testUsers = await User.find(
      { isTest: true, isFake: true },
      { _id: 1 }
    ).lean();
    const testUserIds = testUsers.map(u => u._id);
    console.log(`   Found ${testUserIds.length} test users`);

    if (testUserIds.length > 0) {
      // Step 2: Delete profiles by userId reference (bulletproof)
      const profileResult = await Profile.deleteMany({
        userId: { $in: testUserIds }
      });
      console.log(`   ✅ Deleted ${profileResult.deletedCount} test profiles (by userId)`);

      // Step 3: Delete any swipes involving test users
      const Swipe = require("../modules/matches/swipe/swipe.model");
      const swipeResult = await Swipe.deleteMany({
        $or: [
          { swiperId: { $in: testUserIds } },
          { targetId: { $in: testUserIds } },
        ]
      });
      console.log(`   ✅ Deleted ${swipeResult.deletedCount} test swipes`);

      // Step 4: Delete any matches involving test users
      const { Match } = require("../modules/matches/swipe/swipe.model");
      const matchResult = await Match.deleteMany({
        users: { $in: testUserIds }
      });
      console.log(`   ✅ Deleted ${matchResult.deletedCount} test matches`);

      // Step 5: Delete test users themselves (last, after references are cleaned)
      const userResult = await User.deleteMany({ _id: { $in: testUserIds } });
      console.log(`   ✅ Deleted ${userResult.deletedCount} test users`);
    }

    // Step 6: Fallback — also clean any orphan profiles with LOAD_TEST marker
    const orphanResult = await Profile.deleteMany({
      about: { $regex: /^LOAD_TEST_PROFILE/ }
    });
    if (orphanResult.deletedCount > 0) {
      console.log(`   ✅ Deleted ${orphanResult.deletedCount} orphan test profiles (by marker)`);
    }

    console.log("\n✅ Cleanup complete! Database is clean.");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`\n🚀 Seeding ${TOTAL_USERS} test users...\n`);

  let totalCreated = 0;
  const allUserIds = [];

  for (let batch = 0; batch < Math.ceil(TOTAL_USERS / BATCH_SIZE); batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_USERS);
    const batchCount = batchEnd - batchStart;

    const users = [];
    const profiles = [];

    for (let i = batchStart; i < batchEnd; i++) {
      const userId = new mongoose.Types.ObjectId();
      const gender = randomFrom(GENDERS);
      const coords = randomCoordinate();
      const nickname = `${randomFrom(NICKNAMES)}${i}`;
      const dob = randomDOB();

      users.push({
        _id: userId,
        phone: `+6140000${String(i).padStart(5, "0")}`,
        phoneHash: `loadtest_hash_${i}`,
        isPhoneVerified: true,
        accountStatus: "active",
        role: "USER",
        isNewUser: false,
        isProfileCompleted: true,
        isTest: true,
        isFake: true,
        fakeProfileMeta: { batchId: "load_test_batch_v1" },
        authMethod: "phone",
        onboarding: { isComplete: true, currentScreenSlug: "" },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      profiles.push({
        userId: userId,
        nickname: nickname,
        dob: dob,
        gender: gender,
        pronouns: gender === "men" ? "he/him" : gender === "women" ? "she/her" : "they/them",
        height: Math.floor(Math.random() * 40) + 155, // 155-195cm
        about: `LOAD_TEST_PROFILE — ${nickname} is a test user for load testing.`,
        jobTitle: randomFrom(["Engineer", "Designer", "Teacher", "Doctor", "Artist", "Chef", "Writer"]),
        company: randomFrom(["Google", "Meta", "Startup", "Hospital", "University", "Freelance"]),
        livingIn: randomFrom(CITIES),
        attributes: {
          zodiac: randomFrom(ZODIAC_SIGNS),
          education: randomFrom(["bachelor", "master", "phd", "high_school"]),
          familyPlans: randomFrom(["want_children", "dont_want", "have_children", "open_to_children"]),
          smoking: randomFrom(["never", "sometimes", "regularly"]),
          drinking: randomFrom(["never", "socially", "frequently"]),
          workout: randomFrom(["daily", "sometimes", "never"]),
          pets: randomFrom(["dog", "cat", "both", "none"]),
          interests: randomSubset(INTERESTS, 3, 8),
          languages: randomSubset(["English", "Hindi", "Spanish", "French", "Mandarin", "Arabic"], 1, 3),
        },
        discovery: {
          distanceRange: Math.floor(Math.random() * 80) + 20,
          ageRange: { min: 18, max: 55 },
          showMeGender: [randomFrom(["men", "women", "everyone"])],
          relationshipGoal: randomFrom(RELATIONSHIP_GOALS),
          globalVisibility: "everyone",
          preferredInterests: randomSubset(INTERESTS, 2, 5),
        },
        photos: [
          {
            id: `photo_${i}_1`,
            url: `https://picsum.photos/seed/${i}/400/600`,
            publicId: `load_test/${i}_1`,
            order: 0,
          },
          {
            id: `photo_${i}_2`,
            url: `https://picsum.photos/seed/${i + 10000}/400/600`,
            publicId: `load_test/${i}_2`,
            order: 1,
          },
        ],
        location: {
          type: "Point",
          coordinates: coords,
          city: randomFrom(CITIES),
          state: "NSW",
          country: "Australia",
        },
        verification: {
          status: "approved",
          verifiedAt: new Date(),
        },
        isMandatoryComplete: true,
        isProfileComplete: true,
      });

      allUserIds.push(userId.toString());
    }

    // Insert batch
    try {
      await User.insertMany(users, { ordered: false });
      await Profile.insertMany(profiles, { ordered: false });
      totalCreated += batchCount;
      const progress = ((totalCreated / TOTAL_USERS) * 100).toFixed(1);
      console.log(`   ✅ Batch ${batch + 1}: Created ${batchCount} users (${progress}% done)`);
    } catch (err) {
      if (err.code === 11000) {
        console.log(`   ⚠️  Batch ${batch + 1}: Some duplicates skipped (${err.insertedDocs?.length || "?"} inserted)`);
        totalCreated += err.insertedDocs?.length || 0;
      } else {
        console.error(`   ❌ Batch ${batch + 1} error:`, err.message);
      }
    }

    // Small delay to not overwhelm free tier
    await new Promise(r => setTimeout(r, 200));
  }

  // Save all user IDs for token generation
  const fs = require("fs");
  const path = require("path");
  const outputDir = path.join(__dirname, "..", "k6", "data");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, "seeded_user_ids.json"),
    JSON.stringify(allUserIds, null, 2)
  );

  console.log(`\n✅ DONE! Created ${totalCreated} test users.`);
  console.log(`📁 User IDs saved to: k6/data/seeded_user_ids.json`);
  console.log(`\n📌 Next step: Run 'node scripts/generate-load-test-tokens.js' to create JWT tokens.\n`);

  await mongoose.disconnect();
}

seedUsers().catch(err => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
