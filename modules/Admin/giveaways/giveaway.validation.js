const Joi = require("joi");

module.exports = {
  adminCreatePrize: {
    body: Joi.object({
      title: Joi.string().trim().required(),
      type: Joi.string().valid("GIFT_CARD").required(),
      value: Joi.number().positive().when("type", { is: "GIFT_CARD", then: Joi.required(), otherwise: Joi.optional() }),
      // planType: Joi.string().when("type", { is: "FREE_PREMIUM", then: Joi.required(), otherwise: Joi.optional() }),
      description: Joi.string().allow("", null),
      spinWheelLabel: Joi.string().max(10).required(),
      // durationInDays: Joi.number().when("type", { is: "FREE_PREMIUM", then: Joi.required(), otherwise: Joi.optional() }),
      giftCardExpiryDate: Joi.date().allow(null, "")
    })
  },

  adminUpdatePrize: {
    body: Joi.object({
      title: Joi.string().trim(),
      type: Joi.string().valid("GIFT_CARD"),
      value: Joi.number().positive(),
      description: Joi.string().allow("", null),
      spinWheelLabel: Joi.string().max(10),
      durationInDays: Joi.number().allow(null),
      planType: Joi.string().allow(null, ""),
      giftCardExpiryDate: Joi.date().allow(null, ""),
      isActive: Joi.boolean()
    })
  },

  adminCreateCampaign: {
    body: Joi.object({
      title: Joi.string().trim().required(),
      date: Joi.date().required(),
      prizeId: Joi.string().required()
    })
  },

  adminUpdateCampaign: {
    body: Joi.object({
      title: Joi.string().trim(),
      prizeId: Joi.string(),
      isActive: Joi.boolean()
    })
  }
};



const adminBulkCreateCampaign = Joi.object({
  title: Joi.string().trim().required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  prizeId: Joi.string().hex().length(24).required(),
  isActive: Joi.boolean().optional()
});

module.exports = (type) => {
  switch (type) {
    case "adminBulkCreateCampaign":
      return (req, res, next) => {
        const { error } = adminBulkCreateCampaign.validate(req.body);
        if (error) {
          return res.status(400).json({
            success: false,
            message: error.details[0].message
          });
        }
        next();
      };

    default:
      return (req, res, next) => next();
  }
};
