import { getUserById, updateStripeAccountId } from "../db/dbUser.js";
import {
  createProductAndPrice,
  createStripeConnectAccount,
  createStripeOnboardingLink,
} from "../services/sellerStripeService.js";

// 🧠 Create or fetch seller Stripe account
export async function handleSellerConnect(userId) {
  const user = await getUserById(userId);

  if (user.stripe_connect_account_id) {
    // Seller already connected
    const link = await createStripeOnboardingLink(
      user.stripe_connect_account_id
    );
    return {
      accountId: user.stripe_connect_account_id,
      onboardingUrl: link.url,
    };
  }

  // Create new Stripe account
  const account = await createStripeConnectAccount(user.email);
  await updateStripeAccountId(userId, account.id);

  const onboarding = await createStripeOnboardingLink(account.id);
  return { accountId: account.id, onboardingUrl: onboarding.url };
}

// 🧱 Create product for seller
export async function handleCreateSellerProduct(userId, productName, price) {
  const user = await getUserById(userId);
  if (!user.stripe_connect_account_id)
    throw new Error("Seller has not connected their Stripe account.");

  const { product, price: priceObj } = await createProductAndPrice(
    user.stripe_connect_account_id,
    productName,
    price
  );

  return { product, price: priceObj };
}
