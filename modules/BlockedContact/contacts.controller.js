// const User = require("../auth/auth.model");
// const BlockedContact = require("./blockedContacts.model");
// const { normalizePhone, hashPhone } = require("../../common/utils/phone.util");
// const redis = require("../../config/cache");


// exports.importContacts = async (req, res) => {
//   const userId = req.user._id;
//   const { contacts } = req.body;

//  const normalizedContacts = contacts
//     .map(c => {
//       if (!c || typeof c.phone !== "string") return null;

//       const phone = normalizePhone(c.phone);
//       if (!phone) return null;

//       return {
//         name: c.name || null,
//         phone,
//         hash: hashPhone(phone)
//       };
//     })
//     .filter(Boolean);

//   if (!normalizedContacts.length) {
//     return res.status(400).json({
//       success: false,
//       message: "No valid contacts found"
//     });
//   }

//   const hashes = normalizedContacts.map(c => c.hash);

//   // jo users already app pe hain
//   // const usersOnApp = await User.find({
//   //   phoneHash: { $in: hashes }
//   // })
//   //   .select("phoneHash")
//   //   .lean();

//   // hashes = contact phone hashes

// const usersOnApp = await User.find({
//   $or: [
//     { phoneHash: { $in: hashes } }, // ✅ correct users
//     { phone: { $in: hashes } }      // ⚠️ old users (hash stored in phone)
//   ]
// }).select("_id phone phoneHash");

//   const onAppSet = new Set(usersOnApp.map(u => u.phoneHash || u.phone));

//   // jo pehle se block hain
//   const alreadyBlocked = await BlockedContact.find({
//     userId,
//     blockedPhoneHash: { $in: hashes }
//   }).select("blockedPhoneHash");

//   const blockedSet = new Set(
//     alreadyBlocked.map(b => b.blockedPhoneHash)
//   );
//   const response = normalizedContacts.map(c => ({
//     name: c.name,
//     phone: c.phone,
//     isOnApp: onAppSet.has(c.hash),
//     alreadyBlocked: blockedSet.has(c.hash)
//   }));

//   res.json({
//     success: true,
//     contacts: response
//   });
// };


// exports.blockContacts = async (req, res) => {
//   const userId = req.user._id;
//   const { phones } = req.body; 
//   // ✅ Now accept: [{ phone: "+91...", name: "Ali" }] OR ["phone1","phone2"]

//   const docs = [];

//   for (const item of phones) {
//     // Support both formats: string or object
//     const rawPhone = typeof item === "string" ? item : item.phone;
//     const rawName  = typeof item === "string" ? null  : item.name || null;

//     const normalized = normalizePhone(rawPhone);
//     if (!normalized) continue;

//     docs.push({
//       userId,
//       blockedPhone: normalized,        // ✅ readable phone saved
//       blockedName: rawName,             // ✅ contact name saved
//       blockedPhoneHash: hashPhone(normalized)
//     });
//   }

//   if (!docs.length) {
//     return res.status(400).json({
//       success: false,
//       message: "No valid phones provided"
//     });
//   }

//   await BlockedContact.insertMany(docs, { ordered: false }).catch(() => {});

//   if (redis) {
//     await redis.del(`feed:${userId.toString()}`);
//   }

//   res.json({
//     success: true,
//     message: "Contacts blocked successfully"
//   });
// };

// exports.getBlockedContacts = async (req, res) => {
//   const list = await BlockedContact.find({
//     userId: req.user._id
//   })
//     .select("blockedPhone blockedName createdAt") 
//     .sort({ createdAt: -1 })
//     .lean();

//   res.json({
//     success: true,
//     data: list
//   });
// };


// // exports.blockContacts = async (req, res) => {
// //   const userId = req.user._id;
// //   const { phones } = req.body;

// //   const docs = phones
// //     .map(normalizePhone)
// //     .filter(Boolean)
// //     .map(phone => ({
// //       userId,
// //       blockedPhoneHash: hashPhone(phone)
// //     }));

// //   await BlockedContact.insertMany(docs, { ordered: false })
// //     .catch(() => {});

// //     if (redis) {
// //     await redis.del(`feed:${userId.toString()}`);
// //   }

// //   res.json({
// //     success: true,
// //     message: "Contacts blocked successfully"
// //   });
// // };


// // exports.getBlockedContacts = async (req, res) => {
// //   const list = await BlockedContact.find({
// //     userId: req.user._id
// //   }).sort({ createdAt: -1 });

// //   res.json({ success: true, data: list });
// // };
// exports.unblockByPhone = async (req, res) => {
//   const userId = req.user._id;
//   const { phone } = req.body;

//   const normalized = normalizePhone(phone);
//   const hash = hashPhone(normalized);

//   await BlockedContact.deleteOne({
//     userId,
//     blockedPhoneHash: hash
//   });
  
//     if (redis) {
//     await redis.del(`feed:${userId.toString()}`);
//   }

//   res.json({ success: true , message: "Contacts unblocked successfully" });
// };










const User = require("../auth/auth.model");
const BlockedContact = require("./blockedContacts.model");
const { normalizePhone, hashPhone } = require("../../common/utils/phone.util");
const redis = require("../../config/cache");

exports.importContacts = async (req, res) => {
  const userId = req.user._id;
  const { contacts } = req.body;

  const normalizedContacts = contacts
    .map(c => {
      if (!c || typeof c.phone !== "string") return null;
      const phone = normalizePhone(c.phone);
      if (!phone) return null;
      return { name: c.name || null, phone, hash: hashPhone(phone) };
    })
    .filter(Boolean);

  if (!normalizedContacts.length) {
    return res.status(400).json({ success: false, message: "No valid contacts found" });
  }

  const hashes = normalizedContacts.map(c => c.hash);

  const usersOnApp = await User.find({
    $or: [
      { phoneHash: { $in: hashes } },
      { phone: { $in: hashes } }
    ]
  }).select("_id phone phoneHash").lean();

  const onAppSet = new Set(usersOnApp.map(u => u.phoneHash || u.phone));

  const alreadyBlocked = await BlockedContact.find({
    userId,
    blockedPhoneHash: { $in: hashes }
  }).select("blockedPhoneHash").lean();

  const blockedSet = new Set(alreadyBlocked.map(b => b.blockedPhoneHash));

  const response = normalizedContacts.map(c => ({
    name: c.name,
    phone: c.phone,
    isOnApp: onAppSet.has(c.hash),
    alreadyBlocked: blockedSet.has(c.hash)
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
      hash: hashPhone(normalized)
    });
  }

  if (!parsed.length) {
    return res.status(400).json({ success: false, message: "No valid contacts provided" });
  }

  const hashes = parsed.map(p => p.hash);

  const alreadyBlocked = await BlockedContact.find({
    userId,
    blockedPhoneHash: { $in: hashes }
  }).select("blockedPhoneHash").lean();

  const blockedSet = new Set(alreadyBlocked.map(b => b.blockedPhoneHash));

  const newDocs = parsed
    .filter(p => !blockedSet.has(p.hash))
    .map(p => ({
      userId,
      blockedPhone: p.phone,
      blockedName: p.name,
      blockedPhoneHash: p.hash
    }));

  if (!newDocs.length) {
    return res.json({ success: true, message: "All contacts already blocked" });
  }

  await BlockedContact.insertMany(newDocs, { ordered: false }).catch(() => {});

  if (redis) await redis.del(`feed:${userId.toString()}`);

  res.json({
    success: true,
    message: `${newDocs.length} contact(s) blocked successfully`,
    alreadyBlocked: blockedSet.size
  });
};

exports.getBlockedContacts = async (req, res) => {
  const list = await BlockedContact.find({ userId: req.user._id })
    .select("blockedPhone blockedName source createdAt")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: list });
};

exports.unblockByPhone = async (req, res) => {
  const userId = req.user._id;
  const { phone } = req.body;

  const normalized = normalizePhone(phone);
  if (!normalized) {
    return res.status(400).json({ success: false, message: "Invalid phone number" });
  }

  const hash = hashPhone(normalized);

  const result = await BlockedContact.deleteOne({ userId, blockedPhoneHash: hash });

  if (result.deletedCount === 0) {
    return res.json({ success: true, message: "Contact is not blocked" });
  }

  if (redis) await redis.del(`feed:${userId.toString()}`);

  res.json({ success: true, message: "Contact unblocked successfully" });
};