const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeThread(messages) {
  const transcript = messages
    .map((m) => `${m.author}: ${m.content}`)
    .join("\n");

  const userPrompt = `
Write an audit report based on the following obervations and comments. Make it as detailed as possible. The summary will serve as the official report to be read by the audited employee, so use plain and easily understandable English that can be understood by high school students. No high fallutin words. Maintain a clear tone and write in the third-person perspective. Do not make the tone neutral—if there are positive or negative comments in the logs, present them as positive or negative accordingly. Do not exceed 1024 characters. Do not include any title.

Audit logs:
${transcript}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 400, // Adjust for your preferred output length
    messages: [{ role: "user", content: userPrompt }],
  });

  let text = (completion.choices[0].message.content || "").trim();
  if (text.length > 1024) text = text.slice(0, 1021) + "…"; // keep within Discord embed limits
  return text;
}

module.exports = { analyzeThread };
