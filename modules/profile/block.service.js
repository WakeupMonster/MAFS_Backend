const Block = require("./user.block");

// ✅ NEW: Ye function direction batata hai — kisne block kiya
exports.isBlocked = async (currentUserId, otherUserId) => {
  // Parallelize the block queries
  const [blockedByMe, blockedByThem] = await Promise.all([
    Block.exists({
      blockerId: currentUserId,
      blockedId: otherUserId,
    }),
    Block.exists({
      blockerId: otherUserId,
      blockedId: currentUserId,
    })
  ]);

  return {
    isBlocked: !!(blockedByMe || blockedByThem), // koi bhi block hai toh true
    blockedByMe: !!blockedByMe, // MAIN ne block kiya
    blockedByThem: !!blockedByThem, // USNE mujhe block kiya
    blockedBy: blockedByMe
      ? currentUserId // maine block kiya → meri ID
      : blockedByThem
      ? otherUserId // usne block kiya → uski ID
      : null,
  };
};
