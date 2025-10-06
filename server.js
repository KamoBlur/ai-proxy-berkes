import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ AI proxy is running with OpenRouter (Gemini + Fallback)! 🚀");
});

// 🔧 Segédfüggvény az OpenRouter API híváshoz
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
            "Te egy magyar könyvelési asszisztens vagy. Röviden, pontosan és szakmailag helyesen válaszolj magyarul.",
        },
        { role: "user", content: question },
      ],
    }),
  });

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  const data = await response.json();

  if (!response.ok || !data?.choices?.[0]?.message?.content) {
    throw new Error(
      `API-hiba (${model}): ${data?.error?.message || "nincs válasz"}`
    );
  }

  const reply = data.choices[0].message.content.trim();
  return { reply, duration };
}

// 🔹 API végpont
app.get("/api", async (req, res) => {
  const question = req.query.q;
  if (!question) return res.json({ reply: "Kérlek, írj be egy kérdést!" });

  const models = [
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash" },
    { id: "google/gemma-3-12b:free", name: "Gemma 3 12B" },
    { id: "mistralai/mixtral-8x7b-instruct:free", name: "Mixtral 8x7B" },
  ];

  for (const model of models) {
    try {
      console.log(`🔹 Próbálkozás: ${model.name} (${model.id})`);
      const { reply, duration } = await askOpenRouter(model.id, question);

      console.log(
        `✅ ${model.name} sikeresen válaszolt ${duration} másodperc alatt.`
      );

      return res.json({
        reply,
        model: model.name,
        time: `${duration} s`,
      });
    } catch (error) {
      console.warn(`⚠️ ${model.name} hiba: ${error.message}`);
    }
  }

  res.json({
    reply:
      "❌ Egyik modell sem adott választ. Kérlek, próbáld meg később vagy ellenőrizd az API-kulcsot.",
    model: "N/A",
  });
});

// 🔹 Port (Render automatikusan adja)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 AI proxy fut a ${PORT} porton, fallback aktív!`)
);
