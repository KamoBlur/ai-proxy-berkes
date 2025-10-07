import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI proxy fut – Gemma 2.0 + Gemini 2.0 Flash, tegeződő magyar stílussal!");
});

// 🔹 Első: Gemma 2.0 (free, stabil, jól beszél magyarul)
// 🔹 Második: Gemini 2.0 Flash (free, gyorsabb fallback)
const MODELS = [
  "google/gemma-2-9b-it:free",
  "google/gemini-2.0-flash-exp:free"
];

// 💬 Közös tegeződő system prompt
const SYSTEM_PROMPT =
  "Te egy tapasztalt magyar könyvelő és adótanácsadó vagy. " +
  "Mindig természetes, barátságos, **tegeződő stílusban** fogalmazz, mintha egy ügyfeleddel beszélnél. " +
  "Kerüld a gépies vagy fordításízű mondatokat, és válaszolj közvetlenül, emberien. " +
  "Írj úgy, mintha egy magyar könyvelő magyarázná el a választ egyszerűen, érthetően és pontosan. " +
  "Csak könyveléssel, adózással, járulékokkal, NAV-bevallásokkal és vállalkozások pénzügyeivel kapcsolatos kérdésekre válaszolj. " +
  "Ha a kérdés nem ide tartozik, mondd ezt: 'Sajnálom, de csak könyvelési és adózási témákban tudok segíteni.'";

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
    });

    const text = await response.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.warn(`⚠️ JSON parse hiba (${model}):`, text.slice(0, 200));
      throw new Error("Érvénytelen JSON válasz az OpenRouter-től");
    }

    if (response.ok && data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    } else {
      const err = data.error?.message || "ismeretlen hiba";
      throw new Error(err);
    }
  } catch (err) {
    console.error(`❌ ${model} hiba:`, err.message);
    return null;
  }
}

app.get("/api", async (req, res) => {
  const question = req.query.q;
  if (!question) return res.json({ reply: "Kérlek, írj be egy kérdést!" });

  let reply = null;

  for (const model of MODELS) {
    console.log(`🔄 Próbálkozás ezzel a modellel: ${model}`);
    reply = await askModel(question, model);

    // újrapróbálás, ha az első kérés hibázik
    if (!reply) {
      console.log(`⚠️ Újrapróbálás 3 másodperc múlva (${model})...`);
      await new Promise(r => setTimeout(r, 3000));
      reply = await askModel(question, model);
    }

    if (reply) {
      console.log(`✅ ${model} sikeresen válaszolt.`);
      break;
    }
  }

  if (!reply) {
    reply = "Sajnálom, egyik modell sem tudott válaszolni most. Próbáld meg egy kicsit később újra. 🙂";
  }

  res.json({ reply });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 AI proxy fut a ${PORT} porton – tegeződő magyar könyvelői stílussal!`)
);
