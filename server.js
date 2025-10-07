import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI proxy fut – Gemma 2.0 + Gemini 2.0 Flash fallback, természetes magyar nyelven!");
});

// Első: Gemma 2.0 (free, stabil, magyarul jól beszél)
// Második: Gemini 2.0 Flash (free, ha Gemma túlterhelt)
const MODELS = [
  "google/gemma-2-9b-it:free",
  "google/gemini-2.0-flash-exp:free"
];

// A közös magyar nyelvi system prompt
const SYSTEM_PROMPT =
  "Te egy tapasztalt magyar könyvelő és adótanácsadó vagy. " +
  "Mindig helyes, természetes magyar nyelven fogalmazz, kerülve a gépies vagy idegen szerkezeteket. " +
  "Írj úgy, mintha egy magyar könyvelő személyesen magyarázná el a választ, közérthetően és szakmailag helyesen. " +
  "Válaszaid legyenek udvariasak, pontosak és emberközeliek. " +
  "Csak könyveléssel, adózással, járulékokkal, NAV-bevallásokkal és vállalkozások pénzügyeivel kapcsolatos kérdésekre válaszolj. " +
  "Ha a kérdés nem ebbe a témába tartozik, mondd azt: 'Sajnálom, csak könyvelési kérdésekben tudok segíteni.'";

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
      console.warn(`JSON parse hiba (${model}):`, text.slice(0, 200));
      throw new Error("Érvénytelen JSON válasz az OpenRouter-től");
    }

    if (response.ok && data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    } else {
      const err = data.error?.message || "ismeretlen hiba";
      throw new Error(err);
    }
  } catch (err) {
    console.error(`${model} hiba:`, err.message);
    return null;
  }
}

app.get("/api", async (req, res) => {
  const question = req.query.q;
  if (!question) return res.json({ reply: "Kérlek, írj be egy kérdést!" });

  let reply = null;

  for (const model of MODELS) {
    console.log(`Próbálkozás ezzel a modellel: ${model}`);
    reply = await askModel(question, model);

    // ha nem sikerül, próbálja újra egyszer ugyanazzal a modellel
    if (!reply) {
      console.log(`Újrapróbálás 3 másodperc múlva (${model})...`);
      await new Promise(r => setTimeout(r, 3000));
      reply = await askModel(question, model);
    }

    if (reply) {
      console.log(`${model} sikeresen válaszolt.`);
      break;
    }
  }

  if (!reply) {
    reply = "Sajnálom, egyik modell sem tudott válaszolni. Kérlek, próbáld meg később újra.";
  }

  res.json({ reply });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`AI proxy fut a ${PORT} porton – Gemma + Gemini, magyar nyelvi optimalizálással!`)
);
