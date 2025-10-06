import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ AI proxy is running with OpenRouter (Gemini + Gemma fallback)! 🚀");
});

async function askOpenRouter(model, question) {
  const start = Date.now();
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Te egy magyar könyvelési asszisztens vagy. Röviden, pontosan, szakmai stílusban válaszolj magyarul.",
        },
        { role: "user", content: question },
      ],
    }),
  });

  const data = await response.json();
  const duration = ((Date.now() - start) / 1000).toFixed(2);

  if (!response.ok || !data?.choices?.[0]?.message?.content) {
    throw new Error(`${data?.error?.message || "ismeretlen hiba"}`);
  }

  return { reply: data.choices[0].message.content.trim(), duration };
}

app.get("/api", async (req, res) => {
  const question = req.query.q;
  if (!question) return res.json({ reply: "Kérlek, írj be egy kérdést!" });

  const models = [
  "google/gemini-flash-1.5",
  "google/gemma-3-27b",
  "mistralai/mixtral-8x7b-instruct"
];


  for (const model of models) {
    try {
      console.log(`🔹 Próbálkozás: ${model.name} (${model.id})`);
      const { reply, duration } = await askOpenRouter(model.id, question);
      console.log(`✅ ${model.name} válaszolt ${duration} mp alatt`);
      return res.json({ reply, model: model.name, time: `${duration}s` });
    } catch (error) {
      console.warn(`⚠️ ${model.name} hiba: ${error.message}`);
    }
  }

  res.json({
    reply: "❌ Egyik modell sem adott választ. Kérlek, próbáld meg később vagy ellenőrizd az API-kulcsot.",
    model: "N/A",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 AI proxy fut a ${PORT} porton, fallback aktív!`)
);

