import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI proxy fut – stabil magyar Gemma 2.0 (free) modell!");
});

// 💡 Csak a Gemma modell marad aktív, mert stabil és magyarítható
const models = [
  "google/gemma-2-9b-it:free"
];

app.get("/api", async (req, res) => {
  const question = req.query.q;
  if (!question) return res.json({ reply: "Kérlek, írj be egy kérdést!" });

  let reply = null;

  for (const model of models) {
    console.log(`🔄 Próbálkozás ezzel a modellel: ${model}`);
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://ai-proxy-berkes.onrender.com",
          "X-Title": "AI Proxy Berkes",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert Hungarian accountant and tax advisor. " +
                "Always respond **in Hungarian language**, using a professional but friendly tone. " +
                "Te egy tapasztalt magyar könyvelő és adótanácsadó vagy. " +
                "Minden válaszodat magyar nyelven add meg, hivatalos, udvarias stílusban. " +
                "Csak könyveléssel, adózással, járulékokkal, NAV-bevallásokkal és vállalkozások pénzügyeivel kapcsolatos kérdésekre válaszolj. " +
                "Ha a kérdés nem ebbe a témába tartozik, mondd azt, hogy: 'Sajnálom, csak könyvelési kérdésekben tudok segíteni.'"
            },
            { role: "user", content: question },
          ],
          max_tokens: 500,
        }),
      });

      const data = await response.json();

      if (response.ok && data?.choices?.[0]?.message?.content) {
        reply = data.choices[0].message.content;
        console.log(`✅ ${model} sikeresen válaszolt.`);
        break;
      } else {
        console.warn(`⚠️ ${model} hiba: ${data.error?.message || "ismeretlen hiba"}`);
      }
    } catch (error) {
      console.error(`❌ ${model} API-hiba:`, error.message);
    }
  }

  if (!reply) {
    reply = "A modell jelenleg nem elérhető. Kérlek, próbáld újra néhány perc múlva.";
  }

  res.json({ reply });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 AI proxy fut a ${PORT} porton – stabil magyar Gemma mód aktív!`));
