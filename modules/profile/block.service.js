// const Block = require("./user.block");

// exports.isBlocked = async (userA, userB) => {
//   return Block.exists({
//     $or: [
//       { blockerId: userA, blockedId: userB },
//       { blockerId: userB, blockedId: userA }
//     ]
//   });
// };


const Block = require("./user.block");

// ✅ NEW: Ye function direction batata hai — kisne block kiya
exports.isBlocked = async (currentUserId, otherUserId) => {
  // Current user ne block kiya hai?
  const blockedByMe = await Block.exists({
    blockerId: currentUserId,
    blockedId: otherUserId
  });

  // Other user ne block kiya hai?
  const blockedByThem = await Block.exists({
    blockerId: otherUserId,
    blockedId: currentUserId
  });

  return {
    isBlocked: !!(blockedByMe || blockedByThem),  // koi bhi block hai toh true
    blockedByMe: !!blockedByMe,                    // MAIN ne block kiya
    blockedByThem: !!blockedByThem,                 // USNE mujhe block kiya
     blockedBy: blockedByMe 
    ? currentUserId      // maine block kiya → meri ID
    : blockedByThem 
      ? otherUserId      // usne block kiya → uski ID  
      : null  
  };
};