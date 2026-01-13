export function renderProfileCardBlock(block) {
  const {
    alignment = "center",

    // image
    image_url,
    image_size = 120,
    image_radius = 999,
    image_border_width = 1,
    image_border_color = "#e5e7eb",

    // text
    tagline = "",
    tagline_color = "#111827",

    contact_type = "email",
    contact_value = "",
    subtext_color = "#6b7280",
  } = block;

  if (!image_url && !tagline && !contact_value) return "";

  const hasTagline = Boolean(tagline);
  const hasContact = Boolean(contact_value);

  return `
  <style>
  .profile-card-desktop-spacer {
    display: none;
  }

  @media (min-width: 1024px) {
    .profile-card-desktop-spacer {
      display: block;
      height: 24px;
    }
  }
</style>

<div class="profile-card-image" style="
  text-align:${alignment};
  margin:12px 0;
  padding:8px;
  position:relative;
  user-select:none;
" oncontextmenu="return false">
<div class="profile-card-desktop-spacer"></div>

  <!-- 🔒 Anti-save overlay -->
  <div style="
    position:absolute;
    top:0;
    left:0;
    width:100%;
    height:100%;
    z-index:3;
    background:rgba(0,0,0,0);
    pointer-events:none;
  "></div>

  ${
    image_url
      ? `
    <img
      src="${image_url}"
      alt="Profile Image"
      draggable="false"
      style="
        width:${image_size}px;
        height:${image_size}px;
        object-fit:cover;
        display:block;
        margin:0 auto${hasTagline || hasContact ? " 12px" : ""};
        border-radius:${image_radius}px;
        border:${image_border_width}px solid ${image_border_color};
        pointer-events:none;
      "
    />`
      : ""
  }

  ${
    hasTagline
      ? `
  <p style="
    margin:${hasContact ? "10px 0 6px" : "10px 0 0"};
    margin-left:auto;
    margin-right:auto;
    max-width:100%;
    font-size:1rem;
    font-weight:600;
    color:${tagline_color};
    text-align:${alignment};
    user-select:none;
  ">
    ${tagline}
  </p>`
      : ""
  }


 ${
   hasContact
     ? `
<div style="
  display:flex;
  justify-content:center;
  margin-top:6px;
">
  ${
    contact_type === "phone"
      ? `<a
          href="tel:${contact_value}"
          style="
            color:${subtext_color};
            text-decoration:none;
            font-size:0.9rem;
            user-select:none;
          "
        >${contact_value}</a>`
      : `<a
          href="mailto:${contact_value}"
          style="
            color:${subtext_color};
            text-decoration:none;
            font-size:0.9rem;
            user-select:none;
          "
        >${contact_value}</a>`
  }
</div>`
     : ""
 }




</div>
`;
}
