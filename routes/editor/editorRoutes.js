import express from "express";
import {
  commitLeadMagnetEdit,
  startLeadMagnetEdit,
} from "../../db/editor/dbLeadMagnetsEditor.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:id/editor/start", authenticateToken, async (req, res) => {
  try {
    const result = await startLeadMagnetEdit(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id/editor/commit", authenticateToken, async (req, res) => {
  try {
    const { token, updatedHtml } = req.body;
    const file = req.files?.file; // handled by express-fileupload globally

    const result = await commitLeadMagnetEdit(req.user.id, req.params.id, {
      token,
      updatedHtml,
      file,
    });

    res.json(result);
  } catch (err) {
    console.error("❌ Commit failed:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
