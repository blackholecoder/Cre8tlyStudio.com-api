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
  previousText = null,
  userInput = "",
  chapterNumber = 1,
  targetPages = 10
) {
  try {
    // 1 page ≈ 500 words; 10 pages ≈ 5,000 words
    const targetWordCount = targetPages * 500;

    const response = await client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: `
You are Cre8tlyStudio AI — a professional novelist and story development partner.

🎯 PURPOSE  
Write vivid, emotionally engaging narrative text that reads like a full chapter of a professional novel.  
The user provides a short idea or continuation; your job is to expand it into about ${targetPages} full pages (~${targetWordCount.toLocaleString()} words).  

💡 RULES  
• Write in rich, cinematic prose with natural pacing.  
• Use realistic dialogue, internal thoughts, and sensory detail.  
• Never summarize — always dramatize through scene and action.  
• Maintain continuity with previous chapters if provided.  
• Keep the tone and character voices consistent.  
• End naturally at a subtle cliffhanger or reflection, **do not wrap up the story**.  
• Replace hyphens with commas.  
• Produce valid HTML only (<h2>, <p> tags).

📚 LENGTH CONTROL  
If your story is shorter than the target, automatically continue expanding scenes until you reach roughly ${targetWordCount.toLocaleString()} words.  
If it exceeds that, end at a natural break near that range.  

🧱 OUTPUT FORMAT  
<h2>Chapter ${chapterNumber}</h2>  
<p>Expanded story text...</p>
          `,
        },

        ...(previousText
          ? [
              {
                role: "system",
                content:
                  "Here is the previous section for context. Continue the story naturally without repetition:",
              },
              { role: "assistant", content: previousText.slice(-8000) },
            ]
          : []),

        {
          role: "user",
          content: `User's idea or continuation:\n\n${userInput || bookPrompt}`,
        },
      ],
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("GPT book generation error:", error);
    throw error;
  }
}



