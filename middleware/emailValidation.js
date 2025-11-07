import Joi from "joi";

// custom pattern to reject HTML/script tags or angle brackets
const safeString = Joi.string()
  .pattern(/^(?!.*<[^>]*>).*$/)
  .message("Input contains forbidden characters or HTML tags");

export const leadSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: true } })
    .min(5)
    .max(255)
    .required()
    .trim()
    .lowercase()
    .pattern(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)
    .messages({
      "string.email": "Please enter a valid email address.",
      "any.required": "Email is required.",
      "string.pattern.base": "Invalid characters in email.",
      "string.empty": "Email cannot be empty.",
    }),

  source: safeString
    .max(100)
    .default("vip.cre8tlystudio.com")
    .messages({
      "string.max": "Source cannot exceed 100 characters.",
    }),
});
