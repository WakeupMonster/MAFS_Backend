// cron/fwbCron.js
const cron = require("node-cron");
const FWB = require("../../modules/fwb/fwb.model");

cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

    const updated = await FWB.updateMany(
      { expire_time: { $lte: now }, is_active: true },
      { $set: { is_active: false } }
    );

    if (updated.modifiedCount > 0) {
      console.log(`FWB expired offers disabled: ${updated.modifiedCount}`);
    }
  } catch (err) {
    console.error("FWB Cron Error →", err);
  }
});
