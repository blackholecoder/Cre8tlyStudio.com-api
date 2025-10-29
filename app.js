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
import tempCoverRoutes from "./routes/uploads/tempCoverRoutes.js";
import bookRoutes from "./routes/books/bookRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import unsplashRoutes from "./routes/unsplashRoutes.js";
import editorRoutes from "./routes/editor/editorRoutes.js";
import bodyParser from "body-parser";
// Checkout for Ebooks
import ebookCheckoutRoutes from "./routes/ebookCheckout/ebookCheckoutRoutes.js";

// Admin Imports
import usersRoutes from "./routes/admin/usersRoutes.js";
import statsRoutes from "./routes/admin/statsRoutes.js";
import leadsRoutes from "./routes/admin/leadsRoutes.js";
import reportsRoutes from "./routes/admin/reportsRoutes.js";
import messagesRoutes from "./routes/admin/messagesRoutes.js";
import addAdminRoutes from "./routes/admin/addAdminRoutes.js";
import ebooksRoutes from "./routes/admin/ebookRoutes.js";
import freeBookRoutes from "./routes/admin/freeBookRoutes.js";

import cors from "cors";

const app = express();
const port = 3001;

app.use(
  "/api/webhook",
  bodyParser.raw({ type: "application/json" }),
  webhookRoutes
);

app.use(express.urlencoded({ extended: true }))
app.use(express.json({limit: "500mb"})); // parse json 


const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://cre8tlystudio.com",
      "https://www.cre8tlystudio.com",
      "https://admin.cre8tlystudio.com",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:3001",
       "http://localhost:3002",
      "tauri://localhost",
      "https://cre8tlystudio.nyc3.digitaloceanspaces.com", 
      "https://cre8tlystudio.nyc3.cdn.digitaloceanspaces.com",
    ];
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
};


app.use(cors(corsOptions));
app.options('*', cors(corsOptions));


// check size of iput data from front end prompt tested and works
// app.use((req, res, next) => {
//   const len = parseInt(req.headers["content-length"] || "0", 10);
//   console.log(
//     `[REQ] ${req.method} ${req.originalUrl} — content-length: ${len} bytes`
//   );
//   next();
// });



app.use("/api/static", express.static(path.join(__dirname, "public")));


app.use("/api", indexRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/lead-magnets", leadMagnetRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/gpt", gptRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/uploads", tempCoverRoutes);
app.use("/api/edit", editorRoutes);

// Admin
app.use("/api/admin/users", usersRoutes);
app.use("/api/admin/stats", statsRoutes);
app.use("/api/admin/leads", leadsRoutes);
app.use("/api/admin/reports", reportsRoutes);
app.use("/api/admin/messages", messagesRoutes);
app.use("/api/admin", addAdminRoutes);
app.use("/api/admin", freeBookRoutes);
app.use("/api/ebooks", ebooksRoutes);
app.use("/api/ebooks/checkout", ebookCheckoutRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/upload-data", uploadRoutes);
app.use("/api/unsplash", unsplashRoutes);





app.all("*", (req, res) => {
  res.status(404).send("<h1>404 not found</h1>");
});

app.listen(port, () => console.log(`Listening on port ${port}`));
