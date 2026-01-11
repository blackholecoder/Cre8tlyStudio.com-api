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
    `🧠 askGPT generating: ${mode} — ${safePages} sections (${totalWords} words total)`
  );

  // 🧩 Base system prompt
  let systemPrompt = `
You are Cre8tlyStudio AI — a creative strategist that writes high-performing digital guides, ebooks, and lead magnets.

Your goal is to write with flow, emotion, and persuasion — but without sounding like an AI or a classroom professor.
Every piece should sound natural, confident, and conversational, while still being structured and polished.

Rules:
• Do NOT invent random people, case studies, or characters.
• Avoid filler examples like “Imagine Sarah, a coach…” or “Think of a small business owner who…”.
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
          })
        ),
      240000
    )
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
        "⚠️ GPT timeout — suggest fewer sections or shorter content."
      );
    }
    console.error("❌ GPT error:", error);
    throw error;
  }
}

export async function generateLearningDoc(topic, options = {}) {
  const { totalWords = 5000, safePages = 5, wordsPerPage = 500 } = options;

  // ⏱ Timeout safeguard
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () =>
        reject(
          Object.assign(new Error("GPT request timed out after 240 seconds"), {
            code: "TIMEOUT",
          })
        ),
      480000
    )
  );

  try {
    const gptPromise = client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
You are Cre8tlyStudio Author — a world-class subject-matter writer who creates comprehensive, book-quality, intellectually honest deep dives on any topic.
This is not marketing copy, inspirational writing, or illustrative fiction.

The writing must be grounded in:
• Direct human experience
• Verifiable real-world processes
• Observed patterns across industries or time
• Documented systems, behaviors, or failures

Do NOT invent people, businesses, anecdotes, or fictional case studies.
No “imagine someone who…”
No placeholder stories.
No synthetic narratives.

If a claim cannot be grounded in lived experience, documented reality, or widely observed practice, do not include it.

### 🎯 Goal
Write a full, structured document that teaches, explains, and explores a single subject in complete depth — not a summary, not a quick guide.

### 🧩 Document Structure (use clean, semantic HTML)
1. <h1>Title</h1> — The main topic.
2. <h2>Introduction</h2> — Define the problem clearly, why it matters now, and what has changed, and hook the reader.
3. <h2>Foundations</h2> — Establish first principles, terminology, and historical context without storytelling shortcuts.
4. <h2>Core Development</h2> — Dive deep into how, why, and when the concepts work.  
   Analyze how the system actually works in practice.
   Focus on mechanisms, incentives, tradeoffs, and failure modes.
5. <h2>Expert Application</h2> — Show how experienced practitioners approach this differently than beginners.
   Emphasize judgment, constraints, and decision-making.
6. <h2>Case Study or Walkthrough</h2> — Use real processes, documented examples, or step-by-step breakdowns.
   If first-person experience is available, write from that perspective.
   Otherwise, use factual industry examples without dramatization.
7. <h2>Reflections & Insights</h2> — Synthesize lessons, second-order effects, and nuanced truths.
8. <h2>Conclusion</h2> — Summarize what matters, what is misunderstood, and what comes next.

### 🧠 Writing Style
- For code: include <pre><code> examples.
- Write like a world-class mentor authoring a definitive book.  
- Do **not** include shallow teaching labels like “Recap,” “Practice,” “Objectives,” or “Overview.”  
- No fictional anecdotes or invented characters.
- No inspirational filler.
- No vague generalities.
- No moralizing language.  
- Use concrete examples, data, or scenarios to demonstrate mastery.  
- Avoid using any dashes or hyphens, use commas instead. 
- Every section must stand alone with depth and completeness.   
- Maintain a professional, book-quality tone suitable for experts.
- Assume the reader is intelligent and skeptical.
- Write with precision, restraint, and authority.
- Write in a natural, human voice. Favor clarity over polish, and allow the writing to feel lived in rather than perfected.

Audience: professionals, entrepreneurs, and experts who value clarity, truth, and depth over persuasion.
`,
        },
        {
          role: "user",
          content: `
Write a comprehensive deep-dive document on the topic:
"${topic}"

Target length: roughly ${totalWords} words total, divided into ${safePages} main sections (about ${wordsPerPage} words each).

Each section should:
• Explore one major pillar of the topic with rich explanation, examples, and insight.  
• Flow logically from one section to the next, forming a cohesive narrative.  
• Include real-world context or case study material where relevant.  
• Avoid any educational scaffolding (no "Recap", "Applied Practice", or "Lesson Objectives").  
• Feel like a premium, book-worthy deep dive intended for professionals.

Insert "<!--PAGEBREAK-->" between sections to clearly separate them.

Do not stop early — expand fully until all sections are complete.
`,
        },
      ],
    });

    const response = await Promise.race([gptPromise, timeoutPromise]);
    return response.choices[0].message.content;
  } catch (error) {
    console.error("GPT error:", error);
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
          })
        ),
      60000
    )
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
