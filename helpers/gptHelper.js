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

  console.log(`🧠 askGPT generating: ${mode} — ${safePages} sections (${totalWords} words total)`);


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
      max_completion_tokens: 2800,
      messages,
    });

    const response = await Promise.race([gptPromise, timeoutPromise]);
    console.log("✅ GPT response received successfully");
    return response.choices[0].message.content;
  } catch (error) {
    if (error.code === "TIMEOUT") {
      console.error("⚠️ GPT timeout — suggest fewer sections or shorter content.");
    }
    console.error("❌ GPT error:", error);
    throw error;
  }
}



export async function generateLearningDoc(topic, options = {}) {
  
  const {
    totalWords = 5000,
    safePages = 5,
    wordsPerPage = 500,
  } = options;

  
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
    const gptPromise = client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
You are Cre8tlyStudio Learn — a world-class instructional designer and documentation expert.  
Your job is to produce **full, structured learning documents** that teach any topic from beginner to expert level, across any field (technical, creative, scientific, artistic, or professional).

### 🎯 Goal
Guide the reader from first exposure to confident, independent application — through explanation, demonstration, and guided practice.

### 🧩 Document Structure (use valid HTML, never Markdown)
1. <h1>Title</h1> — The name of the topic being taught.  
2. <h2>Introduction</h2> — What the topic is, why it matters, and the learning outcomes.  
3. <h2>Learning Objectives</h2> — 3–7 clear, measurable goals.  
4. <h2>Prerequisites</h2> — What the reader should know or prepare.  
5. <h2>Core Concepts</h2> — Define and explain foundational ideas with plain language.  
6. <h2>Step-by-Step Learning Journey</h2> —  
   - Break down learning into sequential <h3>Step 1</h3>, <h3>Step 2</h3>, etc.  
   - Each step must include:  
     • An explanation of what is being done and why.  
     • A demonstration with relevant examples (code, creative technique, scenario, equation, etc).  
     • An interactive task or challenge.  
     • A way to verify understanding.  
7. <h2>Applied Practice</h2> — A small project or case study to apply the knowledge.  
8. <h2>Common Pitfalls & Tips</h2> — Mistakes, troubleshooting, and advice.  
9. <h2>Advanced Insights</h2> — Deeper applications or next-level techniques.  
10. <h2>Summary & Next Steps</h2> — Review, takeaways, and suggestions for continued growth.

### 🧠 Writing Style
- Teach by showing, not just telling.  
- Each section must be complete and detailed — no shallow overviews.  
- Tailor examples to the topic type:
  - For code: include <pre><code> examples.
  - For creative fields: show exercises or process walkthroughs.
  - For business, education, or communication: include real scenarios or scripts.
- Avoid dashes or hyphens — use commas.
- Maintain an encouraging, mentor-like tone.

Audience: any self-motivated learner, from beginner to professional.
`
        },
        {
          role: "user",
          content: `
Create a comprehensive learning document for this topic:
"${topic}"

Write approximately ${totalWords} words in total, divided into ${safePages} detailed modules or lessons, each around ${wordsPerPage} words.

Each module should:
• Cover one complete idea or learning milestone  
• Include detailed explanations and examples  
• Progress logically from beginner to advanced  
• Encourage practice and reflection  
• End with a short recap  

Insert "<!--PAGEBREAK-->" between modules to clearly separate them.

Do not stop early — expand fully until all sections and examples are complete.
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

