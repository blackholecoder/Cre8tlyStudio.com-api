import express from "express";
import { getAllEmployeeList, getAllEmployeeReferrals } from "../../db/admin/dbReferral.js";

const router = express.Router();

router.get("/referrals", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const employeeId = req.query.employeeId || null;

    const result = await getAllEmployeeReferrals(page, limit, employeeId);

    return res.json(result);
  } catch (err) {
    console.error("Referral fetch error:", err);
    return res.status(500).json({
      message: "Failed to load referral records",
    });
  }
});

router.get("/employees", async (req, res) => {
  try {
    const employees = await getAllEmployeeList();
    return res.json({ employees });
  } catch (err) {
    console.error("Employee fetch error:", err);
    return res.status(500).json({ message: "Failed to load employees" });
  }
});


export default router;
