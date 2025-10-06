import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Főoldal – státusz
app.get("/", (req, res) => {
  res.send("✅ AI proxy running with Gemini 2.0 + Gemma 2 + Mixtral fallback!");
});

// ✅ Modellek sorrendben (1–2: free, 3: paid)
const models = [
  "google/gemini-2.0-flash-exp:free",  // gyors, ingyenes
  "google/gemma-2-9b:free",            // pontosabb, szintén ingyenes
  "mistralai/mixtral-8x7b-instruct"    // fizetős tartalék
];

// ✅ Kérdés fogadása az AI felé
app.get("/api", async (req, res) => {
  const question = req.query.q;
  if (!question) return res.json({ reply: "Kérlek, írj be egy kérdést!" });

  let reply = null;
  const banned = /\b(EKA|KAEV|ÁAR|EKAO|EVA)\b/i;

  for (const model of models) {
    console.log(`🔹 Próbálkozás: ${model}`);

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
          temperature: 0.2, // kevésbé „kreatív”, pontosabb válaszok
          messages: [
            { 
              role: "system", 
              content: `Te egy tapasztalt magyar könyvelő és adótanácsadó vagy.
Csak a magyar adózás, könyvelés, járulékok, NAV-bevallások, és vállalkozások pénzügyei témakörében válaszolj.
Tilos nem létező adónemeket (pl. KAEV, EKA, ÁAR) említened.
Mindig valós magyar jogi és NAV-források alapján válaszolj.
Ha a kérdés nem ebbe a témába tartozik, mondd: "Sajnálom, csak könyvelési kérdésekben tudok segíteni."
A válasz végén mindig javasolj releváns forrást, pl. "Forrás: NAV 99. és 100. információs füzet, 2025."`
            },
            { role: "user", content: question },
          ],
        }),
      });

      const data = await response.json();

      if (response.ok && data?.choices?.[0]?.message?.content) {
        let text = data.choices[0].message.content.trim();

        // 🚫 Ha kitalált adónemeket tartalmaz, újrapróbálkozás
        if (banned.test(text)) {
          console.warn(`⚠️ ${model}: Kitalált adónem detektálva, újrapróbálkozás...`);
          continue;
        }

        reply = text;
        console.log(`✅ ${model} sikeresen válaszolt.`);
        break;
      } else {
        console.warn(`⚠️ ${model} hiba: ${data.error?.message || "ismeretlen hiba"}`);
      }

    } catch (error) {
      console.error(`❌ ${model} API-hiba:`, error.message);
    }
  }

  // Ha egyik modell sem adott érvényes választ
  if (!reply) {
    reply = "❌ Egyik modell sem adott értelmes választ. Kérlek, próbáld meg később, vagy ellenőrizd az API-kulcsot.";
  }

  res.json({ reply });
});

// ✅ Port beállítása (Render automatikusan adja)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 AI proxy fut a ${PORT} porton, fallback aktív!`));
