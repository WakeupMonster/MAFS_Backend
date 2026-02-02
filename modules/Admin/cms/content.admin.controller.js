/* eslint-disable no-unused-vars */
const redis = require("../../../config/cache");
const { Faq, PrivacyPolicy, TermsConditions } = require("./content.model");
const {
  createFaq,
  updateFaq,
  addSectionSchema,
  updateSectionSchema,
  updatePrivacySchema,
  updateTermsConditionSchema,
} = require("./content.validation");
const mongoose = require("mongoose");

/**
 * =========================================
 * Frequently Asked Question FAQ's
 * =========================================
 */

// module.exports.createFAQ = async (req, res) => {
//   try {
//     const { error, value } = createFaq.validate(req.body);
//     if (error) {
//       return res
//         .status(400)
//         .json({ success: false, message: error.message.replace(/"/g, "") });
//     }

//     // 🔒 Prevent duplicate order
//     const exists = await Faq.findOne({ order: value.order });
//     if (exists) {
//       return res.status(409).json({
//         success: false,
//         message: `FAQ with order ${value.order} already exists`,
//       });
//     }

//     const faq = await Faq.create(value);

//     await redis.del("faq:list");

//     res.status(201).json({
//       success: true,
//       data: {
//         id: faq._id,
//         order: faq.order,
//         question: faq.question,
//         answer: faq.answer,
//         createdAt: faq.createdAt,
//         updatedAt: faq.updatedAt,
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Failed to add FAQ" });
//   }
// };

module.exports.createFAQ = async (req, res) => {
  try {
    const { error, value } = createFaq.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message.replace(/"/g, ""),
      });
    }

    // 🪄 Auto-assign 'order' correctly
    if (value.order === undefined || value.order === null) {
      const lastFaq = await Faq.findOne().sort({ order: -1 });
      value.order = lastFaq ? lastFaq.order + 1 : 1;
    } else {
      const exists = await Faq.findOne({ order: value.order });
      if (exists) {
        return res.status(409).json({
          success: false,
          message: `FAQ with order ${value.order} already exists.`,
        });
      }
    }

    const faq = await Faq.create(value);

    // 🧹 Clear caches in parallel
    await Promise.all([
      redis.del(`faq:list:${value.category}`),
      redis.del("faq:list:general"),
    ]);

    res.status(201).json({
      success: true,
      data: {
        id: faq._id,
        order: faq.order,
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        createdAt: faq.createdAt,
        updatedAt: faq.updatedAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to add FAQ",
    });
  }
};

// module.exports.updateFAQ = async (req, res) => {
//   try {
//     const { id } = req.query;

//     const { error, value } = updateFaq.validate(req.body);
//     if (error) {
//       return res.status(400).json({
//         success: false,
//         message: error.message.replace(/"/g, ""),
//       });
//     }

//     const faq = await Faq.findByIdAndUpdate(id, value, {
//       new: true,
//       runValidators: true,
//     });

//     if (!faq) {
//       return res.status(404).json({
//         success: false,
//         message: "FAQ not found",
//       });
//     }

//     // console.log("faq: ", faq);

//     await redis.del("faq:list");

//     res.status(200).json({
//       success: true,
//       message: "FAQ update successfully",
//       data: {
//         id: faq._id,
//         order: faq.order,
//         question: faq.question,
//         answer: faq.answer,
//         createdAt: faq.createdAt,
//         updatedAt: faq.updatedAt,
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Failed to update FAQ" });
//   }
// };

module.exports.updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const { error, value } = updateFaq.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message.replace(/"/g, ""),
      });
    }

    /**
     * 🚀 Single atomic update
     * - MongoDB will throw duplicate key error if category+order conflict
     */
    const faq = await Faq.findOneAndUpdate(
      { _id: id },
      { $set: value },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    // 🧹 Clear caches in parallel
    await Promise.all([
      redis.del(`faq:list:${faq.category}`),
      redis.del("faq:list:general"),
    ]);

    return res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      data: {
        id: faq._id,
        order: faq.order,
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        createdAt: faq.createdAt,
        updatedAt: faq.updatedAt,
      },
    });
  } catch (err) {
    // 🧠 Handle unique index conflict
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "FAQ order already exists in this category",
      });
    }

    console.error("Update FAQ error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update FAQ",
    });
  }
};

module.exports.deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await Faq.findByIdAndDelete(id);
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    await redis.del("faq:list:general");

    res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete FAQ" });
  }
};

/**
 * =========================================
 * Privacy Policy
 * =========================================
 */
module.exports.updatePrivacyPolicy = async (req, res) => {
  try {
    // 1. Validate the new structure (title, status, description)
    const { error, value } = updatePrivacySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message.replace(/"/g, ""),
      });
    }

    // 2. Update the single document (upsert: true creates it if it doesn't exist)
    const privacy = await PrivacyPolicy.findOneAndUpdate(
      {},
      {
        title: value.title,
        // status: value.status,
        description: value.description,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    // 3. Clear the specific Redis cache key
    if (typeof redis !== "undefined" && redis) {
      await redis.del("privacy_policy:content");
    }

    return res.status(200).json({
      success: true,
      message: "Privacy policy updated successfully",
      data: privacy,
    });
  } catch (error) {
    console.error("Update policy error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update privacy policy",
    });
  }
};

module.exports.addPrivacySection = async (req, res) => {
  try {
    const { error, value } = addSectionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message.replace(/"/g, ""),
      });
    }

    // 🔒 Prevent duplicate order
    const exists = await PrivacyPolicy.findOne({
      "sections.order": value.order,
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: `Policy Section with order ${value.order} already exists`,
      });
    }

    const privacy = await PrivacyPolicy.findOneAndUpdate(
      {},
      { $push: { sections: value } },
      {
        new: true,
        upsert: true, // creates policy if not exists
        runValidators: true,
      }
    );

    // console.log("privacy: ", privacy);

    // 🔹 PROJECT SECTIONS
    const projectedSections = privacy.sections
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        _id: section._id,
        order: section.order,
        heading: section.heading,
        paragraph: section.paragraph,
        list: section.list || [],
      }));

    await redis.del("privacy_policy:list");

    return res.status(201).json({
      success: true,
      message: "Policy added successfully",
      data: {
        id: privacy._id,
        title: privacy.title,
        sections: projectedSections,
        createdAt: privacy.createdAt,
        updatedAt: privacy.updatedAt,
      },
    });
  } catch (error) {
    console.error("Add policy error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add policy",
    });
  }
};

module.exports.updatePrivacySection = async (req, res) => {
  try {
    const { error, value } = updateSectionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message.replace(/"/g, ""),
      });
    }

    const { sectionId } = req.query;

    const updateFields = {};
    for (const key in value) {
      updateFields[`sections.$.${key}`] = value[key];
    }

    const privacy = await PrivacyPolicy.findOneAndUpdate(
      { "sections._id": sectionId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!privacy) {
      return res.status(404).json({
        success: false,
        message: "Privacy section not found",
      });
    }

    // 🔹 PROJECT SECTIONS
    const projectedSections = privacy.sections
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        _id: section._id,
        order: section.order,
        heading: section.heading,
        paragraph: section.paragraph,
        list: section.list || [],
      }));

    await redis.del("privacy_policy:list");
    // console.log("privacy: ", privacy);

    return res.json({
      success: true,
      message: "Policy Section updated successfully",
      data: {
        id: privacy._id,
        title: privacy.title,
        sections: projectedSections,
        createdAt: privacy.createdAt,
        updatedAt: privacy.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update privacy section error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update section",
    });
  }
};

module.exports.deletePrivacySection = async (req, res) => {
  try {
    const { sectionId } = req.query;

    // 1️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section id",
      });
    }

    // 2️⃣ Pull section by _id
    const privacy = await PrivacyPolicy.findOneAndUpdate(
      { "sections._id": sectionId },
      { $pull: { sections: { _id: sectionId } } },
      { new: true }
    );

    if (!privacy) {
      return res.status(404).json({
        success: false,
        message: "Policy Section not found",
      });
    }

    // 🔹 PROJECT SECTIONS
    const projectedSections = privacy.sections
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        _id: section._id,
        order: section.order,
        heading: section.heading,
        paragraph: section.paragraph,
        list: section.list || [],
      }));

    // 3️⃣ Clear cache
    await redis.del("privacy_policy:list");

    return res.json({
      success: true,
      message: "Policy Section deleted successfully",
      data: {
        id: privacy._id,
        sections: projectedSections,
        createdAt: privacy.createdAt,
        updatedAt: privacy.updatedAt,
      },
    });
  } catch (error) {
    console.error("Delete section error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete section",
    });
  }
};

/**
 * =========================================
 * TERMS & CONDITIONS
 * =========================================
 */

module.exports.updateTermsCondition = async (req, res) => {
  try {
    // 1. Validate the new structure (title, status, description)
    const { error, value } = updateTermsConditionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message.replace(/"/g, ""),
      });
    }

    // 2. Update the single document (upsert: true creates it if it doesn't exist)
    const terms_condition = await TermsConditions.findOneAndUpdate(
      {},
      {
        title: value.title,
        // status: value.status,
        description: value.description,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    // 3. Clear the specific Redis cache key
    if (typeof redis !== "undefined" && redis) {
      await redis.del("terms_conditions:list");
    }

    return res.status(200).json({
      success: true,
      message: "Terms and Condition updated successfully",
      data: terms_condition,
    });
  } catch (error) {
    console.error("Update terms condition error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update terms and condition",
    });
  }
};

module.exports.addTermCondtion = async (req, res) => {
  try {
    const { error, value } = addSectionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message.replace(/"/g, ""),
      });
    }

    // 🔒 Prevent duplicate order
    const exists = await TermsConditions.findOne({
      "sections.order": value.order,
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: `Section with order ${value.order} already exists`,
      });
    }

    const terms = await TermsConditions.findOneAndUpdate(
      {},
      { $push: { sections: value } },
      {
        new: true,
        upsert: true, // creates terms if not exists
        runValidators: true,
      }
    );

    // 🔹 PROJECT SECTIONS
    const projectedSections = terms.sections
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        _id: section._id,
        order: section.order,
        heading: section.heading,
        paragraph: section.paragraph,
        list: section.list || [],
      }));

    await redis.del("terms_conditions:list");

    return res.status(201).json({
      success: true,
      message: "Terms & Conditions added successfully",
      data: {
        id: terms._id,
        title: terms.title,
        sections: projectedSections,
        createdAt: terms.createdAt,
        updatedAt: terms.updatedAt,
      },
    });
  } catch (error) {
    console.error("Add terms & conditions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add terms & conditions",
    });
  }
};

module.exports.updateTermCondtion = async (req, res) => {
  try {
    const { error, value } = updateSectionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message.replace(/"/g, ""),
      });
    }

    const { sectionId } = req.query;

    const updateFields = {};
    for (const key in value) {
      updateFields[`sections.$.${key}`] = value[key];
    }

    const terms = await TermsConditions.findOneAndUpdate(
      { "sections._id": sectionId },
      { $set: updateFields },
      { new: true }
    );

    if (!terms) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    // 🔹 PROJECT SECTIONS
    const projectedSections = terms.sections
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        _id: section._id,
        order: section.order,
        heading: section.heading,
        paragraph: section.paragraph,
        list: section.list || [],
      }));

    await redis.del("terms_conditions:list");

    res.json({
      success: true,
      message: "Terms & condition updated successfully",
      data: {
        id: terms._id,
        title: terms.title,
        sections: projectedSections,
        createdAt: terms.createdAt,
        updatedAt: terms.updatedAt,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update section",
    });
  }
};

module.exports.deleteTermCondtion = async (req, res) => {
  try {
    const { sectionId } = req.query;

    // 1️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section id",
      });
    }

    // 2️⃣ Pull section by _id
    const terms = await TermsConditions.findOneAndUpdate(
      { "sections._id": sectionId },
      { $pull: { sections: { _id: sectionId } } },
      { new: true }
    );

    if (!terms) {
      return res.status(404).json({
        success: false,
        message: "Terms & Condition Section not found",
      });
    }

    // 🔹 PROJECT SECTIONS
    const projectedSections = terms.sections
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        _id: section._id,
        order: section.order,
        heading: section.heading,
        paragraph: section.paragraph,
        list: section.list || [],
      }));

    // 3️⃣ Clear cache
    await redis.del("terms_condition:list");

    return res.json({
      success: true,
      message: "Terms & Condition Section deleted successfully",
      data: {
        id: terms._id,
        sections: projectedSections,
        createdAt: terms.createdAt,
        updatedAt: terms.updatedAt,
      },
    });
  } catch (error) {
    console.error("Delete section error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete section",
    });
  }
};
