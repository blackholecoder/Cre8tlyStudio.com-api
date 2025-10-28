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
} = options;

if (!totalWords) totalWords = safePages * wordsPerPage;

const MAX_PAGES_PER_CALL = 5;

console.log(`🧩 askGPT started for mode: ${mode} — ${safePages} pages`);

// 🧱 Auto-chunk long requests
  if (safePages > MAX_PAGES_PER_CALL) {
    console.log(
      `📄 Large content detected (${safePages} pages). Splitting into smaller GPT chunks...`
    );

    const chunks = [];

    for (let i = 0; i < safePages; i += MAX_PAGES_PER_CALL) {
      const chunkPages = Math.min(MAX_PAGES_PER_CALL, safePages - i);
      const chunkWords = chunkPages * wordsPerPage;

      console.log(
        `➡️ Generating chunk ${i / MAX_PAGES_PER_CALL + 1} (${chunkPages} pages)...`
      );

      const chunk = await askGPT(userIdea, {
        totalWords: chunkWords,
        safePages: chunkPages,
        wordsPerPage,
        mode,
        brandTone,
      });

      chunks.push(chunk);
      await new Promise((r) => setTimeout(r, 2000)); // brief delay
    }

    console.log("✅ All chunks complete for large document.");
    return chunks.join("\n<!--PAGEBREAK-->\n");
  }

  let systemPrompt = `
You are Cre8tlyStudio AI, a creative strategist that writes high-performing digital guides, ebooks, and lead magnets.

Your goal is to write with flow, emotion, and persuasion — but without sounding like an AI or a classroom professor.
Every piece should sound natural, confident, and conversational, while still being structured and polished.

Rules:
• Do NOT invent random people, case studies, or characters.
• Avoid filler examples like “Imagine Sarah, a coach…” or “Think of a small business owner who…”.
• Write directly to the reader — use “you” and “your,” not third-person examples.
• Focus on real, actionable value, phrased naturally.
• Keep rhythm, punch, and clarity — short sentences mixed with longer lines for flow.
`;

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

  systemPrompt += `
Structure the response in clear HTML sections:
1. <h1>Headline</h1>
2. <h2>Hook</h2>
3. <h2>Core Value</h2>
4. <ul>Value Points</ul>
5. <h2>Summary</h2>

If a Call to Action (CTA) is provided, include it last.
Do not fabricate one if not given.

Use valid HTML only: <h1>, <h2>, <ul>, <li>, <p>, and <strong>.
No Markdown.

Tone priorities:
• Conversational, human, and direct.
• Never corporate, stiff, or professor-like.
• Speak like a real brand, not an explainer.
• Use commas instead of dashes.
`;

  // 🧩 Prepare the messages as usual
  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `
${userIdea}

Write approximately ${totalWords} words of high-converting, audience-friendly content.
Break it into ${safePages} sections, each around ${wordsPerPage} words.
Insert "<!--PAGEBREAK-->" between sections.

Each section must feel natural, emotionally intelligent, and consistent with the brand tone.
Avoid fake scenarios, “imagine a person” examples, or anything that sounds AI-written.

Mode: ${mode}
`,
    },
  ];

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
    const gptPromise = client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.85,
      max_completion_tokens: 1400,
      messages,
    });
const response = await Promise.race([gptPromise, timeoutPromise]);
    return response.choices[0].message.content;
  } catch (error) {
    if (error.code === "TIMEOUT") {
  console.error("⚠️ GPT timeout — suggest fewer sections or shorter content.");
}
    console.error("GPT error:", error);
    throw error;
  }
}


export async function generateLearningDoc(topic, options = {}) {
  let {
  totalWords,
  safePages = 5,
  wordsPerPage = 300,
} = options;

if (!totalWords) totalWords = safePages * wordsPerPage;

  if (safePages <= 0) {
  console.warn("⚠️ Invalid safePages value, skipping generation.");
  return "";
}

  // Limit how many pages are sent per GPT call
  const MAX_PAGES_PER_CALL = 5;

  // If user requested a very long document, split into smaller parts
  if (safePages > MAX_PAGES_PER_CALL) {
    console.log(`📄 Large request detected (${safePages} pages). Splitting into smaller chunks...`);
    const modules = [];

    for (let i = 0; i < safePages; i += MAX_PAGES_PER_CALL) {
      const chunkPages = Math.min(MAX_PAGES_PER_CALL, safePages - i);

      

      const chunkWords = chunkPages * wordsPerPage;

      console.log(`➡️ Generating chunk ${i / MAX_PAGES_PER_CALL + 1} (${chunkPages} pages)...`);

      // Recursive smaller generation
      const chunk = await generateLearningDoc(topic, {
        totalWords: chunkWords,
        safePages: chunkPages,
        wordsPerPage,
      });

      if (chunkPages <= 0) break;

      modules.push(chunk);
      // brief delay between requests to avoid rate limiting
      await new Promise((r) => setTimeout(r, 2000));
    }

    console.log("✅ All chunks complete");
    return modules.join("\n<!--PAGEBREAK-->\n");
  }

  try {
    console.log("🚀 Sending request to OpenAI...");

    // Manual timeout (3-minute limit)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("OpenAI request timed out after 240s")), 240000);
    });

    const gptPromise = client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.7,
      max_completion_tokens: 1400,
      messages: [
        {
          role: "system",
          content: `
You are Cre8tlyStudio Learn — a world-class instructional designer, senior technical writer, and master educator.  
You produce **elite, full-length learning documents** designed to *teach mastery*, not just provide summaries.

### 🎯 Goal
Transform any topic into a deep, structured, professional learning experience that delivers *true skill development*.  
Each lesson should feel like a complete, standalone chapter in a premium training manual.

### 🧩 Document Structure (use valid HTML only, never Markdown)
1. <h1>Title</h1> — The name of the topic being taught.  
2. <h2>Introduction</h2> — Explain what this topic is, its real-world significance, and what mastery will enable the learner to do.  
3. <h2>Learning Objectives</h2> — 4–7 clear, measurable outcomes phrased as “You will be able to…”.  
4. <h2>Background & Context</h2> — Provide deep historical, conceptual, or industry context that gives meaning to the topic.  
5. <h2>Core Concepts</h2> — Define and expand foundational principles in plain, engaging language. Use analogies, metaphors, and real-world comparisons.  
6. <h2>Step-by-Step Learning Journey</h2> —  
   - Organize into <h3>Step 1</h3>, <h3>Step 2</h3>, etc.  
   - Each step must contain:  
     • <strong>Explanation</strong> — Describe not just *how*, but *why* it matters.  
     • <strong>Demonstration</strong> — Include real-world code, examples, or detailed process breakdowns.  
     • <strong>Interactive Task</strong> — A realistic challenge or mini-project.  
     • <strong>Verify Understanding</strong> — A reflection, quiz, or measurable checkpoint.  
7. <h2>Applied Practice</h2> — Present a complete mini-project, case study, or integration example that ties everything together.  
8. <h2>Common Pitfalls & Troubleshooting</h2> — Detail common mistakes, their causes, and how to fix them.  
9. <h2>Advanced Insights</h2> — Explore expert techniques, optimization strategies, or real industry use cases.  
10. <h2>Summary & Next Steps</h2> — Reinforce key takeaways, encourage continued learning, and suggest related topics to master next.

### 🧠 Writing Style
- Write as if mentoring someone directly — warm, confident, and highly knowledgeable.  
- Explain why, how, and what if, but keep the flow focused and purposeful.  
- Use precise examples, realistic data, and clear reasoning.  
- Avoid filler, repetition, or unnecessary re-explaining.  
- Avoid dashes or hyphens — use commas.  
- Favor real-world relevance over academic tone.

### 💡 Expectation
Each module should feel like a professional workshop chapter — detailed, actionable, and complete within its assigned length.  
Leave **no conceptual gaps**. Assume the learner paid for this and expects full clarity and insight.
          `,
        },
        {
          role: "user",
          content: `
Create a comprehensive learning document for this topic:
"${topic}"

Write **exactly ${safePages} clearly separated modules or lessons.**
Each module should be around ${wordsPerPage} words long,
for a total of roughly ${totalWords} words overall.
Make each section complete and detailed within that space — do not exceed the total word goal.
Once the content feels well-rounded and educationally complete, stop writing.

Each module should:
• Cover one complete idea or learning milestone  
• Include detailed explanations and examples  
• Progress logically from beginner to advanced  
• Encourage practice and reflection  
• End with a short recap  

Insert "<!--PAGEBREAK-->" between modules to clearly separate them.

Do not stop early — expand fully until all sections and examples are complete.
Include background reasoning, context, use cases, and expert guidance for each part.
          `,
        },
      ],
    });

    // whichever finishes first (OpenAI or timeout)
    const response = await Promise.race([gptPromise, timeoutPromise]);

    console.log("✅ OpenAI response received");
    return response.choices[0].message.content;
  } catch (err) {
    console.error("❌ GPT error:", err.message);

    if (err.message.includes("timed out")) {
      throw new Error("OpenAI request timed out — try fewer pages or smaller modules.");
    }

    if (err.response?.status === 400 && err.response?.data?.error?.message?.includes("context_length_exceeded")) {
      throw new Error("Requested document is too large for one generation. Please reduce the number of pages.");
    }

    console.error("❌ processPromptFlow internal error:", err);
    throw err;
  }
}

