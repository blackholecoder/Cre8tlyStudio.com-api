export function generateBookHTML({
  title = "Untitled Book",
  author = "Anonymous",
  chapters = [],
  link = null,
  partNumber = 1,
}) {
  function renderChapterContent(raw) {
    if (!raw) return "";
    return raw.replace(
      /<blockquote(?![^>]*class=)/g,
      '<blockquote class="book-quote"'
    );
  }

  const safeChapters = chapters.filter(
    (c) => c?.content && typeof c.content === "string" && c.content.trim()
  );

  const titlePage =
    partNumber === 1
      ? `
      <section class="title-page">
        <h1>${title}</h1>
        <h2>by ${author}</h2>
      </section>
    `
      : "";

  const learnMore = link
    ? `
      <section class="learn-more">
        <h2>Learn More</h2>
        <p>
          Continue your journey at
          <a href="${link}" class="book-link">${link}</a>
        </p>
      </section>
    `
    : "";

  const chaptersHTML = safeChapters
    .map(
      (c) => `
      <section class="chapter">
        <h2 class="chapter-title">${c.title}</h2>
        ${renderChapterContent(c.content)}
      </section>
    `
    )
    .join("");

  return `
    <article class="book">
      ${titlePage}
      ${chaptersHTML}
      ${learnMore}
    </article>
  `;
}
