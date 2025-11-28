import express from "express";
import dotenv from "dotenv";
import path from "path";
import fileUpload from "express-fileupload";
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
import messagesUserRoutes from "./routes/messagesRoutes.js";

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
import settingsRoutes from "./routes/admin/settingsRoutes.js";
import adminCommunityRoutes from "./routes/admin/communityRoutes.js";


import leadVipRoutes from "./routes/subDomain/leadVipRoutes.js";
import adminAnalyticsRoutes from "./routes/admin/analytics/adminAnalyticsRoutes.js";
import authAdminRoutes from "./routes/admin/authAdminRoutes.js";




import landingPageRoutes from "./routes/landing/landingPageRoutes.js";
import landingAnalyticsRoutes from "./routes/analytics/landingAnalyticsRoutes.js";
import sellerRoutes from "./routes/seller/sellerRoutes.js";
import sellerWebhookRoute from "./routes/seller/sellerWebhookRoute.js";
import sellerCheckoutRoutes from "./routes/seller/checkout/sellerCheckoutRoutes.js";
import reviewsRoutes from "./routes/landing/reviewsRoutes.js";

import communityTopics from "./routes/community/topicsRoutes.js";
import communityPosts from "./routes/community/postsRoutes.js";
import communityComments from "./routes/community/commentsRoutes.js";
import notificationsRoutes from "./routes/community/notifications/notificationsRoutes.js";
import careersRoutes from "./routes/careers/careeersRoutes.js";
import websiteAnalyticsRoutes from "./routes/analytics/websiteAnalyticsRoutes.js";






import cors from "cors";
import { detectSubdomain } from "./middleware/detectSubdomain.js";

const app = express();
app.set("trust proxy", 1);
const port = 3001;



app.use(
  "/api/webhook",
  bodyParser.raw({ type: "application/json" }),
  webhookRoutes
);
app.use("/api/seller/webhook", sellerWebhookRoute);

app.use(express.urlencoded({ extended: true }))
app.use(express.json({limit: "500mb"})); // parse json 
app.use(detectSubdomain);


// ✅ Add this here
app.use(
  fileUpload({
    useTempFiles: false,
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // optional 50MB cap
  })
);


// const corsOptions = {
//   origin: function (origin, callback) {
//     const allowedOrigins = [
//       "https://cre8tlystudio.com",
//       "https://www.cre8tlystudio.com",
//       "https://vip.cre8tlystudio.com",
//       "https://admin.cre8tlystudio.com",
//       "http://localhost:5173",
//       "http://localhost:3000",
//       "http://localhost:3001",
//        "http://localhost:3002",
//       "tauri://localhost",
//       "https://cre8tlystudio.nyc3.digitaloceanspaces.com", 
//       "https://cre8tlystudio.nyc3.cdn.digitaloceanspaces.com",
//     ];
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       console.log("Blocked by CORS:", origin);
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// };
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://cre8tlystudio.com",
      "https://www.cre8tlystudio.com",
      "https://vip.cre8tlystudio.com",
      "https://admin.cre8tlystudio.com",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "tauri://localhost",
      "https://cre8tlystudio.nyc3.digitaloceanspaces.com",
      "https://cre8tlystudio.nyc3.cdn.digitaloceanspaces.com",
    ];

    try {
      // Allow requests with no origin (e.g., curl, mobile apps)
      if (!origin) return callback(null, true);

      const hostname = new URL(origin).hostname;

      // ✅ Allow main site, admin, Spaces, and local dev explicitly
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // ✅ Allow all subdomains like https://username.cre8tlystudio.com
      if (/^[a-z0-9-]+\.cre8tlystudio\.com$/i.test(hostname)) {
        return callback(null, true);
      }

      // 🚫 Otherwise block
      console.warn("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    } catch (err) {
      console.error("CORS validation error:", err.message);
      callback(new Error("CORS origin check failed"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));



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
app.use("/api/vip", leadVipRoutes);
app.use("/api/messages/user", messagesUserRoutes);

app.use("/api/landing", landingPageRoutes);
app.use("/api/landing-analytics", landingAnalyticsRoutes);
app.use("/api/web-analytics", websiteAnalyticsRoutes);
app.use("/", landingPageRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/seller-checkout", sellerCheckoutRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/careers", careersRoutes);

// community
app.use("/api/community/topics", communityTopics);
app.use("/api/community", communityPosts);
app.use("/api/community", communityComments);
app.use("/api/notifications", notificationsRoutes);


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
app.use("/api/admin/settings", settingsRoutes);
app.use("/api/admin/web-analytics", adminAnalyticsRoutes);
app.use("/api/admin/auth", authAdminRoutes);
app.use("/api/admin/community", adminCommunityRoutes);





app.all("*", (req, res) => {
  res.status(404).send("<h1>404 not found</h1>");
});

app.listen(port, () => console.log(`Listening on port ${port}`));
