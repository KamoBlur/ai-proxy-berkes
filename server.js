import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI proxy fut – Gemini 2.0 Flash (free) elsődleges, magyar nyelven!");
});

// Modellek sorrendben (1: Gemini, 2: Gemma, 3: Mixtral)
const models = [
  "google/gemini-2.0-flash-exp:free",   // gyors, ingyenes, 2025-ös
  "google/gemma-2-9b-it:free",          // pontos, free backup
  "mistralai/mixtral-8x7b-instruct"     // fizetős tartalék
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
          "HTTP-Referer": "https://ai-proxy-berkes.onrender.com", // fontos!
          "X-Title": "AI Proxy Berkes",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "Te egy **magyar nyelvű**, tapasztalt könyvelő és adótanácsadó vagy. " +
                "Minden válaszodat **magyar nyelven** add meg, hivatalos, udvarias stílusban. " +
                "Csak könyveléssel, adózással, járulékokkal, NAV-bevallásokkal és vállalkozások pénzügyeivel kapcsolatos kérdésekre válaszolj. " +
                "Ha a kérdés nem ebbe a témába tartozik, mondd azt, hogy: 'Sajnálom, csak könyvelési kérdésekben tudok segíteni.'"
            },
            { role: "user", content: question },
          ],
          max_tokens: 500,
        }),
      });

      const data = await response.json();

      // Ha sikeres válasz érkezett:
      if (response.ok && data?.choices?.[0]?.message?.content) {
        reply = data.choices[0].message.content;
        console.log(`${model} sikeresen válaszolt.`);
        break;
      } else {
        const err = data.error?.message || JSON.stringify(data);
        console.warn(`${model} hiba: ${err}`);
      }
    } catch (error) {
      console.error(`${model} API-hiba:`, error.message);
    }
  }

  if (!reply) {
    reply = "Egyik modell sem adott választ. Lehetséges, hogy az ingyenes modellek túlterheltek. Kérlek, próbáld meg később.";
  }

  res.json({ reply });
});

// Port beállítása Render-hez
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`AI proxy fut a ${PORT} porton – magyar Gemini mód aktív!`));
