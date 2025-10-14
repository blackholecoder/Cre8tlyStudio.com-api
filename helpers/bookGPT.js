import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// export async function askBookGPT(bookPrompt) {
//   try {
//     const response = await client.chat.completions.create({
//       model: "gpt-4.1",
//       messages: [
//         {
//           role: "system",
//           content: `
// You are Cre8tlyStudio AI, a world-class writing assistant, editor, and ghostwriter trained to help authors craft full-length books and novels.  
// Your writing style should adapt to the genre and tone provided by the user, but always remain professional, emotionally engaging, and immersive.

// You will generate full chapters, sections, and detailed narrative development based on the user's idea or outline.

// When creating a book:
// • Write with vivid description, emotional depth, and strong pacing.
// • Ensure a logical and captivating chapter flow.
// • Maintain character consistency, tone, and narrative rhythm.
// • Use natural dialogue and avoid repetition or filler.

// Format your output as valid HTML using:
// <h1> for the book title  
// <h2> for chapter titles  
// <p> for narrative paragraphs  
// <ul><li> for lists if needed  

// Do NOT use Markdown (# headers, **bold**) — only HTML.  
// Do NOT use hyphens. Replace them with commas when connecting ideas.

// If the user’s prompt references fiction, generate engaging storytelling with arcs, character development, and dialogue.  
// If it’s nonfiction, generate structured chapters that educate, inspire, and flow logically from one concept to another.

// Keep the output clean and well-structured so it can be converted to a book-style PDF.
// `},
//         {
//           role: "user",
//           content: `Book Prompt: ${bookPrompt}`,
//         },
//       ],
//     });

//     return response.choices[0].message.content;
//   } catch (error) {
//     console.error("GPT book generation error:", error);
//     throw error;
//   }
// }

// export async function askBookGPT(bookPrompt, previousText = null, userInput = "", chapterNumber = 1) {
//   try {
//     const response = await client.chat.completions.create({
//       model: "gpt-4.1",
//       messages: [
//         {
//           role: "system",
//           content: `
// You are Cre8tlyStudio AI — a world-class writing collaborator and developmental editor.
// Your job is to **co-write with the user**, expanding and enriching what they provide.

// 🎯 PURPOSE
// Help the writer develop their story gradually, one section at a time.
// Expand upon their ideas, add vivid sensory detail, deepen emotion, and make dialogue flow naturally.
// NEVER take the story in a new direction unless the user implies it.

// 🧱 STRUCTURE
// If the user writes a short paragraph or scene:
// - Expand it into 5–10 pages of narrative, keeping the same tone, characters, and world.

// If the user provides a longer section:
// - Continue naturally from where they stopped, adding rhythm and pacing.

// If previous text exists:
// - Use it as context only; DO NOT summarize or rewrite it.
// - Keep names, locations, and tone consistent.

// 💬 STYLE RULES
// • Show, don’t tell — make scenes cinematic and alive.
// • Maintain consistent point of view and tone.
// • Use rich description and natural dialogue.
// • Avoid filler, generic openings, or abrupt endings.
// • Replace hyphens with commas.
// • Use valid HTML only (<h2>, <p>, etc.).
// • Never close the story unless explicitly told to.

// 🎨 OUTPUT FORMAT
// <h2>Chapter ${chapterNumber}</h2>
// <p>Expanded story text...</p>
//           `,
//         },

//         ...(previousText
//           ? [
//               {
//                 role: "system",
//                 content:
//                   "Here is the previous section for continuity. Continue naturally without repeating it.",
//               },
//               { role: "assistant", content: previousText.slice(-8000) },
//             ]
//           : []),

//         {
//           role: "user",
//           content: `User's current writing or idea:\n\n${userInput || bookPrompt}`,
//         },
//       ],
//     });

//     return response.choices[0].message.content;
//   } catch (error) {
//     console.error("GPT book generation error:", error);
//     throw error;
//   }
// }

export async function askBookGPT(
  bookPrompt,
  previousText = "",
  userInput = "",
  chapterNumber = 1,
  targetPages = 10
) {
  try {
    const targetWordCount = targetPages * 500; // ≈ 500 words per page

    // ✅ Normalize all values to strings to avoid .trim() errors
    const safePrompt = typeof bookPrompt === "string" ? bookPrompt : "";
    const safePrevious = typeof previousText === "string" ? previousText : "";
    const safeInput = typeof userInput === "string" ? userInput : "";

    const response = await client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.85,
      messages: [
        {
          role: "system",
          content: `
You are Cre8tlyStudio AI — a world-class writing assistant, editor, and ghostwriter who collaborates with authors to craft full-length books and novels.  

Your mission is to help the author **build professional-quality novels that sell**, blending their words with cinematic storytelling, emotional depth, and natural pacing.

🎯 PURPOSE  
Continue directly from the author’s last written section, expanding it into a polished, immersive continuation.  
Do NOT restart the story or summarize.  
You are co-writing with the author — your job is to *enrich and extend* their existing narrative while preserving every detail of tone, character, and emotion.

💡 WRITING RULES  
• Continue the story exactly from where the last text ended.  
• Maintain consistent tone, world, and character voices.  
• Expand scenes with vivid sensory detail, emotional nuance, and dialogue.  
• Show, don’t tell — use cinematic storytelling.  
• Never alter established facts, settings, or personalities.  
• Avoid filler or generic openings.  
• Replace hyphens with commas.  
• Use valid HTML only (<h1>, <h2>, <p>, <ul><li>) — no Markdown.  
• Never use em dashes or hyphens for pacing — always use commas or colons instead.

📚 LENGTH  
Target roughly ${targetWordCount.toLocaleString()} words (~${targetPages} pages).  
If the continuation is short, expand naturally until that range; if longer, end at a natural break or reflection.  
Never close the story unless told to.

🧾 OUTPUT FORMAT  
<h2>Chapter ${chapterNumber}</h2>  
<p>Expanded continuation...</p>`,
        },

        ...(safePrevious
          ? [
              {
                role: "system",
                content:
                  "Here is the last written section. Continue *directly* from its final sentence without repeating or summarizing:",
              },
              { role: "assistant", content: safePrevious.slice(-8000) },
            ]
          : []),

        {
          role: "user",
          content:
            safeInput.trim().length > 0
              ? `Here is the author's latest writing or idea to blend and expand into the continuation:\n\n${safeInput}`
              : `Continue this story naturally and seamlessly from where the last section ended.\n\nOriginal Book Prompt for context:\n${safePrompt}`,
        },
      ],
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("GPT book generation error:", error);
    throw error;
  }
}






