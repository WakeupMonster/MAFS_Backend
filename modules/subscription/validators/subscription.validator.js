const Joi = require("joi");

const verifyPurchaseSchema = Joi.object({
  platform: Joi.string().valid("ios", "android").required().messages({
    "any.required": "Platform is required",
    "any.only": "Platform must be ios or android",
  }),
  productId: Joi.string().required().messages({
    "any.required": "Product ID is required",
  }),
  transactionId: Joi.string().when("platform", {
    is: "ios",
    then: Joi.required().messages({
      "any.required": "Transaction ID required for iOS",
    }),
    otherwise: Joi.optional(),
  }),
  purchaseToken: Joi.string().when("platform", {
    is: "android",
    then: Joi.required().messages({
      "any.required": "Purchase token required for Android",
    }),
    otherwise: Joi.optional(),
  }),
  receipt: Joi.string().optional(),
});

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    req.body = value;
    next();
  };
};

module.exports = { verifyPurchaseSchema, validate };
