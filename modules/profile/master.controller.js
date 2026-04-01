/* eslint-disable no-unused-vars */
// /* eslint-disable no-unused-vars */
// const MasterData = require("./master.model");

// // 1. Get All Enums for Frontend (The Master API)
// module.exports.getAppMetadata = async (req, res) => {
//   try {
//     // Lean use karne se query 5x fast ho jati hai
//     const allData = await MasterData.find().select("category label value").lean();

//     // Data ko group karna category wise
//     const grouped = allData.reduce((acc, item) => {
//       if (!acc[item.category]) acc[item.category] = [];
//       acc[item.category].push({ label: item.label, value: item.value });
//       return acc;
//     }, {});

//     res.status(200).json({
//       success: true,
//       data: grouped
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Metadata fetch failed" });
//   }
// };

// // 2. Admin: Bulk Add (Figma ki saari list ek sath daalne ke liye)
// module.exports.adminBulkAdd = async (req, res) => {
//   try {
//     const { items } = req.body; 
//     // items example: [{category: 'music', label: 'Pop 🎵', value: 'pop'}, ...]
//     await MasterData.insertMany(items, { ordered: false });
//     res.status(201).json({ success: true, message: "Items added" });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };


const MasterData = require("./master.model");

module.exports.getAppConfig = async (req, res) => {
  try {
    const allItems = await MasterData.find().lean();

    // 1. Grouping Logic
    const groupedData = allItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];

      const itemObj = {
        id: item.value, // Manager wants "id"
        label: item.label
      };

      // Agar subtitle hai toh hi add karo
      if (item.subtitle) itemObj.subtitle = item.subtitle;
      if (item.link) itemObj.link = item.link

      acc[item.category].push(itemObj);
      return acc;
    }, {});

    const config = {
      distance: { min: 1, max: 500, unit: "km" },
      age: { min: 18, max: 60 }
    };

    return res.status(200).json({
      success: true,
      message: "App configuration fetched successfully",
      data: {
        ...groupedData,
        config: config
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};



module.exports.bulkAddMasterData = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: "Invalid data format" });
    }

    // "bulkWrite" use karna best hai production mein speed ke liye
    const operations = items.map((item) => ({
      updateOne: {
        filter: { category: item.category, value: item.value, link: item.link },
        update: { $set: item },
        upsert: true, // Agar nahi mila toh create kar dega
      },
    }));

    await MasterData.bulkWrite(operations);

    res.status(201).json({
      success: true,
      message: `${items.length} items processed and updated in database!`,
    });
  } catch (err) {
    console.error("Bulk Add Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};