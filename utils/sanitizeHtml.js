// utils/sanitizeHtml.js
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

export function sanitizeHtml(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "hr", // ✅ allow divider
      "strong",
      "em",
      "u",
      "s",
      "blockquote",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "span",
      "pre",
      "code",
    ],

    // ⚠️ IMPORTANT: use ARRAY, not object
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "style"],

    KEEP_CONTENT: true,

    FORBID_TAGS: ["script", "iframe", "object", "embed"],
    FORBID_ATTR: ["onerror", "onclick", "onload"],
  });
}
