import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ AI proxy is running with OpenRouter! 🚀");
});

// 🔹 Modellek (prioritási sorrendben)
const models = [
  "google/gemini-flash-1.5",
  "google/gemma-3-27b",
  "mistralai/mixtral-8x7b-instruct"
];

// 🔹 API végpont a PHP vagy front-end számára
app.get("/api", async (req, res) => {
  const question = req.query.q;

  if (!question) {
    return res.json({ reply: "Kérlek, írj be egy kérdést!" });
  }

  let reply = null;

  for (const model of models) {
    console.log(`🔹 Próbálkozás: ${model}`);

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "Te egy magyar könyvelési asszisztens vagy. Röviden, pontosan válaszolj." },
            { role: "user", content: question },
          ],
        }),
      });

      const data = await response.json();

      if (response.ok && data?.choices?.[0]?.message?.content) {
        reply = data.choices[0].message.content;
        console.log(`✅ ${model} sikeresen válaszolt`);
        break;
      } else {
        console.warn(`⚠️ ${model} hiba: ${data.error?.message || "ismeretlen hiba"}`);
      }

    } catch (error) {
      console.error(`⚠️ ${model} API-hiba:`, error.message);
    }
  }

  if (!reply) {
    reply = "❌ Egyik modell sem adott választ. Kérlek, próbáld meg később vagy ellenőrizd az API-kulcsot.";
  }

  res.json({ reply });
});

// 🔹 Port beállítása (Render automatikusan adja)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 AI proxy fut a ${PORT} porton, fallback aktív!`));
