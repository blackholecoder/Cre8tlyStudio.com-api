export function renderAuthorEmailTemplate(template, variables = {}) {
  if (!template) return null;

  let subject = template.subject;
  let html = template.body_html;

  Object.entries(variables).forEach(([key, value]) => {
    const token = `{{${key}}}`;
    subject = subject.split(token).join(value ?? "");
    html = html.split(token).join(value ?? "");
  });

  return {
    subject,
    html,
  };
}
