const User = require("../auth/auth.model");
const BlockedContact = require("./blockedContacts.model");
const { normalizePhone, hashPhone } = require("../../common/utils/phone.util");
const redis = require("../../config/cache");



// exports.importContacts = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { contacts } = req.body;

//     if (!Array.isArray(contacts) || !contacts.length) {
//       return res.status(400).json({
//         success: false,
//         message: "Contacts array is required"
//       });
//     }

//     // ================================
//     // STEP 1️⃣ : Normalize phone numbers
//     // ================================
//     const normalizedPhones = contacts
//       .map(normalizePhone)
//       .filter(Boolean);

//     // ================================
//     // STEP 2️⃣ : Find users on app (NO HASH – TESTING)
//     // ================================
//     const usersOnApp = await User.find({
//       phone: { $in: normalizedPhones }
//     })
//       .select("phone")
//       .lean();

//     const onAppSet = new Set(usersOnApp.map(u => u.phone));

//     // ================================
//     // STEP 3️⃣ : Find already blocked contacts (NO HASH)
//     // ================================
//     const alreadyBlocked = await BlockedContact.find({
//       userId,
//       blockedPhone: { $in: normalizedPhones }
//     }).select("blockedPhone");

//     const blockedSet = new Set(
//       alreadyBlocked.map(b => b.blockedPhone)
//     );

//     // ================================
//     // STEP 4️⃣ : Build response for frontend
//     // ================================
//     const response = normalizedPhones.map(phone => ({
//       phone,
//       isOnApp: onAppSet.has(phone),
//       alreadyBlocked: blockedSet.has(phone)
//     }));

//     return res.json({
//       success: true,
//       contacts: response
//     });
//   } catch (err) {
//     console.error("IMPORT CONTACTS ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to import contacts"
//     });
//   }
// };





exports.importContacts = async (req, res) => {
  const userId = req.user._id;
  const { contacts } = req.body;

  const normalized = contacts
    .map(normalizePhone)
    .filter(Boolean);

  const hashes = normalized.map(hashPhone);

  // jo users already app pe hain
  const usersOnApp = await User.find({
    phoneHash: { $in: hashes }
  })
    .select("phoneHash")
    .lean();

  const onAppSet = new Set(usersOnApp.map(u => u.phoneHash));

  // jo pehle se block hain
  const alreadyBlocked = await BlockedContact.find({
    userId,
    blockedPhoneHash: { $in: hashes }
  }).select("blockedPhoneHash");

  const blockedSet = new Set(
    alreadyBlocked.map(b => b.blockedPhoneHash)
  );

  const response = normalized.map(phone => {
    const h = hashPhone(phone);
    return {
      phone,
      isOnApp: onAppSet.has(h),
      alreadyBlocked: blockedSet.has(h)
    };
  });

  res.json({
    success: true,
    contacts: response
  });
};


exports.blockContacts = async (req, res) => {
  const userId = req.user._id;
  const { phones } = req.body;

  const docs = phones
    .map(normalizePhone)
    .filter(Boolean)
    .map(phone => ({
      userId,
      blockedPhoneHash: hashPhone(phone)
    }));

  await BlockedContact.insertMany(docs, { ordered: false })
    .catch(() => {});

    if (redis) {
    await redis.del(`feed:${userId.toString()}`);
  }

  res.json({
    success: true,
    message: "Contacts blocked successfully"
  });
};


exports.getBlockedContacts = async (req, res) => {
  const list = await BlockedContact.find({
    userId: req.user._id
  }).sort({ createdAt: -1 });

  res.json({ success: true, data: list });
};


// exports.unblockContact = async (req, res) => {
//   const userId = req.user._id;
//   const blockId = req.params.id;

//   // safety: sirf apna hi unblock kar sake
//   const deleted = await BlockedContact.findOneAndDelete({
//     _id: blockId,
//     userId
//   });

//   if (!deleted) {
//     return res.status(404).json({
//       success: false,
//       message: "Blocked contact not found"
//     });
//   }
//     if (redis) {
//     await redis.del(`feed:${userId.toString()}`);
//   }

//   res.json({
//     success: true,
//     message: "Contact unblocked successfully"
//   });
// };


exports.unblockByPhone = async (req, res) => {
  const userId = req.user._id;
  const { phone } = req.body;

  const normalized = normalizePhone(phone);
  const hash = hashPhone(normalized);

  await BlockedContact.deleteOne({
    userId,
    blockedPhoneHash: hash
  });
  
    if (redis) {
    await redis.del(`feed:${userId.toString()}`);
  }

  res.json({ success: true });
};