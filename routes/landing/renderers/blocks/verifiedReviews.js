export function renderVerifiedReviewsBlock(block, landingPage) {
  const landingPageId = landingPage.id;
  const productId = landingPage.pdf_url || "";
  const title = block.title || "Verified Buyer Reviews";

  function getLuminance(color) {
    if (!color) return 255;

    if (color.startsWith("rgb")) {
      const nums = color
        .replace(/rgba?\(/, "")
        .replace(")", "")
        .split(",")
        .map((n) => parseFloat(n.trim()));
      return nums[0] * 0.299 + nums[1] * 0.587 + nums[2] * 0.114;
    }

    if (color.startsWith("#")) {
      const c = color.replace("#", "");
      const r = parseInt(c.substr(0, 2), 16);
      const g = parseInt(c.substr(2, 2), 16);
      const b = parseInt(c.substr(4, 2), 16);
      return r * 0.299 + g * 0.587 + b * 0.114;
    }

    return 255;
  }

  function resolveBackground(block, landingPage) {
    // 1. Explicit block background
    if (block.bg_color && block.bg_color !== "transparent") {
      return block.bg_color;
    }

    // 2. Gradient present → assume dark unless told otherwise
    if (block.use_gradient || landingPage?.bg_gradient) {
      return "gradient";
    }

    // 3. Landing page solid background
    if (landingPage?.bg_color) {
      return landingPage.bg_color;
    }

    // 4. Theme-based fallback (safe default)
    return "#0f172a"; // dark slate
  }

  function autoTextColor(bg) {
    if (bg === "gradient") {
      // Gradients are almost always dark in modern design
      return "#ffffff";
    }

    return getLuminance(bg) < 150 ? "#ffffff" : "#000000";
  }

  const resolvedBg = resolveBackground(block, landingPage);

  const textColor =
    block.reviews_text_color || block.text_color || autoTextColor(resolvedBg);

  const placeholderColor =
    textColor === "#ffffff" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";

  return `
<style>
  #reviews-section {
  color: ${textColor};
}
    #reviews-section input::placeholder,
  #reviews-section textarea::placeholder {
    color: ${placeholderColor};
  }
</style>

<div id="reviews-section" style="
  margin-top:120px;
  max-width:860px;
  margin-left:auto;
  margin-right:auto;
  padding:0 16px;
">

  <!-- Header -->
  <div style="margin-bottom:24px;text-align:center;">
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
    <span style="color:#facc15;font-size:0.9rem;margin-bottom:6px;">
      ★★★★★
    </span>

    <h2 style="margin:0;font-size:1.4rem;font-weight:600;color: ${textColor}">
      ${title}
    </h2>
  </div>

  <div style="font-size:0.85rem;opacity:0.65;margin-top:6px;color: ${textColor}">
    Real feedback from verified customers
  </div>
</div>

  <!-- Reviews -->
  <div id="reviews-container" style="display:flex;flex-direction:column;"></div>
  <div style="margin-top:16px;text-align:center;">

  <button id="load-more-reviews" style="
    display:none;
    padding:8px 14px;
    font-size:0.85rem;
    background:transparent;
    border:1px solid currentColor;
    opacity:0.7;
    border-radius:4px;
    cursor:pointer;
  ">
    Load more reviews
  </button>
</div>

  <!-- Write review CTA -->
  <div style="margin-top:24px;text-align:center;">
    <button id="review-btn" style="
      padding:8px 14px;
      font-size:0.85rem;
      background:transparent;
      border:1px solid currentColor;
      opacity:0.7;
      border-radius:4px;
      cursor:pointer;
    ">
      Write a customer review
    </button>

    <div style="margin-top:16px;display:flex;justify-content:center;">

    <div id="verify-box" style="display:none;width:100%;">
      <input id="verify-email" type="email" placeholder="Enter purchase email"
        style="width:100%;padding:12px 14px;border:1px solid currentColor;background:transparent;border-radius:6px;margin-bottom:10px;" />

      <button id="verify-btn" style="
        padding:10px 18px;
        font-size:0.9rem;
        background:#ffffff;
        color:#0f172a;
        border:none;
        border-radius:6px;
        cursor:pointer;
        font-weight:600;
      ">
        Verify Purchase
      </button>
    </div>
    </div>
 <div style="margin-top:16px;display:flex;justify-content:center;">
    <div id="submit-box" style="display:none;width:100%;">
      <input id="review-username" placeholder="Your name"
        style="width:100%;padding:12px 14px;border:1px solid currentColor;background:transparent;border-radius:6px;margin-bottom:10px;" />

      <select id="review-rating"
        style="width:100%;padding:12px 14px;border:1px solid currentColor;background:transparent;border-radius:6px;margin-bottom:10px;">
        <option value="">Select rating</option>
        <option value="5">★★★★★</option>
        <option value="4">★★★★</option>
        <option value="3">★★★</option>
        <option value="2">★★</option>
        <option value="1">★</option>
      </select>

      <textarea id="review-text" placeholder="Write your review"
        style="width:100%;padding:12px 14px;border:1px solid currentColor;background:transparent;border-radius:6px;height:100px;margin-bottom:10px;"></textarea>

      <button id="submit-review" style="
        padding:10px 18px;
        font-size:0.9rem;
        background:#ffffff;
        color:#0f172a;
        border:none;
        border-radius:6px;
        cursor:pointer;
      ">
        Submit Review
      </button>
    </div>
  </div>
  </div>

<script>
  const landingPageId = "${landingPageId}";
  const productId = "${productId}";
  let verifiedEmail = null;

  let currentPage = 1;
  const limit = 5;
  let hasMore = true;

  async function fetchReviews() {
    const res = await fetch(
  "https://cre8tlystudio.com/api/reviews/" +
    landingPageId +
    "?page=" + currentPage +
    "&limit=" + limit
);
    const data = await res.json();
    
    const container = document.getElementById("reviews-container");

if (currentPage === 1) {
  container.innerHTML = "";
}

    const btn = document.getElementById("load-more-reviews");

// Empty state (only on first page)
if (currentPage === 1 && (!data.reviews || !data.reviews.length)) {
  container.innerHTML = "<p style='opacity:0.7;'>No reviews yet.</p>";
  hasMore = false;
  if (btn) btn.style.display = "none";
  return;
}

hasMore = data.reviews && data.reviews.length === limit;

 if (btn) {
    btn.style.display = hasMore ? "inline-block" : "none";
  }

    data.reviews.forEach((r) => {
  const div = document.createElement("div");

  // Card styling
  div.style.background = "rgba(255,255,255,0.06)";
  div.style.borderRadius = "10px";
  div.style.padding = "16px 18px";
  div.style.marginBottom = "14px";
  div.style.boxShadow = "0 2px 6px rgba(0,0,0,0.12)";
  div.style.textAlign = "left";

  div.innerHTML =
  '<div style="display:flex;flex-direction:column;gap:6px;">' +

    '<div style="display:flex;align-items:center;gap:8px;">' +
      '<span style="color:#facc15;font-size:0.85rem;">' +
        "★".repeat(r.rating) +
      '</span>' +
    '</div>' +

    '<div style="font-size:0.8rem;opacity:0.65;">' +
      'By ' + r.username + ' · ' +
      new Date(r.created_at).toLocaleDateString() +
      '<span style="margin-left:6px;color:#f59e0b;"> Verified Purchase</span>' +
    '</div>' +

    '<p style="margin:6px 0 0 0;line-height:1.6;font-size:0.95rem;">' +
      r.review_text +
    '</p>' +

  '</div>';

  container.appendChild(div);
});

  }

  document.addEventListener("DOMContentLoaded", () => {
    fetchReviews();

    const reviewBtn = document.getElementById("review-btn");
    const verifyBox = document.getElementById("verify-box");
    const submitBox = document.getElementById("submit-box");

    const loadMoreBtn = document.getElementById("load-more-reviews");

loadMoreBtn.onclick = () => {
  if (!hasMore) {
    loadMoreBtn.style.display = "none";
    return;
  }

  currentPage++;
  fetchReviews();
};

    reviewBtn.onclick = () => {
      reviewBtn.style.display = "none";
      verifyBox.style.display = "block";
    };

    document.getElementById("verify-btn").onclick = async () => {
      const email = document.getElementById("verify-email").value.trim();
      if (!email) return alert("Enter email");

      const res = await fetch("https://cre8tlystudio.com/api/reviews/verify-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, productId }),
      });

      const data = await res.json();
      if (!data.verified) return alert("Purchase not found");

      verifiedEmail = email;
      verifyBox.style.display = "none";
      submitBox.style.display = "block";
      document.getElementById("review-username").value = "";
      document.getElementById("review-rating").value = "";
      document.getElementById("review-text").value = "";
    };

    document.getElementById("submit-review").onclick = async () => {
      const username = document.getElementById("review-username").value.trim();
      const rating = document.getElementById("review-rating").value;
      const review_text = document.getElementById("review-text").value.trim();

      if (!username || !rating || !review_text) return alert("All fields required");

      await fetch("https://cre8tlystudio.com/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email: verifiedEmail,
          rating,
          review_text,
          productId,
          landingPageId,
        }),
      });

      submitBox.style.display = "none";
      reviewBtn.style.display = "block";
      currentPage = 1;
      hasMore = true;
      const btn = document.getElementById("load-more-reviews");
      if (btn) btn.style.display = "inline-block";

      fetchReviews();
    };
  });
</script>

</div>
`;
}
