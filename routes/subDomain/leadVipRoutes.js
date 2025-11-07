import express from "express";
import { leadSchema } from "../../middleware/emailValidation.js";
import { leadRateLimiter } from "../../middleware/leadRateLimiter.js";
import { v4 as uuidv4 } from "uuid";
import { saveLead } from "../../db/subDomain/dbLeads.js";

const router = express.Router();

router.post("/vip-leads", leadRateLimiter, async (req, res) => {
  try {
    const { error, value } = leadSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((d) => d.message).join(", "),
      });
    }

    const { email, source } = value;
    const id = uuidv4();

    const result = await saveLead(id, email, source);
    res.status(200).json(result);
  } catch (err) {
    console.error("Error saving lead:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});



export default router;