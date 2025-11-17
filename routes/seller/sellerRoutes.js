import express from "express";
import Stripe from "stripe";
import {
  handleCreateSellerProduct,
  handleSellerConnect,
} from "../../helpers/sellerHelper.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import {
  createSellerDashboardLink,
  getSellerBalance,
  getSellerPayouts,
  getSellerStripeAccountId,
  saveSellerStripeAccountId,
} from "../../db/seller/dbSeller.js";
import { getUserById } from "../../db/dbUser.js";

const router = express.Router();

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Step 1: Connect seller to Stripe
router.post("/connect", authenticateToken, async (req, res) => {
  try {
    const data = await handleSellerConnect(req.user.id);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error("Seller Connect Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Step 2: Create a product for that seller
router.post("/product", authenticateToken, async (req, res) => {
  try {
    const { name, price } = req.body;
    const data = await handleCreateSellerProduct(req.user.id, name, price);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error("Create Product Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/create-account-link", authenticateToken, async (req, res) => {

  try {
    const user = await getUserById(req.user.id);
    const userId = user.id;
    const userEmail = user.email;

    // 1️⃣ Get seller’s existing Stripe account ID (if any)
    let accountId = await getSellerStripeAccountId(userId);

    // 2️⃣ If not found, create new Express account
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: userEmail,
      });

      accountId = account.id;

      // Save to DB via helper
      await saveSellerStripeAccountId(userId, accountId);
    }

    // 3️⃣ Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: "https://cre8tlystudio.com/settings",
      return_url: "https://cre8tlystudio.com/settings?connected=true",
      type: "account_onboarding",
    });

    res.json({ url: accountLink.url });
  } catch (err) {
    console.error("❌ Stripe Connect error:", err);
    res.status(500).json({ error: "Failed to create onboarding link" });
  }
});


router.get("/balance/:accountId", async (req, res) => {
  try {
    const { accountId } = req.params;
    const balance = await getSellerBalance(accountId);
    res.json({ success: true, balance });
  } catch (err) {
    console.error("❌ Error fetching seller balance:", err);
    res.status(500).json({ success: false, message: "Failed to retrieve balance" });
  }
});

// 💸 Get payout history
router.get("/payouts/:accountId", async (req, res) => {
  try {
    const { accountId } = req.params;
    const payouts = await getSellerPayouts(accountId);
    res.json({ success: true, payouts });
  } catch (err) {
    console.error("❌ Error fetching seller payouts:", err);
    res.status(500).json({ success: false, message: "Failed to retrieve payouts" });
  }
});

router.post("/stripe-dashboard", async (req, res) => {
  try {
    const { accountId } = req.body;
    if (!accountId) {
      return res.status(400).json({ success: false, message: "Missing account ID" });
    }

    const { url } = await createSellerDashboardLink(accountId);
    res.json({ success: true, url });
  } catch (err) {
    console.error("❌ Stripe Dashboard Error:", err);
    res.status(500).json({ success: false, message: "Failed to create dashboard link" });
  }
});


export default router;
