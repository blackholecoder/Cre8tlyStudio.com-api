import express from "express";
import { submitCareerApplication } from "../../db/careers/dbCareers.js";
import { careerApplicationSchema } from "../../middleware/emailValidation.js";


const router = express.Router();

router.post("/apply", async (req, res) => {
  try {

    if (req.body.website && req.body.website.trim() !== "") {
  return res.status(400).json({
    success: false,
    message: "Bot activity detected."
  });
}

    const { error, value } = careerApplicationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const result = await submitCareerApplication(value);

    if (result.duplicate) {
  return res.status(400).json({
    success: false,
    duplicate: true,
    message: result.message
  });
}

    return res.json(result);

  } catch (err) {
    console.error("❌ Error saving career application:", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit application.",
    });
  }
});








export default router;