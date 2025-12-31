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

 const normalizedContacts = contacts
    .map(c => {
      if (!c || typeof c.phone !== "string") return null;

      const phone = normalizePhone(c.phone);
      if (!phone) return null;

      return {
        name: c.name || null,
        phone,
        hash: hashPhone(phone)
      };
    })
    .filter(Boolean);

  if (!normalizedContacts.length) {
    return res.status(400).json({
      success: false,
      message: "No valid contacts found"
    });
  }

  const hashes = normalizedContacts.map(c => c.hash);

  // jo users already app pe hain
  // const usersOnApp = await User.find({
  //   phoneHash: { $in: hashes }
  // })
  //   .select("phoneHash")
  //   .lean();

  // hashes = contact phone hashes

const usersOnApp = await User.find({
  $or: [
    { phoneHash: { $in: hashes } }, // ✅ correct users
    { phone: { $in: hashes } }      // ⚠️ old users (hash stored in phone)
  ]
}).select("_id phone phoneHash");

  const onAppSet = new Set(usersOnApp.map(u => u.phoneHash || u.phone));

  // jo pehle se block hain
  const alreadyBlocked = await BlockedContact.find({
    userId,
    blockedPhoneHash: { $in: hashes }
  }).select("blockedPhoneHash");

  const blockedSet = new Set(
    alreadyBlocked.map(b => b.blockedPhoneHash)
  );
  const response = normalizedContacts.map(c => ({
    name: c.name,
    phone: c.phone,
    isOnApp: onAppSet.has(c.hash),
    alreadyBlocked: blockedSet.has(c.hash)
  }));

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