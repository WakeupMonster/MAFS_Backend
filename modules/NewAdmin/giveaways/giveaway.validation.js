const Joi = require("joi");

module.exports = {
  adminCreatePrize: {
    body: Joi.object({
      title: Joi.string().trim().required(),
      type: Joi.string().valid("GIFT_CARD", "FREE_PREMIUM").required(),
      value: Joi.number().positive().required(),
      description: Joi.string().allow("", null),
      spinWheelLabel: Joi.string().required()
    })
  },

  adminUpdatePrize: {
    body: Joi.object({
      title: Joi.string().trim(),
      type: Joi.string().valid("GIFT_CARD", "FREE_PREMIUM"),
      value: Joi.number().positive(),
      description: Joi.string().allow("", null),
      spinWheelLabel: Joi.string(),
      isActive: Joi.boolean()
    })
  },

  adminCreateCampaign: {
    body: Joi.object({
      date: Joi.date().required(),
      prizeId: Joi.string().required()
    })
  },

  adminUpdateCampaign: {
    body: Joi.object({
      prizeId: Joi.string(),
      isActive: Joi.boolean()
    })
  }
};



const adminBulkCreateCampaign = Joi.object({
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
