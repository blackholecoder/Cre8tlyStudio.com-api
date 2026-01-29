export function renderStripeCheckoutScript() {
  return `
<script>
  async function startSellerCheckout( landingPageId,
    blockId,
    productSource,
    sellerId,
    price_in_cents) {
    try {
      const res = await fetch("https://themessyattic.com/api/seller-checkout/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landingPageId,
            blockId,
            productSource,
            sellerId,
            price_in_cents,
          })
      });

      const data = await res.json();
      console.log("✅ Stripe response:", data);

      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert("Unable to start checkout. Please try again.");
      }
    } catch (err) {
      console.error("Stripe Checkout Error:", err);
      alert("Error connecting to Stripe. Please try again later.");
    }
  }
</script>
`;
}
