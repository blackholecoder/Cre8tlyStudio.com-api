export function renderHeader({ landingPage }) {
  if (!landingPage.logo_url) return "<header></header>";

  return `
<header>
  <img src="${landingPage.logo_url}" alt="Brand Logo" class="logo" />
</header>
`;
}
