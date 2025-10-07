import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI proxy fut – természetes magyar nyelvű Gemma 2.0 (free) modell!");
});

const MODEL = "google/gemma-2-9b-it:free";

async function askModel(question) {
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
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "Te egy tapasztalt magyar könyvelő és adótanácsadó vagy. " +
              "Mindig helyes, természetes magyar nyelven fogalmazz, kerülve a gépies vagy idegen szerkezeteket. " +
              "Írj úgy, mintha egy magyar könyvelő személyesen magyarázná el a választ, közérthetően és szakmailag helyesen. " +
              "Válaszaid legyenek udvariasak, pontosak és szakmaiak. " +
              "Csak könyveléssel, adózással, járulékokkal, NAV-bevallásokkal és vállalkozások pénzügyeivel kapcsolatos kérdésekre válaszolj. " +
              "Ha a kérdés nem ebbe a témába tartozik, mondd azt: 'Sajnálom, csak könyvelési kérdésekben tudok segíteni.'"
          },
          { role: "user", content: question },
        ],
        max_tokens: 500,
      }),
    });

    const text = await response.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.warn("JSON parse hiba, nyers válasz:", text.slice(0, 200));
      throw new Error("Érvénytelen JSON válasz az OpenRouter-től");
    }

    if (response.ok && data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    } else {
      const err = data.error?.message || "ismeretlen hiba";
      throw new Error(err);
    }
  } catch (err) {
    console.error("Model hiba:", err.message);
    return null;
  }
}

app.get("/api", async (req, res) => {
  const question = req.query.q;
  if (!question) return res.json({ reply: "Kérlek, írj be egy kérdést!" });

  console.log(`Próbálkozás ezzel a modellel: ${MODEL}`);

  let reply = await askModel(question);

  // Ha az első próbálkozás sikertelen, újra megpróbálja 3 másodperc múlva
  if (!reply) {
    console.log("Első próbálkozás sikertelen, újrapróbálás 3 másodperc múlva...");
    await new Promise(r => setTimeout(r, 3000));
    reply = await askModel(question);
  }

  if (!reply) {
    reply = "Sajnálom, jelenleg nem tudok válaszolni. Kérlek, próbáld meg néhány perc múlva újra.";
  } else {
    console.log(`${MODEL} sikeresen válaszolt.`);
  }

  res.json({ reply });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`AI proxy fut a ${PORT} porton – természetes magyar Gemma mód aktív!`));
