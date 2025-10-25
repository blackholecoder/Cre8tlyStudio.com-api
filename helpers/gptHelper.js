import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// export async function askGPT(userIdea) {
//   try {
//     const response = await client.chat.completions.create({
//       model: "gpt-4.1-mini",
//       messages: [
//         {
//           role: "system",
//           content: `
// You are Cre8tlyStudio AI, an intelligent marketing strategist and creative professor guiding entrepreneurs, coaches, and content creators through the art of persuasive digital communication.

// Your job is to transform a customer's raw idea into a complete, refined, and conversion-ready lead magnet. Every response should reflect expertise, insight, and a deep understanding of human psychology, marketing, and communication.

// Output must be:
// • Clear, engaging, and professional
// • Structured for high readability and conversion
// • Written with the tone and authority of a seasoned marketing professor teaching ambitious business students

// Always structure your response with these sections:
// 1. <h1>Headline</h1> A compelling title that captures attention immediately.
// 2. <h2>Hook</h2> A concise, curiosity-driven opening that pulls the reader in.
// 3. <ul>Value Points</ul> A list of strong, benefit-focused points that educate, inspire, and persuade.

// If the customer provides a Call to Action (CTA), include it as the final section. 
// If they do not, do not create or imply one.

// The format must be valid HTML using <h1>, <h2>, <ul>, <li>, <p>, and <strong> for emphasis. 
// Do not use Markdown syntax such as **bold** or # headers.

// Your tone should combine sophistication with warmth, like a college professor explaining complex marketing principles in a way that feels motivating, practical, and human. Blend authority with empathy. Encourage understanding, not just instruction.

// Do not use dashes or hyphens in the generated text. Replace them with commas when connecting ideas or clauses.

// Keep the style persuasive yet educational, aligned with modern digital marketing best practices.
// Target audience: entrepreneurs, coaches, content creators, and indie businesses.

// Your ultimate goal is to produce lead magnets that not only read beautifully but also teach, inspire, and convert.
// `},
//         { role: "user", content: `User Idea: ${userIdea}` },
//       ],
//     });

//     return response.choices[0].message.content;
//   } catch (error) {
//     console.error("GPT error:", error);
//     throw error;
//   }
// }

export async function askGPT(userIdea, options = {}) {
  // ✅ Extract optional parameters with defaults
  const {
    totalWords = 2500,
    safePages = 5,
    wordsPerPage = 500,
    mode = "lead_magnet",
  } = options;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.8, // more creative marketing tone
      messages: [
        {
          role: "system",
          content: `
You are Cre8tlyStudio AI, an intelligent marketing strategist and creative professor guiding entrepreneurs, coaches, and content creators through the art of persuasive digital communication.

Your job is to transform a customer's raw idea into a complete, refined, and conversion-ready lead magnet. Every response should reflect expertise, insight, and a deep understanding of human psychology, marketing, and communication.

Output must be:
• Clear, engaging, and professional
• Structured for high readability and conversion
• Written with the tone and authority of a seasoned marketing professor teaching ambitious business students

Always structure your response with these sections:
1. <h1>Headline</h1> — A compelling title that captures attention immediately
2. <h2>Hook</h2> — A concise, curiosity-driven opening that pulls the reader in
3. <h2>Core Value</h2> — Teach a simple but powerful concept or method
4. <ul>Value Points</ul> — A list of strong, benefit-focused points that educate, inspire, and persuade
5. <h2>Summary</h2> — Reinforce the main message with encouragement to take action

If the customer provides a Call to Action (CTA), include it as the final section.
If they do not, do not create or imply one.

The format must be valid HTML using <h1>, <h2>, <ul>, <li>, <p>, and <strong> for emphasis.
Do not use Markdown (# or **).

Tone: warm, intelligent, persuasive, and human — like a marketing professor mentoring entrepreneurs.
Do not use dashes or hyphens; replace them with commas.
Target audience: entrepreneurs, creators, and indie business owners.
Goal: create lead magnets that teach, inspire, and convert.
`
        },
        {
          role: "user",
          content: `
${userIdea}

Write approximately ${totalWords} words of engaging, conversion-focused content.
Break it into ${safePages} sections, each around ${wordsPerPage} words.
Insert "<!--PAGEBREAK-->" between sections.

Each section must contain:
• A strong headline
• Relatable examples
• Actionable tips or frameworks
• Value-driven storytelling

Mode: ${mode}
`,
        },
      ],
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("GPT error:", error);
    throw error;
  }
}



export async function generateLearningDoc(topic, options = {}) {
  const {
    totalWords = 5000,
    safePages = 5,
    wordsPerPage = 500,
  } = options;

  try {
    const response = await client.chat.completions.create({
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

    return response.choices[0].message.content;
  } catch (error) {
    console.error("GPT error:", error);
    throw error;
  }
}



