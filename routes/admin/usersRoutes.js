import express from "express";
// import { authenticateToken, requireAdmin } from "../../middleware/authMiddleware.js";
import { getAllUsers } from "../../db/dbGetAllUsers.js";

const router = express.Router();

router.get("/", async (req, res) => {
  // console.log("Decoded user from token:", req.user);

  try {
    
    const users = await getAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

export default router;