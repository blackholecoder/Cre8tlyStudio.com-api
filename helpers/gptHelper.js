import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askGPT(userIdea) {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
You are Cre8tlyStudio AI. 
Your job is to turn a customer's idea into a complete, polished lead magnet. 
Output must be clear, engaging, and professional. 
Always structure it with sections: Headline, Hook, Value Points, and Call-to-Action. 
The format must be valid HTML using <h1>, <h2>, <ul>, <li>, <p>, and <strong> for emphasis. 
Do NOT use Markdown (no **bold**, no # headers). 
Keep the tone persuasive and aligned with modern digital marketing. 
Target audience = entrepreneurs, coaches, content creators, and indie businesses.
          `,
        },
        { role: "user", content: `User Idea: ${userIdea}` },
      ],
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("GPT error:", error);
    throw error;
  }
}
