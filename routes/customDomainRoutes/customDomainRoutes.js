import express from "express";
import {
  addDomain,
  getUserDomains,
  removeDomain,
  setPrimaryDomain,
  verifyDomainOwnership,
} from "../../db/customDomains/dbDomains.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await getUserDomains(req.user.id);
    res.json(result);
  } catch (err) {
    console.error("🔥 GET /domains error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/add", authenticateToken, async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) {
      return res
        .status(400)
        .json({ success: false, message: "Domain is required" });
    }

    const result = await addDomain(req.user.id, domain);
    res.json(result);
  } catch (err) {
    console.error("🔥 POST /domains/add error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/set-primary", authenticateToken, async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) {
      return res
        .status(400)
        .json({ success: false, message: "Domain is required" });
    }

    const result = await setPrimaryDomain(req.user.id, domain);
    res.json(result);
  } catch (err) {
    console.error("🔥 POST /domains/set-primary error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/remove/:domain", authenticateToken, async (req, res) => {
  try {
    const { domain } = req.params;
    const result = await removeDomain(req.user.id, domain);
    res.json(result);
  } catch (err) {
    console.error("🔥 DELETE /domains/remove error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/verify", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { domain } = req.body;

    if (!domain) {
      return res
        .status(400)
        .json({ success: false, message: "Domain required" });
    }

    const result = await verifyDomainOwnership(userId, domain);

    return res.json(result);
  } catch (err) {
    console.error("❌ /domains/verify error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
