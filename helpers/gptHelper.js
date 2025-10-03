import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askGPT(prompt) {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini", // fast & cheaper, or "gpt-4.1" for more reasoning
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("GPT error:", error);
    throw error;
  }
}