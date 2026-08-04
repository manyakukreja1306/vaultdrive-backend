const Joi = require("joi");

const createFolderSchema = Joi.object({
  name: Joi.string().min(1).required(),
  parentId: Joi.string().uuid().optional().allow(null),
});

const createShareLinkSchema = Joi.object({
  fileReferenceId: Joi.string().uuid().required(),
  expiresAt: Joi.string().isoDate().optional().allow(null),
  password: Joi.string().optional().allow(null, ""),
  isPublic: Joi.boolean().required(),
});

module.exports = { createFolderSchema, createShareLinkSchema };
