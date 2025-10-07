import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI proxy fut – Gemma 2.0 + Gemini 2.0 Flash, magyar szakmai stílussal!");
});

// Modellek prioritás szerint: Gemma → Gemini → Mixtral
const MODELS = [
  "google/gemma-2-9b-it:free",
  "google/gemini-2.0-flash-exp:free",
  "mistralai/mixtral-8x7b-instruct"
];

// Szakmai, semleges hangnem
const SYSTEM_PROMPT =
  "Te egy tapasztalt magyar könyvelő és adótanácsadó vagy. " +
  "Mindig természetes, szakmai és közérthető stílusban válaszolj. " +
  "Kerüld a felesleges körmondatokat és a gépies szóhasználatot. " +
  "Válaszaid legyenek pontosak, lényegre törőek, és ha lehet, hivatkozz a magyar jogi vagy adózási gyakorlatra. " +
  "Csak könyveléssel, adózással, járulékokkal, NAV-bevallásokkal és vállalkozások pénzügyeivel kapcsolatos kérdésekre válaszolj. " +
  "Ha a kérdés nem ide tartozik, mondd azt: 'Sajnálom, de csak könyvelési és adózási témákban tudok segíteni.'";

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
      timeout: 15000
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
    console.error(`${model} hálózati hiba:`, err.message);
    return null;
  }
}

app.get("/api", async (req, res) => {
  const question = req.query.q;
  if (!question) {
    return res.json({ reply: "Kérlek, írj be egy kérdést!" });
  }

  let reply = null;

  for (const model of MODELS) {
    console.log(`Próbálkozás a modellel: ${model}`);
    reply = await askModel(question, model);

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
    console.error("Egyik modell sem válaszolt.");
    reply =
      "Sajnálom, jelenleg nem tudtam elérni az AI szervert vagy mindhárom modell korlátozott. " +
      "Kérlek, próbálja meg néhány perc múlva újra.";
  }

  res.json({ reply });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`AI proxy fut a ${PORT} porton – szakmai magyar könyvelői stílussal!`)
);
