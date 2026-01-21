const Joi = require("joi");

exports.feed = (req, res, next) => {
  const schema = Joi.object({
    limit: Joi.number().min(1).max(50).optional(),
    page: Joi.string().optional() // optional cursor for paging
  });
  const { error } = schema.validate(req.query);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  next();
};

exports.action = (req, res, next) => {
  const schema = Joi.object({
    targetId: Joi.string().required(),
    action: Joi.string().valid("like", "pass", "superlike").required()
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  next();
};

exports.undo = (req, res, next) => {
  const schema = Joi.object({
    targetId: Joi.string().required()
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  next();
};