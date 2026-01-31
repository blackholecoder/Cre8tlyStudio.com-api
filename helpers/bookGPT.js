import OpenAI from "openai";
import {
  extractProtectedText,
  restoreProtectedText,
} from "../utils/extractProtectedText.js";
import { countWords } from "../utils/countWords.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askBookGPTFiction(
  bookPrompt,
  previousSummary = "",
  userInput = "",
  chapterNumber = 1,
  targetPages = 10,
) {
  try {
    const targetWordCount = targetPages * 500; // ≈ 500 words per page

    const safePrompt = typeof bookPrompt === "string" ? bookPrompt : "";
    const safeInput =
      typeof userInput === "string" && userInput.trim().length > 0
        ? userInput.trim()
        : safePrompt;

    const inputWordCount = countWords(safeInput);
    const MAX_INPUT_WORDS = 3000;

    if (inputWordCount > MAX_INPUT_WORDS) {
      throw new Error(
        `This chapter input contains ${inputWordCount} words. The maximum allowed per generation is ${MAX_INPUT_WORDS} words. Please split your chapter into multiple parts or sections.`,
      );
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("OpenAI request timed out after 240s")),
        240000,
      ),
    );

    const messages = [];

    // ✅ CONTINUITY SUMMARY (replaces raw previous text)
    if (previousSummary && chapterNumber > 1) {
      messages.push({
        role: "system",
        content: `
PREVIOUS CONTINUITY SUMMARY — FOR CONTINUITY ONLY

Use this ONLY to maintain story timeline, character consistency, emotional trajectory, and narrative direction.
DO NOT repeat, summarize, paraphrase, or restate this content.

${previousSummary}
        `,
      });
    }

    // ✅ FICTION RULES (UNCHANGED INTENT)
    messages.push(
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

STRICT RULES:
• Do NOT add section titles
• Do NOT add headings
• Do NOT add labels like "Section 1" or "Chapter"
• Do NOT reorganize structure
• Do NOT insert summaries or transitions outside the given text

Preserve paragraph breaks exactly as given.
Return ONLY <p> tags.
`,
      },
      {
        role: "user",
        content:
          safeInput.length > 0
            ? `Here is the author’s latest writing or idea to blend and expand into the continuation:\n\n${safeInput}`
            : `Continue this story naturally and seamlessly from where the last section ended.\n\nOriginal Book Prompt for context:\n${safePrompt}`,
      },
    );

    const gptPromise = client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.85,
      messages,
    });

    const response = await Promise.race([gptPromise, timeoutPromise]);
    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("GPT fiction book generation error:", error);
    throw error;
  }
}

export async function askBookGPT(
  bookPrompt,
  previousSummary = "",
  userInput = "",
  chapterNumber = 1,
) {
  try {
    const safePrompt = typeof bookPrompt === "string" ? bookPrompt : "";
    const rawInput =
      typeof userInput === "string" && userInput.trim().length > 0
        ? userInput.trim()
        : safePrompt;

    // 🔒 Extract protected text
    const { processedText, protectedMap } = extractProtectedText(rawInput);

    const totalWords = countWords(processedText);

    const MAX_WORDS_PER_REQUEST = 3000;

    if (totalWords > MAX_WORDS_PER_REQUEST) {
      throw new Error(
        `This chapter contains ${totalWords} words. The maximum allowed per chapter is ${MAX_WORDS_PER_REQUEST} words. Please split this into multiple chapters or parts.`,
      );
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("OpenAI request timed out after 240s")),
        240000,
      ),
    );

    const messages = [];

    if (previousSummary && chapterNumber > 1) {
      messages.push({
        role: "system",
        content: `
PREVIOUS CONTINUITY SUMMARY — FOR CONTINUITY ONLY

The following text represents what has already happened earlier in the book.
Use it ONLY to maintain continuity of timeline, tone, and narrative direction.
DO NOT repeat, summarize, paraphrase, or rewrite this content.
Continue the book forward with new material.

${previousSummary}
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

STRICT RULES:
• Do NOT add section titles
• Do NOT add headings
• Do NOT add labels like "Section 1" or "Chapter"
• Do NOT reorganize structure
• Do NOT insert summaries or transitions outside the given text

Preserve paragraph breaks exactly as given.
Return ONLY <p> tags.
`,
      },
      {
        role: "user",
        content: `Here is the author's true story. 
Make it read like a bestselling memoir — emotional, structured, and beautifully written —
but **do not add** fictional details or invent anything beyond what the author provided.

IMPORTANT:
The text contains placeholders like {{PROTECTED_1}}.
Do NOT rewrite, remove, or modify these placeholders.

TEXT TO ENHANCE:
${processedText}`,
      },
      {
        role: "system",
        content:
          "Reminder: Stay 100% grounded in the author's truth. You may shape expression and tone, not facts or events. Do not repeat prior chapters.",
      },
    );

    const gptPromise = client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.8, // more natural storytelling tone, but still truthful
      messages,
    });

    const response = await Promise.race([gptPromise, timeoutPromise]);

    const rawOutput = response.choices[0]?.message?.content || "";

    // 🔁 Restore protected text exactly
    const restoredOutput = restoreProtectedText(rawOutput, protectedMap);

    return restoredOutput;
  } catch (error) {
    console.error("GPT nonfiction enhancement error:", error);
    throw error;
  }
}

export async function askBookGPTEducational(
  bookPrompt,
  previousSummary = "",
  userInput = "",
  chapterNumber = 1,
) {
  try {
    const safePrompt = typeof bookPrompt === "string" ? bookPrompt : "";
    const rawInput =
      typeof userInput === "string" && userInput.trim().length > 0
        ? userInput.trim()
        : safePrompt;

    // 🔒 Enforce input size limit
    const inputWordCount = countWords(rawInput);
    const MAX_INPUT_WORDS = 3000;

    if (inputWordCount > MAX_INPUT_WORDS) {
      throw new Error(
        `This chapter contains ${inputWordCount} words. The maximum allowed per chapter is ${MAX_INPUT_WORDS} words. Please split the content into multiple sections or parts.`,
      );
    }

    // 🔒 Extract protected text (quotes, brackets, etc.)
    const { processedText, protectedMap } = extractProtectedText(rawInput);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("OpenAI request timed out after 240s")),
        240000,
      ),
    );

    const messages = [];

    // ✅ CONTINUITY (summary-based only)
    if (previousSummary && chapterNumber > 1) {
      messages.push({
        role: "system",
        content: `
PREVIOUS CONTINUITY SUMMARY — FOR CONTINUITY ONLY

Use this ONLY to maintain topic progression, instructional flow, and structural consistency.
DO NOT repeat, restate, paraphrase, or expand this content.

${previousSummary}
        `,
      });
    }

    // ✅ EDITOR ROLE (unchanged intent)
    messages.push(
      {
        role: "system",
        content: `
You are Cre8tlyStudio AI — a professional academic and technical editor trusted by educators, doctors, and lawyers to refine educational and instructional manuscripts.

🎯 PURPOSE
Improve grammar, punctuation, spelling, and readability only.
Do NOT rewrite or add new content, alter meaning, or inject creative narrative elements.
Maintain professional tone, context, and subject-specific terminology.

💡 WRITING RULES
• Correct grammar, punctuation, and spelling errors.
• Adjust phrasing solely for clarity, flow, and readability.
• Preserve all factual, legal, or instructional content exactly as written.
• Retain every quote, citation, figure, and reference unchanged.
• Do not add or remove any sentences or sections.
• Use plain, concise, academic language.
• Replace hyphens with commas.
• Use valid HTML only (<h1>, <h2>, <p>, <ul><li>).
• Never use em dashes or hyphens for pacing, always use commas or colons.

📚 LENGTH
Keep the same length unless minor expansion is required for readability.
Do NOT summarize, condense, or add explanations.

STRICT RULES:
• Do NOT add section titles
• Do NOT add headings
• Do NOT add labels like "Section 1" or "Chapter"
• Do NOT reorganize structure
• Do NOT insert summaries or transitions outside the given text

Preserve paragraph breaks exactly as given.
Return ONLY <p> tags.
`,
      },
      {
        role: "user",
        content: `
IMPORTANT:
The text contains placeholders like {{PROTECTED_1}}.
Do NOT rewrite, remove, or modify these placeholders.

Here is the author’s educational content to refine.
Apply grammar, punctuation, and readability improvements only.
Do not add, remove, or reorganize content:

${processedText}
        `,
      },
    );

    const gptPromise = client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.6,
      messages,
    });

    const response = await Promise.race([gptPromise, timeoutPromise]);

    const rawOutput = response.choices[0]?.message?.content || "";

    // 🔁 Restore protected text exactly
    const restoredOutput = restoreProtectedText(rawOutput, protectedMap);

    return restoredOutput;
  } catch (error) {
    console.error("GPT educational book generation error:", error);
    throw error;
  }
}
