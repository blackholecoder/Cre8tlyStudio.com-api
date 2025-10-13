export function estimatePagesFromText(htmlText = "") {
  if (!htmlText) return 0;

  // Strip HTML tags and count words
  const plainText = htmlText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = plainText.split(" ").length;

  // Estimate: 500 words per page (industry average for fiction layout)
  const estimatedPages = Math.ceil(wordCount / 500);

  // Clamp to 1 minimum page
  return Math.max(1, estimatedPages);
}