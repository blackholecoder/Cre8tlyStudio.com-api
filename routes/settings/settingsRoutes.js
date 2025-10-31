import express from "express";
import { getMaintenanceStatus } from "../../db/settings/dbSettings.js";


const router = express.Router();

router.get("/maintenance", async (req, res) => {
  try {
    const status = await getMaintenanceStatus();
    res.json({ maintenance: status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ maintenance: false });
  }
});

export default router;
