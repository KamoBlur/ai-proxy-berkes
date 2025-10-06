import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Alap teszt endpoint
app.get("/", (req, res) => {
  res.send("AI proxy is running with OpenRouter (Gemini 2.0 Flash)!");
});

// API végpont a PHP számára
app.get("/api", async (req, res) => {
  const question = req.query.q;

  if (!question) {
    return res.json({ reply: "Kérlek, írj be egy kérdést!" });
  }

  try {
    // Hívás az OpenRouter API-hoz
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
        messages: [
          {
            role: "system",
            content: "Te egy magyar könyvelési asszisztens vagy. Röviden, érthetően és szakmailag pontosan válaszolj magyarul.",
          },
          {
            role: "user",
            content: question,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter API hiba:", data);
      return res.json({
        reply:
          "OpenRouter API hiba történt: " +
          (data.error?.message || "ismeretlen hiba"),
      });
    }

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
app.listen(PORT, () =>
  console.log(`AI proxy fut a ${PORT} porton (Gemini 2.0 Flash)`)
);
