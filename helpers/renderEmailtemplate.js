export function renderEmailTemplate(html, variables = {}) {
  try {
    let rendered = html;

    for (const key in variables) {
      rendered = rendered.replaceAll(`{{${key}}}`, variables[key] ?? "");
    }

    return rendered;
  } catch (err) {
    console.error("renderEmailTemplate error", err);
    throw err;
  }
}
