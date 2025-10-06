import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI proxy is running!");
});

// API végpont a PHP számára
app.get("/api", async (req, res) => {
  const question = req.query.q;

  if (!question) {
    return res.json({ reply: "Kérlek, írj be egy kérdést!" });
  }

  try {
    // OpenRouter API hívás
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemma-2-9b-it", // gemma modell OpenRouteren
        messages: [
          { role: "system", content: "Te egy magyar könyvelési asszisztens vagy. Adj pontos, közérthető választ a könyvelési és vállalkozási kérdésekre." },
          { role: "user", content: question }
        ]
      })
    });

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      "Sajnálom, nem találtam választ a kérdésedre.";

    res.json({ reply });
  } catch (error) {
    console.error("AI proxy hiba:", error);
    res.json({ reply: "A szerver nem tudta lekérni a választ." });
  }
});

// Port beállítása (Render automatikusan adja)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AI proxy fut a ${PORT} porton`));
