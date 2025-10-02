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
import cors from "cors";

const app = express();
const port = 3001;

app.use("/api/static", express.static(path.join(__dirname, "public")));


// Middleware
app.use(cors());



app.use("/api/webhook", webhookRoutes);
app.use(express.urlencoded({ extended: true }))
app.use(express.json({limit: "1000mb"})); // parse json 


app.use("/api", indexRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/lead-magnets", leadMagnetRoutes);




app.all("*", (req, res) => {
  res.status(404).send("<h1>404 not found</h1>");
});

app.listen(port, () => console.log(`Listening on port ${port}`));
