import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// updated with promise

// Fiction
export async function askBookGPTFiction(
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

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("OpenAI request timed out after 240s")),
        240000
      )
    );

    const gptPromise = client.chat.completions.create({
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
    const response = await Promise.race([gptPromise, timeoutPromise]);
    return response.choices[0].message.content;
  } catch (error) {
    console.error("GPT book generation error:", error);
    throw error;
  }
}


// exact writing, no difference
// export async function askBookGPT(
//   bookPrompt,
//   previousText = "",
//   userInput = "",
//   chapterNumber = 1
// ) {
//   try {
//     const safePrompt = typeof bookPrompt === "string" ? bookPrompt : "";
//     const safeInput =
//       typeof userInput === "string" && userInput.trim().length > 0
//         ? userInput.trim()
//         : previousText || safePrompt;

//     const timeoutPromise = new Promise((_, reject) =>
//       setTimeout(() => reject(new Error("OpenAI request timed out after 240s")), 240000)
//     );

//     const gptPromise = client.chat.completions.create({
//       model: "gpt-4.1",
//       temperature: 0.5, // lower temp = more factual, less imaginative
//       messages: [
//         {
//           role: "system",
//           content: `
// You are Cre8tlyStudio AI — a professional nonfiction book editor.
// Your job is to help the author **refine their existing writing** while keeping
// 100% of the facts, memories, tone, and authenticity untouched.

// 🎯 PURPOSE
// Polish the author’s text for clarity, grammar, structure, pacing, and readability.
// Do **not** add new sentences, ideas, dialogue, or assumptions.
// Do **not** make up events, settings, or emotions not explicitly in the text.

// 🚫 You must NOT:
// • Invent or infer details not already written.
// • Add creative flourishes, metaphors, or sensory details not provided.
// • Continue or expand the story.
// • Reorder events or reinterpret meaning.

// ✅ You MUST:
// • Keep every fact, name, place, and quote exactly as written.
// • Maintain the author’s tone, personality, and emotional intent.
// • Fix spelling, punctuation, flow, and readability.
// • Replace hyphens with commas.
// • Use valid HTML tags only (<h1>, <h2>, <p>, <ul><li>) — no Markdown.

// 📘 OUTPUT FORMAT
// <h2>Chapter ${chapterNumber}</h2>
// <p>Edited and cleaned-up version of the author’s original writing. No creative additions.</p>
// `,
//         },
//         {
//           role: "user",
//           content: `Here is the author's nonfiction text. Please clean it up for clarity and grammar only — 
// no invention, no addition, no continuation:\n\n${safeInput}`,
//         },
//         {
//           role: "system",
//           content:
//             "Reminder: You are editing, not writing. Keep all factual details, tone, and structure intact.",
//         },
//       ],
//     });

//     const response = await Promise.race([gptPromise, timeoutPromise]);
//     return response.choices[0]?.message?.content || "";
//   } catch (error) {
//     console.error("GPT nonfiction edit error:", error);
//     throw error;
//   }
// }

//adds a little more
// export async function askBookGPT(
//   bookPrompt,
//   previousText = "",
//   userInput = "",
//   chapterNumber = 1
// ) {
//   try {
//     const safePrompt = typeof bookPrompt === "string" ? bookPrompt : "";
//     const safePrevious = typeof previousText === "string" ? previousText : "";
//     const safeInput =
//       typeof userInput === "string" && userInput.trim().length > 0
//         ? userInput.trim()
//         : safePrevious || safePrompt;

//     const timeoutPromise = new Promise((_, reject) =>
//       setTimeout(() => reject(new Error("OpenAI request timed out after 240s")), 240000)
//     );

//     const gptPromise = client.chat.completions.create({
//       model: "gpt-4.1",
//       temperature: 0.7, // balance: creative phrasing but factual control
//       messages: [
//         {
//           role: "system",
//           content: `
// You are Cre8tlyStudio AI — a **nonfiction co-writer and senior editor**.
// Your purpose is to help the author express their true story beautifully and completely,
// without inventing anything that did not actually happen.

// 🎯 YOUR ROLE
// You refine the author’s writing into a compelling, emotionally resonant, and professional narrative.
// You may extend or connect ideas **only** when they are implied or already mentioned by the author.

// 🚫 DO NOT:
// • Add fictional events, characters, dialogue, or details not grounded in the author’s text.
// • Create new scenes or speculate about motivations or feelings never expressed.
// • Shift the timeline or change factual information.
// • Use over-dramatized language or flowery description.

// ✅ DO:
// • Clarify, expand, and connect ideas that are *already present or implied*.
// • Strengthen transitions and emotional flow.
// • Preserve every real fact, person, place, and moment.
// • Maintain the author’s raw honesty and voice.
// • Use vivid but truthful phrasing where appropriate.
// • Replace hyphens with commas.
// • Output in clean HTML (<h2>, <p>).

// 💡 GOAL
// Make the writing read like a published memoir or narrative nonfiction book — clear, powerful, and emotionally alive,
// but never fictionalized.

// 🧾 OUTPUT FORMAT
// <h2>Chapter ${chapterNumber}</h2>
// <p>Refined version of the author’s text — polished, structured, and complete, without adding fictional material.</p>
// `,
//         },
//         {
//           role: "user",
//           content: `Here is the author's nonfiction writing. 
// Please refine it as described — improve flow, completeness, and readability 
// without inventing new facts or people:\n\n${safeInput}`,
//         },
//         {
//           role: "system",
//           content:
//             "Reminder: You are a nonfiction co-writer. Expand only on what the author already wrote or clearly implied. Never invent new facts.",
//         },
//       ],
//     });

//     const response = await Promise.race([gptPromise, timeoutPromise]);
//     return response.choices[0]?.message?.content || "";
//   } catch (error) {
//     console.error("GPT nonfiction co-writer error:", error);
//     throw error;
//   }
// }

export async function askBookGPT(
  bookPrompt,
  previousText = "",
  userInput = "",
  chapterNumber = 1
) {
  try {
    const safePrompt = typeof bookPrompt === "string" ? bookPrompt : "";
    const safePrevious = typeof previousText === "string" ? previousText : "";
    const safeInput =
      typeof userInput === "string" && userInput.trim().length > 0
        ? userInput.trim()
        : safePrevious || safePrompt;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("OpenAI request timed out after 240s")), 240000)
    );

    const gptPromise = client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.8, // more natural storytelling tone, but still truthful
      messages: [
        {
          role: "system",
          content: `
You are Cre8tlyStudio AI — a **nonfiction co-author and stylist** trained to write at the level of a bestselling memoirist.
You help real authors transform their raw, honest experiences into emotionally powerful, cinematic narratives —
without ever changing what truly happened.

🎯 PURPOSE
Turn the author's authentic words into compelling prose that reads like a professional memoir.
Bring rhythm, emotion, and vivid pacing while staying faithful to every fact, event, and person.

🚫 STRICTLY AVOID:
• Adding fictional people, dialogue, or imagined scenes.
• Guessing at emotions, intentions, or outcomes never stated.
• Changing time, place, or facts.
• Overwriting with flowery or melodramatic tone.

✅ YOU MAY:
• Deepen emotional resonance using what’s already expressed.
• Smooth transitions and sentence rhythm.
• Reorder sentences *only* for clarity, not to alter truth.
• Strengthen narrative voice and readability.
• Fill in implied gaps (e.g., connect two real moments smoothly).
• Use richer phrasing or pacing that elevates the text’s tone.
• Replace hyphens with commas.
• Output valid HTML only (<h1>, <h2>, <p>).

💡 GOAL
Make the author’s story sound like it was written by a professional nonfiction author:
truth intact, but the *delivery* refined, captivating, and alive.

🧾 OUTPUT FORMAT
<h2>Chapter ${chapterNumber}</h2>
<p>Enhanced, professionally written version of the author’s true story — more vivid and emotionally engaging, but entirely factual.</p>
`,
        },
        {
          role: "user",
          content: `Here is the author's true story. 
Make it read like a bestselling memoir — emotional, structured, and beautifully written —
but **do not add** fictional details or invent anything beyond what the author provided:\n\n${safeInput}`,
        },
        {
          role: "system",
          content:
            "Reminder: Stay 100% grounded in the author's truth. You may shape expression and tone, not facts or events.",
        },
      ],
    });

    const response = await Promise.race([gptPromise, timeoutPromise]);
    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("GPT nonfiction enhancement error:", error);
    throw error;
  }
}






// export async function askBookGPT(
//   bookPrompt,
//   previousText = "",
//   userInput = "",
//   chapterNumber = 1
// ) {
//   try {
//     const safePrompt = typeof bookPrompt === "string" ? bookPrompt : "";
//     const safePrevious = typeof previousText === "string" ? previousText : "";
//     const safeInput = typeof userInput === "string" ? userInput : "";
//     const trimmedInput = safeInput.trim();

//     const timeoutPromise = new Promise((_, reject) =>
//       setTimeout(
//         () => reject(new Error("OpenAI request timed out after 240s")),
//         240000
//       )
//     );

//     const gptPromise = client.chat.completions.create({
//       model: "gpt-4.1",
//       temperature: 0.85,
//       messages: [
//         {
//           role: "system",
//           content: `
// You are Cre8tlyStudio AI — a world-class editor, writing assistant, and ghostwriter who helps authors create professional, publish-ready non-fiction manuscripts that are clear, structured, and engaging while preserving every factual and contextual element provided by the author.

// 🎯 PURPOSE
// Continue directly from the author’s last written section, improving the clarity, rhythm, and flow of the text without removing or inventing anything. Keep every real element, quote, person, or place intact.

// 💡 WRITING RULES
// • Do not add new situations, people, events, places, or quoted words.
// • Do not delete or change any existing quotations, people, or places.
// • Retain all factual information exactly as given.
// • Improve sentence structure, transitions, and readability for smoother flow.
// • Clarify complex ideas or sentences while keeping the original meaning untouched.
// • Preserve the author’s tone, authority, and authenticity.
// • Replace hyphens with commas.
// • Use valid HTML only (<h1>, <h2>, <p>, <ul><li>) — no Markdown.
// • Never use em dashes or hyphens for pacing — always use commas or colons instead.

// 📚 LENGTH
// Maintain roughly the same length as the original content unless natural expansion is required for clarity. Do not summarize or condense the text; focus on refinement and structure, not reduction.

// 🧾 OUTPUT FORMAT
// <h2>Chapter ${chapterNumber}</h2>
// <p>Expanded continuation...</p>
// `,
//         },
//         ...(safePrevious
//           ? [
//               {
//                 role: "user",
//                 content: `Here is the last written section. Continue directly from its final sentence without repeating or summarizing:\n\n${safePrevious.slice(
//                   -8000
//                 )}`,
//               },
//             ]
//           : []),
//         {
//           role: "user",
//           content:
//             trimmedInput.length > 0
//               ? `Here is the author's latest writing or idea to blend and expand into the continuation:\n\n${trimmedInput}`
//               : `Continue this manuscript naturally and seamlessly from where the last section ended.\n\nOriginal Book Prompt for context:\n${safePrompt}`,
//         },
//       ],
//     });
//     const response = await Promise.race([gptPromise, timeoutPromise]);
//     return response.choices[0]?.message?.content || "";
//   } catch (error) {
//     console.error("GPT book generation error:", error);
//     throw error;
//   }
// }

export async function askBookGPTEducational(
  bookPrompt,
  previousText = "",
  userInput = "",
  chapterNumber = 1
) {
  try {
    const safePrompt = typeof bookPrompt === "string" ? bookPrompt : "";
    const safePrevious = typeof previousText === "string" ? previousText : "";
    const safeInput = typeof userInput === "string" ? userInput : "";
    const trimmedInput = safeInput.trim();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("OpenAI request timed out after 240s")),
        240000
      )
    );

    const gptPromise = client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
You are Cre8tlyStudio AI — a professional academic and technical editor trusted by educators, doctors, and lawyers to refine educational and instructional manuscripts.

🎯 PURPOSE
Improve grammar, punctuation, spelling, and readability only.  
Do **not** rewrite or add new content, alter meaning, or inject creative narrative elements.  
Maintain the professional tone, context, and subject-specific terminology of the original writing.

💡 WRITING RULES
• Correct grammar, punctuation, and spelling errors.  
• Adjust phrasing solely for clarity, flow, and readability.  
• Preserve all factual, legal, or instructional content exactly as written.  
• Retain every quote, citation, figure, and reference unchanged.  
• Do not add or remove any sentences or sections.  
• Use plain, concise, academic language suitable for educational or professional publication.  
• Replace hyphens with commas.  
• Use valid HTML only (<h1>, <h2>, <p>, <ul><li>) — no Markdown.  
• Never use em dashes or hyphens for pacing — always use commas or colons instead.

📚 LENGTH
Keep the same length unless minor expansion is required to improve readability.  
Do **not** summarize, condense, or add explanations.

🧾 OUTPUT FORMAT
<h2>Chapter ${chapterNumber}</h2>
<p>Revised and polished continuation...</p>
`,
        },
        ...(safePrevious
          ? [
              {
                role: "user",
                content: `Here is the last written section. Continue directly from its final sentence, applying only grammatical and readability improvements:\n\n${safePrevious.slice(
                  -8000
                )}`,
              },
            ]
          : []),
        {
          role: "user",
          content:
            trimmedInput.length > 0
              ? `Here is the author's latest section or idea to refine for grammar, punctuation, and readability:\n\n${trimmedInput}`
              : `Continue refining this educational manuscript naturally from where the last section ended.\n\nOriginal Book Prompt for context:\n${safePrompt}`,
        },
      ],
    });
    const response = await Promise.race([gptPromise, timeoutPromise]);
    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("GPT educational book generation error:", error);
    throw error;
  }
}
