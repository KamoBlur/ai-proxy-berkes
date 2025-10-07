import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI proxy running with Gemini 2.0 Flash (free)!");
});

// Modellek — Gemini az elsődleges, Gemma tartalék, Mixtral fizetős backup
const models = [
  "google/gemini-2.0-flash-exp:free",  // ingyenes, gyors, 2025-ös
  "google/gemma-2-9b:free",            // szintén free backup
  "mistralai/mixtral-8x7b-instruct"    // fizetős tartalék, ha minden más leáll
];

app.get("/api", async (req, res) => {
  const question = req.query.q;
  if (!question) return res.json({ reply: "Kérlek, írj be egy kérdést!" });

  let reply = null;

  for (const model of models) {
    console.log(`Próbálkozás ezzel a modellel: ${model}`);
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://ai-proxy-berkes.onrender.com", // saját domain
          "X-Title": "AI Proxy Berkes",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "Te egy tapasztalt magyar könyvelő és adótanácsadó vagy. Csak könyveléssel, adózással, járulékokkal, NAV-bevallásokkal és vállalkozások pénzügyeivel kapcsolatos kérdésekre válaszolj. Válaszaid legyenek pontosak, szakmaiak, és ha lehet, hivatkozz a magyar jogi vagy adózási gyakorlatra. Ha a kérdés nem ebbe a témába tartozik, mondd azt, hogy 'Sajnálom, csak könyvelési kérdésekben tudok segíteni.'",
            },
            { role: "user", content: question },
          ],
        }),
      });

      const data = await response.json();

      if (response.ok && data?.choices?.[0]?.message?.content) {
        reply = data.choices[0].message.content;
        console.log(`${model} sikeresen válaszolt.`);
        break;
      } else {
        console.warn(`⚠ ${model} hiba: ${data.error?.message || "ismeretlen hiba"}`);
      }
    } catch (error) {
      console.error(`${model} API-hiba:`, error.message);
    }
  }

  if (!reply) {
    reply = "Egyik modell sem adott választ. Kérlek, próbáld meg később vagy ellenőrizd az API-kulcsot.";
  }

  res.json({ reply });
});

// Render automatikus PORT kezelése
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`AI proxy fut a ${PORT} porton, Gemini 2.0 Flash (free) aktív!`));
