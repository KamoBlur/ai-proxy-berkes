import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI proxy running, próbál Gemini 2.0 Flash!");
});

// Csak Gemini modell – de itt kipróbáljuk „text completion” módon
const model = "google/gemini-2.0-flash-exp:free";

app.get("/api", async (req, res) => {
  const question = req.query.q;
  if (!question) return res.json({ reply: "Kérlek, írj be egy kérdést!" });

  try {
    console.log(`Próbál Gemini-vel: ${model}`);
    const response = await fetch("https://openrouter.ai/api/v1/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://ai-proxy-berkes.onrender.com",
        "X-Title": "AI Proxy Berkes",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: question,
        max_tokens: 256,
      }),
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Data:", JSON.stringify(data));

    if (response.ok && data?.choices?.[0]?.text) {
      const reply = data.choices[0].text;
      return res.json({ reply });
    } else {
      console.warn("Gemini hiba:", data.error || data);
    }
  } catch (err) {
    console.error("Gemini API-hiba:", err);
  }

  // Ha nem sikerült, fallback
  console.log("Fallback: Mixtral");
  const fallbackModel = "mistralai/mixtral-8x7b-instruct";
  try {
    const resp2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://ai-proxy-berkes.onrender.com",
        "X-Title": "AI Proxy Berkes",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: fallbackModel,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: question },
        ],
      }),
    });
    const d2 = await resp2.json();
    if (resp2.ok && d2.choices?.[0]?.message?.content) {
      return res.json({ reply: d2.choices[0].message.content });
    } else {
      console.warn("Fallback hiba:", d2);
    }
  } catch (err2) {
    console.error("Fallback API-hiba:", err2);
  }

  return res.json({ reply: "Nem sikerült választ kapni egyik modelltől sem." });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server fut a ${PORT} porton`));
