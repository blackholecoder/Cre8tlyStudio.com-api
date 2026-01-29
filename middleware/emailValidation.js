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

  source: safeString.max(100).default("vip.themessyattic.com").messages({
    "string.max": "Source cannot exceed 100 characters.",
  }),
});

export const careerApplicationSchema = Joi.object({
  name: safeString.min(2).max(100).required().messages({
    "any.required": "Name is required.",
    "string.empty": "Name cannot be empty.",
  }),

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

  position: safeString.max(50).required().messages({
    "any.required": "Position is required.",
  }),

  experience: safeString.min(5).max(2000).required().messages({
    "any.required": "Experience is required.",
    "string.empty": "Experience cannot be empty.",
  }),

  message: safeString.min(5).max(2000).required().messages({
    "any.required": "Message is required.",
    "string.empty": "Message cannot be empty.",
  }),

  website: Joi.string()
    .allow("") // allow empty string
    .optional() // not required at all
    .max(100)
    .messages({
      "string.max": "Website field invalid.",
    }),
});
