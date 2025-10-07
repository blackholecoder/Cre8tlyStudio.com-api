import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import indexRoutes from "./routes/indexRoutes.js";
import checkoutRoutes from "./routes/checkoutRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import leadMagnetRoutes from "./routes/leadMagnetRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import gptRoutes from "./routes/gptRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import pdfRoutes from "./routes/pdfRoutes.js";

// Admin Imports
import usersRoutes from "./routes/admin/usersRoutes.js";
import statsRoutes from "./routes/admin/statsRoutes.js";
import leadsRoutes from "./routes/admin/leadsRoutes.js";
import reportsRoutes from "./routes/admin/reportsRoutes.js";

import cors from "cors";

const app = express();
const port = 3001;

app.use("/api/static", express.static(path.join(__dirname, "public")));


// Middleware
// app.use(cors());
const allowedOrigins = [
  "https://cre8tlystudio.com",
  "https://www.cre8tlystudio.com",
  "https://admin.cre8tlystudio.com",
  "http://localhost:5173", // if you’re using Vite locally
  "http://localhost:3000", // optional main site dev port
  "http://localhost:3001"  // optional admin dev port
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);



app.use("/api/webhook", webhookRoutes);
app.use(express.urlencoded({ extended: true }))
app.use(express.json({limit: "1000mb"})); // parse json 


app.use("/api", indexRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/lead-magnets", leadMagnetRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/gpt", gptRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/pdf", pdfRoutes);

// Admin
app.use("/api/admin/users", usersRoutes);
app.use("/api/admin/stats", statsRoutes);
app.use("/api/admin/leads", leadsRoutes);
app.use("/api/admin/reports", reportsRoutes);




app.all("*", (req, res) => {
  res.status(404).send("<h1>404 not found</h1>");
});

app.listen(port, () => console.log(`Listening on port ${port}`));
