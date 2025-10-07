import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI proxy fut – Gemma 2.0 + Gemini 2.0 Flash, tegeződő magyar stílussal!");
});

// Modellprioritás: Gemma → Gemini → Mixtral fallback
const MODELS = [
  "google/gemma-2-9b-it:free",
  "google/gemini-2.0-flash-exp:free",
  "mistralai/mixtral-8x7b-instruct"
];

const SYSTEM_PROMPT =
  "Te egy tapasztalt magyar könyvelő és adótanácsadó vagy. " +
  "Mindig természetes, barátságos, **tegeződő stílusban** fogalmazz, mintha egy ügyfeleddel beszélnél. " +
  "Kerüld a gépies vagy fordításízű mondatokat, és válaszolj közvetlenül, emberien. " +
  "Írj úgy, mintha egy magyar könyvelő magyarázná el a választ egyszerűen, érthetően és pontosan. " +
  "Csak könyveléssel, adózással, járulékokkal, NAV-bevallásokkal és vállalkozások pénzügyeivel kapcsolatos kérdésekre válaszolj. " +
  "Ha a kérdés nem ide tartozik, mondd ezt: 'Sajnálom, de csak könyvelési és adózási témákban tudok segíteni.'";

// === Fő lekérdező függvény ===
async function askModel(question, model) {
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: question },
        ],
        max_tokens: 600,
      }),
      timeout: 15000 // 15 másodperc után megszakítjuk
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`${model} HTTP-hiba: ${response.status}`, text);
      return null;
    }

    const data = await response.json();
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    console.warn(`${model} üres válasz:`, data);
    return null;

  } catch (err) {
    if (err.type === "request-timeout") {
      console.error(`${model} időtúllépés:`, err.message);
    } else {
      console.error(`${model} hálózati hiba:`, err.message);
    }
    return null;
  }
}

// === Fő API végpont ===
app.get("/api", async (req, res) => {
  const question = req.query.q;
  if (!question) {
    return res.json({ reply: "Kérlek, írj be egy kérdést!" });
  }

  let reply = null;

  for (const model of MODELS) {
    console.log(`Próbálkozás a modellel: ${model}`);

    reply = await askModel(question, model);

    // újrapróbálás 1×, ha az első sikertelen volt
    if (!reply) {
      console.log(`Első próbálkozás sikertelen, újra ${model}...`);
      await new Promise(r => setTimeout(r, 3000));
      reply = await askModel(question, model);
    }

    if (reply) {
      console.log(`${model} sikeresen válaszolt.`);
      break;
    } else {
      console.warn(`${model} nem adott választ, próbálom a következőt...`);
    }
  }

  if (!reply) {
    console.error("Egyik modell sem válaszolt, felhasználónak hibaüzenet küldése.");
    reply =
      "Sajnálom, jelenleg nem tudtam elérni az AI szervert vagy mindhárom modell korlátozott. " +
      "Kérlek, próbáld meg pár perc múlva újra. Ha a hiba ismétlődik, ellenőrizd az OpenRouter API-kulcsot.";
  }

  res.json({ reply });
});

// === Indítás ===
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`AI proxy fut a ${PORT} porton – megbízható magyar könyvelői asszisztens!`)
);
