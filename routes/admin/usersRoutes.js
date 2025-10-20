import express from "express";
import { authenticateToken, requireAdmin } from "../../middleware/authMiddleware.js";
import { getAllUsers, deleteUserById } from "../../db/dbGetAllUsers.js";

const router = express.Router();

router.get("/", authenticateToken, requireAdmin, async (req, res) => {

  try {
    
    const users = await getAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

router.delete("/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const SUPER_ADMIN_ID = process.env.SUPER_ADMIN_ID || "1";

    // Only allow if the logged-in user matches your super admin ID
    if (req.user.id.toString() !== SUPER_ADMIN_ID.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only the super admin can delete users.",
      });
    }

    const response = await deleteUserById(id);
    res.json(response);
  } catch (err) {
    console.error("Error in delete user route:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete user",
    });
  }
});



export default router;