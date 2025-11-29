import express from "express";
import {
  authenticateAdminToken,
  requireAdmin,
} from "../../middleware/authMiddleware.js";
import { getAllUsers, deleteUserById } from "../../db/dbGetAllUsers.js";

const router = express.Router();

router.get("/", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {

   const page = parseInt(req.query.page) || 1;
   const limit = parseInt(req.query.limit) || 20;
   
    const { users, total } = await getAllUsers(page, limit);
    res.json({
      success: true,
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

router.delete(
  "/users/:id",
  authenticateAdminToken,
  requireAdmin,
  async (req, res) => {
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
  }
);


router.get("/recent", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {
    const magnets = await getRecentLeadMagnets(10);

    res.json({
      success: true,
      magnets,
    });
  } catch (err) {
    console.error("Error fetching recent magnets:", err);
    res.status(500).json({ message: "Failed to get magnets" });
  }
});

export default router;
