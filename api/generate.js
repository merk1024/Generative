
const ALLOWED_OBJECTS = {
  "мед книжка": "Дай три совета по защите медицинских персональных данных.",
  "калькулятор": "Придумай интересную математическую задачу и покажи решение.",
  "книга": "Расскажи интересный научный факт и задай вопрос для изучения.",
  "блокнот": "Составь короткий и реалистичный план учёбы на день."
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawObject = req.body?.object;

  if (typeof rawObject !== "string") {
    return res.status(400).json({ error: "Invalid object" });
  }

  const object = rawObject.trim().toLowerCase();
  const instruction = ALLOWED_OBJECTS[object];

  if (!instruction) {
    return res.status(400).json({ error: "Unknown object" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Ты учебный AI-помощник. Ответь по-русски, кратко и понятно. ${instruction}`
            }]
          }],
          generationConfig: {
            maxOutputTokens: 400,
            temperature: 0.7
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", response.status, data);
      return res.status(502).json({
        error: "Gemini request failed"
      });
    }

    const answer = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      return res.status(502).json({
        error: "Gemini returned no text"
      });
    }

    return res.status(200).json({ object, answer });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
