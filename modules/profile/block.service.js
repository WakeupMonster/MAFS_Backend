const Block = require("./user.block");

module.exports.isBlocked = async (userA, userB) => {
  return Block.exists({
    $or: [
      { blockerId: userA, blockedId: userB },
      { blockerId: userB, blockedId: userA }
    ]
  });
};
