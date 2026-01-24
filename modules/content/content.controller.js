const redis = require("../../config/cache");
const {
  Faq,
  PrivacyPolicy,
  TermsConditions,
} = require("../Admin/cms/content.model");
const { getFaqSchema } = require("../Admin/cms/content.validation");

/* ================================
 * GET ALL FAQ
 * ================================
 */
// exports.getFAQ = async (req, res) => {
//   try {
//     const cacheKey = "faq:list";

//     // 1️⃣ Try cache first
//     const cached = await redis.get(cacheKey);
//     if (cached) {
//       return res.status(200).json({
//         success: true,
//         cached: true,
//         title: "Frequently Asked Questions",
//         data: JSON.parse(cached),
//       });
//     }

//     // 2️⃣ DB query
//     const faqs = await Faq.find({}).select("-__v").sort({ order: 1 }).lean();

//     if (!faqs) {
//       return res.status(404).json({
//         success: false,
//         message: "Frequently Asked Question not found",
//       });
//     }

//     // 3️⃣ Project response shape
//     const response = faqs.map((faq) => ({
//       id: faq._id,
//       order: faq.order,
//       question: faq.question,
//       answer: faq.answer,
//       createdAt: faq.createdAt,
//       updatedAt: faq.updatedAt,
//     }));

//     // 3️⃣ Save to cache (24 hours)
//     await redis.set(cacheKey, JSON.stringify(response), "EX", 60 * 60 * 24);

//     return res.status(200).json({
//       success: true,
//       title: "Frequently Asked Questions",
//       data: response,
//     });
//   } catch (err) {
//     console.error("Get FAQ error", err);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to load FAQ",
//     });
//   }
// };

exports.getFAQ = async (req, res) => {
  try {
    // ✅ Validate query
    const { error, value } = getFaqSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message.replace(/"/g, ""),
      });
    }

    const { category } = value;

    const cacheKey = category ? `faq:list:${category}` : "faq:list:general";

    // 1️⃣ Cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        title: "Frequently Asked Questions",
        category: category ? category : "general",
        data: JSON.parse(cached),
      });
    }

    // 2️⃣ Build filter
    const filter = category ? { category } : {};

    // 3️⃣ Query DB
    const faqs = await Faq.find(filter)
      .select("_id question answer order category createdAt updatedAt")
      .sort({ order: 1 })
      .lean();

    if (!faqs) {
      return res.status(404).json({
        success: false,
        message: "Frequently Asked Question not found",
      });
    }

    // 3️⃣ Project response shape
    const response = faqs.map((faq) => ({
      id: faq._id,
      order: faq.order,
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      createdAt: faq.createdAt,
      updatedAt: faq.updatedAt,
    }));

    // 4️⃣ Cache result
    await redis.set(cacheKey, JSON.stringify(response), "EX", 60 * 60 * 24);

    return res.json({
      success: true,
      title: "Frequently Asked Questions",
      category: category ? category : "general",
      data: response,
    });
  } catch (err) {
    console.error("Get FAQ error", err);
    res.status(500).json({
      success: false,
      message: "Failed to load FAQ",
    });
  }
};

/**
 * =========================================
 * PRIVACY POLICY
 * =========================================
 */
// exports.getPrivacyPolicy = async (req, res) => {
//   try {
//     const cacheKey = "privacy_policy:list";

//     // 1️⃣ Try cache first
//     const cached = await redis.get(cacheKey);
//     if (cached) {
//       return res.status(200).json({
//         success: true,
//         cached: true,
//         title: "Privacy And Policy",
//         data: JSON.parse(cached),
//       });
//     }

//     // 2️⃣ Fetch SINGLE document
//     const privacy = await PrivacyPolicy.findOne({}).select("-__v").lean();

//     if (!privacy) {
//       return res.status(404).json({
//         success: false,
//         message: "Privacy Policy not found",
//       });
//     }

//     // 3️⃣ PROJECT SECTIONS & Sort
//     const projectedSections = privacy.sections
//       .sort((a, b) => a.order - b.order)
//       .map((section) => ({
//         _id: section._id,
//         order: section.order,
//         heading: section.heading,
//         paragraph: section.paragraph,
//         list: section.list || [],
//       }));

//     const response = {
//       id: privacy._id,
//       title: privacy.title,
//       sections: projectedSections,
//       createdAt: privacy.createdAt,
//       updatedAt: privacy.updatedAt,
//     };

//     // 4️⃣ Cache for 24 hours
//     await redis.set(cacheKey, JSON.stringify(response), "EX", 60 * 60 * 24);

//     return res.status(200).json({
//       success: true,
//       title: "Privacy And Policy",
//       data: response,
//     });
//   } catch (err) {
//     console.error("Get Privacy Policy error", err);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to load Privacy Policy",
//     });
//   }
// };

module.exports.getPrivacyPolicy = async (req, res) => {
  try {
    // Try to get from Redis first
    const cachedPolicy = await redis.get("privacy_policy:content");
    if (cachedPolicy) {
      return res
        .status(200)
        .json({ success: true, data: JSON.parse(cachedPolicy) });
    }

    const privacy = await PrivacyPolicy.findOne({});

    if (privacy && typeof redis !== "undefined") {
      await redis.set(
        "privacy_policy:content",
        JSON.stringify(privacy),
        "EX",
        86400
      ); // 24h cache
    }

    res.status(200).json({
      success: true,
      data: privacy || { title: "Privacy Policy", description: "" },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch policy" });
  }
};

/**
 * =========================================
 * TERMS & CONDITIONS
 * =========================================
 */
exports.getTermsConditions = async (req, res) => {
  try {
    const cacheKey = "terms_conditions:list";

    // 1️⃣ Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        cached: true,
        title: "Terms And Conditions",
        data: JSON.parse(cached),
      });
    }

    // 2️⃣ DB query
    const terms = await TermsConditions.findOne({}).select("-__v").lean();

    if (!terms) {
      return res.status(404).json({
        success: false,
        message: "Terms and condition not found",
      });
    }

    // 3️⃣ PROJECT SECTIONS & Sort
    const projectedSections = terms.sections
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        _id: section._id,
        order: section.order,
        heading: section.heading,
        paragraph: section.paragraph,
        list: section.list || [],
      }));

    const response = {
      id: terms._id,
      title: terms.title,
      sections: projectedSections,
      createdAt: terms.createdAt,
      updatedAt: terms.updatedAt,
    };

    // 3️⃣ Save to cache (24 hours)
    await redis.set(cacheKey, JSON.stringify(response), "EX", 60 * 60 * 24);

    return res.status(200).json({
      success: true,
      title: "Terms And Conditions",
      data: response,
    });
  } catch (err) {
    console.error("Get Terms Conditions error", err);

    return res.status(500).json({
      success: false,
      message: "Failed to load Terms Conditions",
    });
  }
};
