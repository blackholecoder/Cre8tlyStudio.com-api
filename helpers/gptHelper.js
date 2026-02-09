import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askGPT(userIdea, options = {}) {
  let {
    totalWords,
    safePages = 5,
    wordsPerPage = 500,
    mode = "lead_magnet",
    brandTone = null,
    isFreeTier = false,
  } = options;

  if (isFreeTier) {
    safePages = 2;
    wordsPerPage = 500;
    totalWords = 1000;
  }

  if (!totalWords) totalWords = safePages * wordsPerPage;

  console.log(
    `🧠 askGPT generating: ${mode} — ${safePages} sections (${totalWords} words total)`,
  );

  // 🧩 Base system prompt
  let systemPrompt = `
You are Cre8tlyStudio AI — a creative strategist that writes high-performing digital guides, ebooks, and lead magnets.

Your goal is to write with flow, emotion, and persuasion — but without sounding like an AI or a classroom professor.
Every piece should sound natural, confident, and conversational, while still being structured and polished.

Rules:
• Do NOT invent random people, case studies, or characters.
• Avoid filler examples like “Imagine Sarah, a coach…” or “Think of a small business
Do NOT invent people, businesses, anecdotes, or fictional case studies.
• AVOID “imagine someone who…”
• AVOID placeholder stories.
• AVOID synthetic narratives.
• AVOID unnecessary adjectives and adverbs
• AVOID metaphores and cliches
• AVOID generalizations owner who…”.

• Write directly to the reader — use “you” and “your,” not third-person examples.
• Focus on real, actionable value, phrased naturally.
• Keep rhythm, punch, and clarity — short sentences mixed with longer lines for flow.
`;

  // 🎙️ Apply brand tone if provided
  if (brandTone) {
    systemPrompt += `
Now, override your writing tone to match the brand's authentic voice below.
This voice defines the slang, rhythm, emotional energy, and phrasing style.
Write exactly as this person or brand would speak — capture their cadence, humor, and emphasis.

Brand Tone Guide:
${brandTone.slice(0, 4000)}

Important:
• Let this tone drive every sentence — vocabulary, phrasing, and vibe must feel 100% like them.
• Do not revert to formal or academic tone.
• Match their energy, slang, and emotion naturally, even if it's casual or raw.
- Use clear, simple language.
- use short, impactful sentences.
- use active voice, avoid passive voice.
- use "you" and "your" to directly address the reader.
`;
  }

  // 🧱 Structure + tone rules
  systemPrompt += `
Structure the response in clean, valid HTML sections:
1. <h1>Headline</h1>
2. <h2>Hook</h2>
3. <h2>Core Value</h2>
4. <ul>Value Points</ul>
5. <h2>Summary</h2>

If a Call to Action (CTA) is provided, include it last.
Do not fabricate one if not given.

HTML only: <h1>, <h2>, <ul>, <li>, <p>, and <strong>. No Markdown.

Tone priorities:
• Conversational, human, and direct.
• Never corporate, stiff, or professor-like.
• Speak like a real brand, not an explainer.
• Use commas instead of dashes.
`;

  // 🧩 Compose messages
  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `
${userIdea}

Write approximately ${totalWords} words of high-converting, audience-friendly content.
Break it into ${safePages} natural sections (each around ${wordsPerPage} words).
Insert "<!--PAGEBREAK-->" between sections.

Each section must feel emotionally intelligent, consistent with the brand tone, and useful to real readers.
Avoid fake examples, imaginary people, or generic AI phrasing.

Mode: ${mode}
      `,
    },
  ];

  // ⏱ Timeout safeguard
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () =>
        reject(
          Object.assign(new Error("GPT request timed out after 240 seconds"), {
            code: "TIMEOUT",
          }),
        ),
      240000,
    ),
  );

  try {
    console.log("🚀 Sending single GPT request...");
    const gptPromise = client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.85,
      max_completion_tokens: isFreeTier ? 1200 : 2800,
      messages,
    });

    const response = await Promise.race([gptPromise, timeoutPromise]);
    console.log("✅ GPT response received successfully");
    return response.choices[0].message.content;
  } catch (error) {
    if (error.code === "TIMEOUT") {
      console.error(
        "⚠️ GPT timeout — suggest fewer sections or shorter content.",
      );
    }
    console.error("❌ GPT error:", error);
    throw error;
  }
}

export async function generateAILandingPage({ prompt, blockType }) {
  if (!prompt || !prompt.trim()) {
    throw new Error("Prompt is required");
  }

  // ⏱ Timeout safeguard (shorter for copy)
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () =>
        reject(
          Object.assign(new Error("GPT request timed out after 60 seconds"), {
            code: "TIMEOUT",
          }),
        ),
      60000,
    ),
  );

  const systemPrompt = `
You are a professional landing page copywriter.

Your job is to write high quality, production-ready copy
for a "${blockType}" block on a landing page.

Rules:
- Write ONLY the final copy, no explanations
- Do NOT repeat the prompt or instructions
- Do NOT mention PDFs, prompts, or AI
- Keep it clear, natural, and human
- Match the expected length for a ${blockType} block
- Avoid hype unless the prompt explicitly asks for it
- Use commas instead of dashes
`.trim();

  try {
    const gptPromise = client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const response = await Promise.race([gptPromise, timeoutPromise]);

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("GPT Landing Page Error:", error);
    throw error;
  }
}
