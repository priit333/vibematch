export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages } = req.body;
    const userMessage = messages[0].content;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userMessage }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
        }),
      }
    );

    const data = await response.json();
    
    // Log full response for debugging
    console.log("GEMINI RESPONSE:", JSON.stringify(data));
    
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("RAW TEXT:", text);

    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) text = text.slice(start, end + 1);

    console.log("CLEANED TEXT:", text);

    return res.status(200).json({
      content: [{ type: "text", text }],
    });

  } catch (err) {
    console.log("ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
