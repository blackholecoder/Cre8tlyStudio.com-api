export function renderOfferBlock(block, textColor) {
  if (!block?.text && !block?.image_url) return "";

  return `
    <div style="display:flex;flex-direction:column;gap:16px;">
      ${
        block.image_url
          ? `
            <div style="display:flex;justify-content:center;">
              <img
                src="${block.image_url}"
                style="
                  width:100%;
                  max-width:100%;
                  max-height:auto;
                  object-fit:cover;
                  border-radius:12px;
                "
              />
            </div>
          `
          : ""
      }

      ${
        block.text
          ? `
            <div style="
              color:${textColor};
              font-size:1.05rem;
              line-height:1.7;
              text-align:left;
              white-space:normal;
            ">
              ${block.text.replace(/\n/g, "<br/>")}
            </div>
          `
          : ""
      }
    </div>
  `;
}
