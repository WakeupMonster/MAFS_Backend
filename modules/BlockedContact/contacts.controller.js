const User = require("../auth/auth.model");
const BlockedContact = require("./blockedContacts.model");
const { normalizePhone, hashPhone, generatePhoneHashes } = require("../../common/utils/phone.util");
const redis = require("../../config/cache");

exports.importContacts = async (req, res) => {
  const userId = req.user._id;
  const { contacts } = req.body;

  const normalizedContacts = contacts
    .map((c) => {
      if (!c || typeof c.phone !== "string") return null;
      const phone = normalizePhone(c.phone);
      if (!phone) return null;
      return { name: c.name || null, phone, hash: hashPhone(phone) };
    })
    .filter(Boolean);

  if (!normalizedContacts.length) {
    return res
      .status(400)
      .json({ success: false, message: "No valid contacts found" });
  }

  const hashes = normalizedContacts.map((c) => c.hash);

  const usersOnApp = await User.find({
    $or: [{ phoneHash: { $in: hashes } }, { phone: { $in: hashes } }],
  })
    .select("_id phone phoneHash")
    .lean();

  const onAppSet = new Set(usersOnApp.map((u) => u.phoneHash || u.phone));

  const alreadyBlocked = await BlockedContact.find({
    userId,
    blockedPhoneHash: { $in: hashes },
  })
    .select("blockedPhoneHash")
    .lean();

  const blockedSet = new Set(alreadyBlocked.map((b) => b.blockedPhoneHash));

  const response = normalizedContacts.map((c) => ({
    name: c.name,
    phone: c.phone,
    isOnApp: onAppSet.has(c.hash),
    alreadyBlocked: blockedSet.has(c.hash),
  }));

  res.json({ success: true, contacts: response });
};

exports.blockContacts = async (req, res) => {
  const userId = req.user._id;
  const items = req.body.contacts || req.body.phones || [];

  const parsed = [];
  for (const item of items) {
    const rawPhone = typeof item === "string" ? item : item.phone;
    const rawName = typeof item === "string" ? null : item.name || null;
    const normalized = normalizePhone(rawPhone);
    if (!normalized) continue;
    parsed.push({
      phone: normalized,
      name: rawName,
      hash: hashPhone(normalized),
    });
  }

  // Prevent self-blocking: filter out user's own phone number
  const currentUser = await User.findById(userId).select("phone phoneHash").lean();
  if (currentUser) {
    const myPhoneHashes = new Set(
      currentUser.phone ? generatePhoneHashes(currentUser.phone) : (currentUser.phoneHash ? [currentUser.phoneHash] : [])
    );
    for (let i = parsed.length - 1; i >= 0; i--) {
      if (myPhoneHashes.has(parsed[i].hash)) {
        parsed.splice(i, 1);
      }
    }
  }

  if (!parsed.length) {
    return res
      .status(400)
      .json({ success: false, message: "Cannot block your own number or no valid contacts provided" });
  }

  const hashes = parsed.map((p) => p.hash);

  const alreadyBlocked = await BlockedContact.find({
    userId,
    blockedPhoneHash: { $in: hashes },
  })
    .select("blockedPhoneHash")
    .lean();

  const blockedSet = new Set(alreadyBlocked.map((b) => b.blockedPhoneHash));

  const newDocs = parsed
    .filter((p) => !blockedSet.has(p.hash))
    .map((p) => ({
      userId,
      blockedPhone: p.phone,
      blockedName: p.name,
      blockedPhoneHash: p.hash,
    }));

  if (!newDocs.length) {
    return res.json({ success: true, message: "All contacts already blocked" });
  }

  await BlockedContact.insertMany(newDocs, { ordered: false }).catch(() => { });

  if (redis) {
    const ops = [
      redis.del(`feed:${userId.toString()}`),
      redis.del(`feed:exclude:${userId.toString()}`)
    ];
    
    // Mutual exclusion: Clear cache for the users who were just blocked
    let allPossibleHashes = [];
    for (const p of parsed) {
      allPossibleHashes.push(...generatePhoneHashes(p.phone));
    }
    const usersToClear = await User.find({ phoneHash: { $in: allPossibleHashes } }).select('_id').lean();
    for (const u of usersToClear) {
      ops.push(redis.del(`feed:${u._id.toString()}`));
      ops.push(redis.del(`feed:exclude:${u._id.toString()}`));
    }
    
    await Promise.all(ops);
  }

  res.json({
    success: true,
    message: `${newDocs.length} contact(s) blocked successfully`,
    alreadyBlocked: blockedSet.size,
  });
};

exports.getBlockedContacts = async (req, res) => {
  const list = await BlockedContact.find({ userId: req.user._id })
    .select("blockedPhone blockedName source createdAt")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: list });
};

module.exports.unblockByPhone = async (req, res) => {
  const userId = req.user._id;
  const { phone } = req.body;

  const normalized = normalizePhone(phone);
  if (!normalized) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid phone number" });
  }

  const hash = hashPhone(normalized);

  const result = await BlockedContact.deleteOne({
    userId,
    blockedPhoneHash: hash,
  });

  if (result.deletedCount === 0) {
    return res.json({ success: true, message: "Contact is not blocked" });
  }

  if (redis) {
    const ops = [
      redis.del(`feed:${userId.toString()}`),
      redis.del(`feed:exclude:${userId.toString()}`)
    ];
    
    // Mutual exclusion: Clear cache for the user who was just unblocked
    const possibleHashes = generatePhoneHashes(normalized);
    const usersToClear = await User.find({ phoneHash: { $in: possibleHashes } }).select('_id').lean();
    for (const u of usersToClear) {
      ops.push(redis.del(`feed:${u._id.toString()}`));
      ops.push(redis.del(`feed:exclude:${u._id.toString()}`));
      // Also remove them from feed:seen so they reappear immediately
      ops.push(redis.sRem(`feed:seen:${userId.toString()}`, u._id.toString()));
      ops.push(redis.sRem(`feed:seen:${u._id.toString()}`, userId.toString()));
    }
    
    await Promise.all(ops);
  }

  res.json({ success: true, message: "Contact unblocked successfully" });
};

const mongoose = require("mongoose");

exports.unblockUser = async (req, res) => {
  try {
    // 2️⃣ Expect the ID of the user to unblock in the request body
    const { blockedId } = req.body;

    // ---------------------------------------------------------
    // 3️⃣ Validate the incoming blockedId
    // ---------------------------------------------------------
    if (!blockedId || !mongoose.Types.ObjectId.isValid(blockedId)) {
      return res.status(400).json({
        success: false,
        message: "Valid blockedId is required",
      });
    }

    const blockedDoc = await BlockedContact.findById(blockedId).lean();
    if (!blockedDoc) {
      return res.json({
        success: true,
        message: "Contact is not blocked",
      });
    }

    await BlockedContact.deleteOne({
      _id: blockedId, // who should be unblocked
    });

    if (redis) {
      const ops = [
        redis.del(`feed:${req.user._id.toString()}`),
        redis.del(`feed:exclude:${req.user._id.toString()}`)
      ];
      
      const possibleHashes = blockedDoc.blockedPhone ? generatePhoneHashes(blockedDoc.blockedPhone) : [blockedDoc.blockedPhoneHash];
      const usersToClear = await User.find({ phoneHash: { $in: possibleHashes } }).select('_id').lean();
      for (const u of usersToClear) {
        ops.push(redis.del(`feed:${u._id.toString()}`));
        ops.push(redis.del(`feed:exclude:${u._id.toString()}`));
        // Reappear in feed
        ops.push(redis.sRem(`feed:seen:${req.user._id.toString()}`, u._id.toString()));
        ops.push(redis.sRem(`feed:seen:${u._id.toString()}`, req.user._id.toString()));
      }
      
      await Promise.all(ops);
    }

    res.json({
      success: true,
      message: "User unblocked successfully",
    });
  } catch (err) {
    console.error("[UNBLOCK BY PHONE] Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while unblocking user",
    });
  }
};
