export function renderVerifiedReviewsBlock(block, landingPage) {
  const landingPageId = landingPage.id;
  const productId = landingPage.pdf_url || "";
  const title = block.title || "Verified Buyer Reviews";

  function getLuminance(color) {
    if (color.startsWith("rgb")) {
      const nums = color
        .replace(/rgba?\(/, "")
        .replace(")", "")
        .split(",")
        .map((n) => parseFloat(n.trim()));

      const r = nums[0];
      const g = nums[1];
      const b = nums[2];

      return r * 0.299 + g * 0.587 + b * 0.114;
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

  function autoTextColor(bg) {
    const lum = getLuminance(bg);
    return lum < 150 ? "#FFFFFF" : "#000000";
  }

  const bgColor = block.bg_color || "rgba(0,0,0,0.3)";
  const textColor = block.text_color || autoTextColor(bgColor);
  const useGlass = block.use_glass ? true : false;
  const alignment = block.alignment || "center";

  const bgStyle = useGlass
    ? "rgba(255,255,255,0.08);backdrop-filter:blur(10px);box-shadow:0 8px 32px rgba(0,0,0,0.3);"
    : `${bgColor};box-shadow:0 8px 25px rgba(0,0,0,0.25);`;

  return `
              <!-- Scoped color override so landing page global colors don't overwrite -->
              <style>
                #reviews-section, #reviews-section * {
                  color: ${textColor} !important;
                }
              </style>

              <div id="reviews-section"
                   style="margin-top:80px;padding:40px;text-align:${alignment};
                   background:${bgStyle};
                   border-radius:20px;
                   max-width:60%;
                   margin-left:auto;
                   margin-right:auto;">

                <style>
                  @media (max-width: 600px) {
                    #reviews-section {
                      padding: 20px !important;
                      border-radius: 0 !important;
                      max-width: 100% !important;
                      
                    }
                    #reviews-container {
                      max-width: 100% !important;
                      margin: 0 auto !important;
                      text-align: center !important;
                    }
                    #review-box {
                      width: 90% !important;
                      margin-left: auto !important;
                      margin-right: auto !important;
                      border-radius: 12px !important;
                    }
                  }
                </style>

                <div style="margin-bottom:10px;font-size:1.7rem;text-align:center;">
              <span style="color:#facc15;">⭐</span>
              <span style="color:#facc15;">⭐</span>
              <span style="color:#facc15;">⭐</span>
              <span style="color:#facc15;">⭐</span>
              <span style="color:#facc15;">⭐</span>
            </div>

            <h2 style="font-size:2rem;font-weight:700;margin-bottom:30px;">
              ${title}
            </h2>

                <div id="reviews-container"
                     style="display:grid;gap:20px;text-align:left;
                     max-width:900px;margin:0 auto 40px;"></div>

                <div id="review-box" style="
                  width:100%;
                  max-width:460px;
                  margin:0 auto;
                  background:rgba(0,0,0,0.15);
                  border-radius:14px;
                  padding:25px 20px;
                  display:flex;
                  flex-direction:column;
                  align-items:center;
                  box-shadow:0 6px 18px rgba(0,0,0,0.25);
                ">
                  <button
                    id="review-btn"
                    style="width:100%;padding:12px 26px;border:none;border-radius:10px;
                           background:#fff200;color:#000 !important;font-weight:600;font-size:1rem;
                           cursor:pointer;transition:all 0.25s ease;
                           box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                    Leave a Review
                  </button>

                  <div id="verify-box" style="display:none;width:100%;flex-direction:column;align-items:center;
                    justify-content:center;gap:12px;text-align:center;">
                    <input id="verify-email" type="email" placeholder="Enter your purchase email"
                           style="width:100%;padding:12px 16px;background:#0c0c0c;
                                  border:1px solid rgba(255,255,255,0.08);border-radius:10px;
                                  color:#fff;font-size:0.95rem;outline:none;transition:all 0.25s ease;" />
                    <button id="verify-btn"
                            style="width:100%;padding:12px 26px;border:none;border-radius:10px;
                                   background:#7bed9f;color:#000 !important;font-weight:600;font-size:1rem;
                                   cursor:pointer;transition:all 0.25s ease;">
                      Verify Purchase
                    </button>
                  </div>

                  <div id="submit-box" style="display:none;width:100%;flex-direction:column;gap:14px;">
                    <input id="review-username" placeholder="Your name"
                           style="width:100%;padding:12px 16px;background:#0c0c0c;
                                  border:1px solid rgba(255,255,255,0.08);border-radius:10px;
                                  color:#fff;font-size:0.95rem;outline:none;" />

                    <select id="review-rating"
                            style="width:100%;padding:12px 16px;background:#0c0c0c;
                                   border:1px solid rgba(255,255,255,0.08);border-radius:10px;
                                   color:#facc15;font-size:1rem;cursor:pointer;">
                      <option value="">Select rating ⭐</option>
                      <option value="5">⭐⭐⭐⭐⭐</option>
                      <option value="4">⭐⭐⭐⭐</option>
                      <option value="3">⭐⭐⭐</option>
                      <option value="2">⭐⭐</option>
                      <option value="1">⭐</option>
                    </select>

                    <textarea id="review-text" placeholder="Share your experience..."
                              style="width:100%;padding:14px 16px;height:100px;background:#0c0c0c;
                                     border:1px solid rgba(255,255,255,0.08);border-radius:10px;
                                     color:#fff;font-size:0.95rem;resize:none;outline:none;"></textarea>

                    <button id="submit-review"
                            style="width:100%;padding:12px 26px;background:#7bed9f;
                                   color:#000 !important;font-weight:600;border:none;border-radius:10px;
                                   cursor:pointer;font-size:1rem;">
                      Submit Review
                    </button>
                  </div>
                </div>

                <script>
                  const landingPageId = "${landingPageId}";
                  const productId = "${productId}";
                  let verifiedEmail = null;

                  async function fetchReviews() {
                    try {
                      const res = await fetch('https://cre8tlystudio.com/api/reviews/' + landingPageId);
                      const data = await res.json();
                      const container = document.getElementById('reviews-container');
                      container.innerHTML = "";

                      if (!data.reviews || data.reviews.length === 0) {
                        container.innerHTML = '<p style="text-align:center;">No reviews yet. Be the first verified buyer!</p>';
                        return;
                      }

                      data.reviews.forEach(r => {
                        const div = document.createElement('div');
                        div.style.padding = '18px';
                        div.style.background = 'rgba(0,0,0,0.4)';
                        div.style.borderRadius = '12px';
                        div.innerHTML = \`
                          <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="color:#7bed9f !important;font-weight:600;">\${r.username}</span>
                            <span style="color:#facc15 !important;">\${'⭐'.repeat(r.rating)}</span>
                          </div>
                          <p style="margin-top:8px;">\${r.review_text}</p>
                          <p style="font-size:0.85rem;margin-top:6px;opacity:0.8;">
                            Verified Buyer • \${new Date(r.created_at).toLocaleDateString()}
                          </p>
                        \`;
                        container.appendChild(div);
                      });
                    } catch (err) {
                      console.error("Fetch reviews error:", err);
                    }
                  }

                  document.addEventListener("DOMContentLoaded", () => {
                    fetchReviews();

                    const reviewBtn = document.getElementById("review-btn");
                    const verifyBox = document.getElementById("verify-box");
                    const submitBox = document.getElementById("submit-box");

                    reviewBtn.addEventListener("click", () => {
                      reviewBtn.style.display = "none";
                      verifyBox.style.display = "flex";
                    });

                    document.getElementById("verify-btn").addEventListener("click", async () => {
                      const email = document.getElementById("verify-email").value.trim();
                      if (!email) return alert("Please enter your email.");
                      try {
                        const res = await fetch("https://cre8tlystudio.com/api/reviews/verify-purchase", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email, productId }),
                        });
                        const data = await res.json();
                        if (data.verified) {
                          verifiedEmail = email;
                          verifyBox.style.display = "none";
                          submitBox.style.display = "flex";
                        } else {
                          alert("Purchase not found. Only verified buyers can leave reviews.");
                        }
                      } catch (err) {
                        alert("Server error verifying purchase.");
                      }
                    });

                    document.getElementById("submit-review").addEventListener("click", async () => {
                      const username = document.getElementById("review-username").value.trim();
                      const rating = document.getElementById("review-rating").value;
                      const review_text = document.getElementById("review-text").value.trim();
                      if (!username || !rating || !review_text) return alert("All fields required.");

                      try {
                        const res = await fetch("https://cre8tlystudio.com/api/reviews/submit", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ username, email: verifiedEmail, rating, review_text, productId, landingPageId }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          alert("Review submitted!");
                          submitBox.style.display = "none";
                          reviewBtn.style.display = "block";
                          fetchReviews();
                        } else alert(data.message || "Error submitting review.");
                      } catch (err) {
                        alert("Server error submitting review.");
                      }
                    });
                  });
                </script>
              </div>
              `;
}
