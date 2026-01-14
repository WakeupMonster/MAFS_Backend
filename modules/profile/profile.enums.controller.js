const ENUMS = require("../../config/enums");
const redis = require("redis");
const { Interest, Language, Religion } = require("./enums.model");

const client = redis.createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});
client.connect().catch(console.error);

// Generic standardized response handlers
const sendSuccess = (res, data, source = "api") =>
  res.json({ success: true, source, data });

const sendError = (res, status, code, message, errors = null) =>
  res.status(status).json({ success: false, code, message, errors });

/*==================================================
1. GET All Enums data from /config/enums.js file
===================================================*/
module.exports.getAllEnums = async (req, res) => {
  try {
    const version = req.query.v || "1";
    const cacheKey = `profile_enums_v_${version}`;

    // 1. Redis se try fetch
    const cached = await client.get(cacheKey);
    if (cached) {
      return sendSuccess(res, JSON.parse(cached), "cache");
    }

    // 2. Enums ko optimized + duplicate free format me map karo
    const format = (list = []) => [
      ...new Set(list.map((e) => `${e.label} ${e.emoji}`)),
    ];

    const data = {
      gender: format(ENUMS.gender),
      genderPreference: format(ENUMS.genderPreference),
      religion: format(ENUMS.religion),
      relationshipGoals: format(ENUMS.relationshipGoals),
      interests: format(ENUMS.interests),
    };

    // 3. Redis me cache (24h)
    await client
      .set(cacheKey, JSON.stringify(data), { EX: 86400 })
      .catch(console.error);

    return sendSuccess(res, data, "api");
  } catch (err) {
    console.error("enum load crash →", err);
    return sendError(res, 500, "ENUM_SERVER_ERROR", "failed loading enums");
  }
};

// module.exports.getAllEnums = async (req, res) => {
//   try {
//     const version = req.query.v || "1";
//     const search = (req.query.search || "").toLowerCase();
//     const cacheKey = `profile_enums_v_${version}_search_${search}`;

//     // 1. Try Redis cache
//     const cached = await client.get(cacheKey);
//     if (cached) {
//       return sendSuccess(res, JSON.parse(cached), "cache");
//     }

//     // --- SEARCH FUNCTION ---
//     const filterList = (list = []) => {
//       if (!search) return list; // no search → return full list
//       return list.filter((item) => item.value.toLowerCase().includes(search));
//     };

//     // Final structured response
//     const data = {
//       gender: filterList(ENUMS.gender),
//       genderPreference: filterList(ENUMS.genderPreference),
//       religion: filterList(ENUMS.religion),
//       relationshipGoals: filterList(ENUMS.relationshipGoals),
//       interests: filterList(ENUMS.interests),
//     };

//     // Save to Redis cache for 24 hours
//     await client.set(cacheKey, JSON.stringify(data), { EX: 86400 });

//     return sendSuccess(res, data, "api");
//   } catch (err) {
//     console.error("enum load crash →", err);
//     return sendError(res, 500, "ENUM_SERVER_ERROR", "failed loading enums");
//   }
// };

// module.exports.getAllEnums = async (req, res) => {
//   try {
//     const version = req.query.v || "1";

//     // Extract category-wise search filters
//     const q = {
//       gender: (req.query.gen || "").toLowerCase(),
//       genderPreference: (req.query.genPref || "").toLowerCase(),
//       religion: (req.query.rel || "").toLowerCase(),
//       relationshipGoals: (req.query.goal || "").toLowerCase(),
//       interests: (req.query.int || "").toLowerCase(),
//     };

//     const cacheKey = `profile_enums_v_${version}_${JSON.stringify(q)}`;

//     console.log("cacheKey: ", cacheKey);

//     if (cached.genderPreference)
//       cached.genderPreference = filterList(
//         ENUMS.genderPreference,
//         q.genderPreference
//       );

//     // Try Redis
//     const cached = await client.get(cacheKey);
//     if (cached) {
//       return sendSuccess(res, JSON.parse(cached), "cache");
//     }

//     // Filter function
//     const filterList = (list = [], search = "") => {
//       if (!search) return list;
//       return list.filter((item) => item.value.toLowerCase().includes(search));
//     };

//     const data = {
//       gender: filterList(ENUMS.gender, q.gender),
//       genderPreference: filterList(ENUMS.genderPreference, q.genderPreference),
//       religion: filterList(ENUMS.religion, q.religion),
//       relationshipGoals: filterList(
//         ENUMS.relationshipGoals,
//         q.relationshipGoals
//       ),
//       interests: filterList(ENUMS.interests, q.interests),
//     };

//     // Cache for 24 hours
//     await client.set(cacheKey, JSON.stringify(data), { EX: 86400 });

//     return sendSuccess(res, data, "api");
//   } catch (err) {
//     console.error("enum load crash →", err);
//     return sendError(res, 500, "ENUM_SERVER_ERROR", "failed loading enums");
//   }
// };

/*==================================================
2. GET Details for Enums data and GET details based search query intQry , lanQry
===================================================*/


exports.getDetails = async (req, res) => {
  try {
    const { intQry, lanQry } = req.query;

    // Case 1️⃣ Searching interests only
    if (intQry && intQry.trim() !== "") {
      const interest = await Interest.find({
        value: { $regex: intQry, $options: "i" },
      });

      return res.json({
        success: true,
        message: "Interest search results",
        data: { interest },
      });
    }

    // Case 2️⃣ Searching languages only
    if (lanQry && lanQry.trim() !== "") {
      const language = await Language.find({
        value: { $regex: lanQry, $options: "i" },
      });

      return res.json({
        success: true,
        message: "Language search results",
        data: { language },
      });
    }

    // Case 3️⃣ No search → return all three
    // const interest = (await Interest.find({})) || [];
    // const language = (await Language.find({})) || [];
    // let religion = (await Religion.find({})) || [];

    // Case 3️⃣ No search → Fetch all (parallel)
    let [interest = [], language = [], religion = []] = await Promise.all([
      Interest.find({}).lean(),
      Language.find({}).lean(),
      Religion.find({}).lean(),
    ]);

    // Auto insert "Other" if religion empty
    if (!religion.length) {
      await Religion.create({ label: "Other", value: "other" });
      religion = await Religion.find({}).sort(-1);
    }

    return res.json({
      success: true,
      message: "GET All details data",
      data: { interest, language, religion },
    });
  } catch (err) {
    console.error("GET Detail API Error → :", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/*==================================================
3. ADD or UPDATE Details for Interests Enums data 
===================================================*/
exports.addOrUpdateInterest = async (req, res) => {
  try {
    const { id, label, value } = req.body;

    // If id exists → update interest
    if (id) {
      const updatedInterest = await Interest.findByIdAndUpdate(
        id,
        { label, value },
        { new: true, runValidators: true }
      );

      if (!updatedInterest) {
        return res
          .status(404)
          .json({ success: false, message: "Interest not found with this ID" });
      }

      return res.status(200).json({
        success: true,
        message: "Interest updated successfully",
        data: updatedInterest,
      });
    }

    // If id not exists → create new
    if (!label || !value) {
      return res
        .status(400)
        .json({ success: false, message: "Label and value field is required" });
    }

    // Check duplicate label
    const exists = await Interest.findOne({
      $or: [{ label }, { value }],
    });

    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: "Label or value already exists" });
    }

    const newInterest = await Interest.create({ label, value });

    // message: `${label} interest added successfully`
    return res.status(201).json({
      success: true,
      message: "Interest added successfully",
      data: newInterest,
    });
  } catch (err) {
    console.error(err);

    // Handle MongoDB unique constraint error
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Duplicate label not allowed" });
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
};

/*==================================================
4. ADD or UPDATE Details for Language Enums data 
===================================================*/
exports.addOrUpdateLanguage = async (req, res) => {
  try {
    const { id, label, value } = req.body;

    // If id exists → update language
    if (id) {
      const updatedLanguage = await Language.findByIdAndUpdate(
        id,
        { label, value },
        { new: true, runValidators: true }
      );

      if (!updatedLanguage) {
        return res
          .status(404)
          .json({ success: false, message: "Language not found with this ID" });
      }

      return res.status(200).json({
        success: true,
        message: "Language updated successfully",
        data: updatedLanguage,
      });
    }

    // If id not exists → create new
    if (!label || !value) {
      return res
        .status(400)
        .json({ success: false, message: "Label and value field is required" });
    }

    // Check duplicate label
    const exists = await Language.findOne({ $or: [{ label }, { value }] });
    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: "Label or value already exists" });
    }

    const newLanguage = await Language.create({ label, value });

    // message: `${label} language added successfully`
    return res.status(201).json({
      success: true,
      message: "Language added successfully",
      data: newLanguage,
    });
  } catch (err) {
    console.error(err);

    // Handle MongoDB unique constraint error
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Duplicate label not allowed" });
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
};

/*==================================================
5. ADD or UPDATE Details for Religion Enums data 
===================================================*/
exports.addOrUpdateReligion = async (req, res) => {
  try {
    const { id, label, value } = req.body;

    // If id exists → update religion
    if (id) {
      const updatedReligion = await Religion.findByIdAndUpdate(
        id,
        { label, value },
        { new: true, runValidators: true }
      );

      if (!updatedReligion) {
        return res
          .status(404)
          .json({ success: false, message: "Religion not found with this ID" });
      }

      return res.status(200).json({
        success: true,
        message: "Religion updated successfully",
        data: updatedReligion,
      });
    }

    // If id not exists → create new
    if (!label || !value) {
      return res
        .status(400)
        .json({ success: false, message: "Label and value field is required" });
    }

    // Check duplicate label
    const exists = await Religion.findOne({
      $or: [{ label }, { value }],
    });

    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: "Label or value already exists" });
    }

    const newReligion = await Religion.create({ label, value });

    // message: `${label} religion added successfully`
    return res.status(201).json({
      success: true,
      message: "Religion added successfully",
      data: newReligion,
    });
  } catch (err) {
    console.error(err);

    // Handle MongoDB unique constraint error
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Duplicate label not allowed" });
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
};
