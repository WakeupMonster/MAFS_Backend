const redis = require("../../config/cache");
const {
  Faq,
  PrivacyPolicy,
  TermsConditions,
} = require("../Admin/cms/content.model");
const { getFaqSchema } = require("../Admin/cms/content.validation");
const { FAQ_CATEGORIES } = require("../../common/constants/faqCategory");

/* ================================
 * GET ALL FAQ
 * ================================
 */
module.exports.getFAQ = async (req, res) => {
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
        category,
        allCategories: FAQ_CATEGORIES,
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
      category,
      allCategories: FAQ_CATEGORIES,
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
        86400,
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
module.exports.getTermsConditions = async (req, res) => {
  try {
    // Try to get from Redis first
    const cachedTerms = await redis.get("terms_conditions:list");
    if (cachedTerms) {
      return res
        .status(200)
        .json({ success: true, data: JSON.parse(cachedTerms) });
    }

    const terms_conditions = await TermsConditions.findOne({});

    if (terms_conditions && typeof redis !== "undefined") {
      await redis.set(
        "terms_conditions:list",
        JSON.stringify(terms_conditions),
        "EX",
        86400,
      ); // 24h cache
    }

    res.status(200).json({
      success: true,
      data: terms_conditions || { title: "Terms Conditions", description: "" },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch Terms Conditions" });
  }
};
