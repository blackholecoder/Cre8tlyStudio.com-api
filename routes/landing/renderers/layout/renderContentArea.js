export function renderContentArea({ contentHTML }) {
  return (
    contentHTML ||
    `<h1>Welcome to My Page</h1>
     <p>Start customizing your content.</p>`
  );
}
