import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// DO NOT DELETE!
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
        : safePrompt;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("OpenAI request timed out after 240s")),
        240000
      )
    );

    const messages = [];

    if (safePrevious && chapterNumber > 1) {
      messages.push({
        role: "system",
        content: `
NARRATIVE MEMORY — FOR CONTINUITY ONLY

The following text represents what has already happened earlier in the book.
Use it ONLY to maintain continuity of timeline, tone, and narrative direction.
DO NOT repeat, summarize, paraphrase, or rewrite this content.
Continue the book forward with new material.

${safePrevious}
    `,
      });
    }

    messages.push(
      {
        role: "system",
        content: `
You are Cre8tlyStudio AI — a **nonfiction co-author and stylist** trained to write at the level of a bestselling memoirist.
You help real authors transform their raw, honest experiences into emotionally powerful, cinematic narratives —
without ever changing what truly happened.

CRITICAL CONTINUATION RULES:
• Each chapter must advance the story forward
• Never repeat or rephrase previous chapters
• Assume the reader has already read earlier chapters
• Maintain continuity without restating prior content

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
          "Reminder: Stay 100% grounded in the author's truth. You may shape expression and tone, not facts or events. Do not repeat prior chapters.",
      }
    );

    const gptPromise = client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.8, // more natural storytelling tone, but still truthful
      messages,
    });

    const response = await Promise.race([gptPromise, timeoutPromise]);
    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("GPT nonfiction enhancement error:", error);
    throw error;
  }
}

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
