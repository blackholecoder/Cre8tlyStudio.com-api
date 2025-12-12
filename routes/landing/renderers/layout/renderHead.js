import { renderLandingStyles } from "./renderLandingStyles.js";

export function renderHead({ title, font, bg, mainOverlayColor, landingPage }) {
  return `
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>

  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    font
  )}:wght@400;600;700&display=swap" rel="stylesheet" />

  <style>
    ${renderLandingStyles({ bg, mainOverlayColor, landingPage })}
  </style>
</head>
`;
}
