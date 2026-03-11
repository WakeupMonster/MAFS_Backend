/* eslint-disable no-unused-vars */
const axios = require("axios");
const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const {
    AU_CITIES,
    INTERESTS_POOL,
    BIOS_POOL,
    RELATIONSHIP_GOALS,
    getRandom,
    getRandomItems,
    getRandomAttributes,
    generateRandomPhone,
    generateRandomEmail,
    getPortrait,
    getLifestyle,
    hashPhone
} = require("./fakeProfile.helpers");

const calculateAge = (dob) => {
    const diff = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const bulkCreateFakeProfiles = async ({ count, gender, ageRange, city, adminId }) => {
    const batchId = `batch_${Date.now()}`;

    // 1. Fetch names from randomuser.me (Fastest way to get realistic names/DOBs)
    // Map gender for randomuser API names
    const apiGender = (gender === "men" || gender === "trans-man") ? "men" :
        (gender === "women" || gender === "trans-women") ? "women" : "";

    const response = await axios.get(`https://randomuser.me/api/?results=${count}&gender=${apiGender}&nat=au`);
    const apiUsers = response.data.results;

    // 2. Prepare User Objects
    const userObjects = apiUsers.map(apiUser => {
        const phone = generateRandomPhone();
        return {
            phone,
            phoneHash: hashPhone(phone),
            email: generateRandomEmail(apiUser.name.first),
            isPhoneVerified: true,
            isEmailVerified: true,
            authMethod: "phone",
            role: "USER",
            accountStatus: "active",
            isNewUser: false,
            isProfileCompleted: true,
            isFake: true,
            fakeProfileMeta: {
                createdByAdmin: adminId,
                batchId: batchId
            },
            onboarding: { isComplete: true }
        };
    });

    // ⚡ Fast Bulk Insert Users
    const createdUsers = await User.insertMany(userObjects);

    // 3. Prepare Profile Objects
    const locationData = AU_CITIES[city];
    const profileObjects = createdUsers.map((user, index) => {
        const apiUser = apiUsers[index];
        const dob = new Date(apiUser.dob.date);

        // High Quality Photos
        const portraitUrl = getPortrait(gender);
        const profilePhotos = [{ url: portraitUrl, order: 0, uploadedAt: new Date() }];

        // Add lifestyle photos
        for (let i = 1; i <= 4; i++) {
            profilePhotos.push({ url: getLifestyle(), order: i, uploadedAt: new Date() });
        }

        return {
            userId: user._id,
            nickname: apiUser.name.first,
            dob: dob,
            age: calculateAge(dob),
            gender: gender,
            about: getRandom(BIOS_POOL),
            jobTitle: "Creative",
            photos: profilePhotos,
            location: {
                type: "Point",
                coordinates: [locationData.lng, locationData.lat],
                city: city,
                state: locationData.state,
                country: "Australia"
            },
            discovery: {
                globalVisibility: "everyone",
                relationshipGoal: getRandom(RELATIONSHIP_GOALS),
                showMeGender: [gender === "men" ? "women" : "everyone"],
            },
            attributes: {
                ...getRandomAttributes(),
                interests: getRandomItems(INTERESTS_POOL, 5)
            },
            verification: {
                status: "approved",
                verifiedAt: new Date(),
                verifiedBy: adminId,
                selfieUrl: portraitUrl
            },
            onboardingProgress: {
                phoneVerified: true,
                emailVerified: true,
                nicknameSet: true,
                dobSet: true,
                genderSet: true,
                photosUploaded: true,
                locationSet: true,
                relationshipGoalSet: true,
                interestsSet: true,
                totalCompletion: 100
            },
            isMandatoryComplete: true,
            isProfileComplete: true
        };
    });

    // ⚡ Fast Bulk Insert Profiles
    const createdProfiles = await Profile.insertMany(profileObjects);

    // 4. Wrap for Response
    const profiles = createdUsers.map((user, index) => ({
        user,
        profile: createdProfiles[index]
    }));

    return { batchId, count: profiles.length, profiles };
};

// List/Other functions stay same as they were already optimized but let's check batchId filter
const listFakeProfiles = async ({ page, limit, gender, batchId }) => {
    const query = { isFake: true };
    if (batchId) query["fakeProfileMeta.batchId"] = batchId;

    const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    const userIds = users.map(u => u._id);
    const profiles = await Profile.find({ userId: { $in: userIds } }).lean();

    return users.map(user => ({
        user,
        profile: profiles.find(p => p.userId.toString() === user._id.toString())
    }));
};

const toggleFakeProfile = async (userId) => {
    const user = await User.findById(userId);
    if (!user || !user.isFake) throw new Error("Fake profile not found");

    user.accountStatus = user.accountStatus === "active" ? "deactivated" : "active";
    await user.save();
    return user;
};

const deleteFakeProfile = async (userId) => {
    const user = await User.findById(userId);
    if (!user || !user.isFake) throw new Error("Fake profile not found");

    await Promise.all([
        User.deleteOne({ _id: userId }),
        Profile.deleteOne({ userId: userId })
    ]);
    return { success: true };
};

module.exports = {
    bulkCreateFakeProfiles,
    listFakeProfiles,
    toggleFakeProfile,
    deleteFakeProfile
};
