export function normalizeHtmlForEPUB(rawHtml = "") {
  if (!rawHtml || typeof rawHtml !== "string") return "";

  let html = rawHtml;

  // 1. Remove page-level wrappers (PDF artifacts)
  html = html.replace(/<div class="page[^"]*">/gi, "");
  html = html.replace(/<div class="page-inner[^"]*">/gi, "");
  html = html.replace(/<\/div>\s*<\/div>/gi, "</div>");

  // 2. Remove inline styles completely
  html = html.replace(/ style="[^"]*"/gi, "");

  // 3. Remove page-break logic
  html = html.replace(/page-break-after:[^;"]*;?/gi, "");
  html = html.replace(/page-break-before:[^;"]*;?/gi, "");
  html = html.replace(/break-inside:[^;"]*;?/gi, "");

  // 4. Normalize blockquotes (EPUB friendly)
  html = html.replace(/<blockquote[^>]*>/gi, `<blockquote class="epub-quote">`);

  // 5. Strip empty paragraphs
  html = html.replace(/<p>\s*<\/p>/gi, "");

  // 6. Ensure proper spacing between blocks
  html = html.replace(/<\/p>\s*<p>/gi, "</p>\n<p>");

  return html.trim();
}
