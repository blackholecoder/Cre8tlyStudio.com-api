import Joi from "joi";

export const uploadBrandFileSchema = Joi.object({
  user_id: Joi.string()
    .uuid({ version: "uuidv4" })
    .required()
    .messages({
      "string.guid": "Invalid user ID format",
      "any.required": "User ID is required",
    }),

  file_name: Joi.string()
    .pattern(/\.(pdf|docx|doc|txt)$/i)
    .required()
    .messages({
      "string.pattern.base": "Only .pdf, .docx, .doc, or .txt files are allowed",
      "any.required": "File name is required",
    }),

  file_data: Joi.string()
    .base64({ paddingRequired: false })
    .required()
    .max(Math.floor(5 * 1024 * 1024 * 1.37)) // rough base64 overhead for 5 MB binary
    .messages({
      "string.base64": "File data must be valid base64",
      "any.required": "File data is required",
      "string.max": "File is too large (max 5MB)",
    }),
});
