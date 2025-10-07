import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI proxy fut – stabil magyar Gemma 2.0 (free) modell, automatikus újrapróbálással!");
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

    // Ellenőrizzük, hogy érvényes JSON választ kaptunk-e
    const text = await response.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.warn("⚠️ JSON parse hiba, nyers válasz:", text.slice(0, 200));
      throw new Error("Érvénytelen JSON válasz az OpenRouter-től");
    }

    if (response.ok && data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    } else {
      const err = data.error?.message || "ismeretlen hiba";
      throw new Error(err);
    }
  } catch (err) {
    console.error("❌ Model hiba:", err.message);
    return null;
  }
}

app.get("/api", async (req, res) => {
  const question = req.query.q;
  if (!question) return res.json({ reply: "Kérlek, írj be egy kérdést!" });

  console.log(`🔄 Próbálkozás ezzel a modellel: ${MODEL}`);

  let reply = await askModel(question);

  // ha elsőre nem sikerül, próbálja újra egyszer
  if (!reply) {
    console.log("⚠️ Első próbálkozás sikertelen, újrapróbálás 3 másodperc múlva...");
    await new Promise(r => setTimeout(r, 3000));
    reply = await askModel(question);
  }

  if (!reply) {
    reply = "Sajnálom, jelenleg nem tudok válaszolni. Kérlek, próbáld meg néhány perc múlva újra.";
  } else {
    console.log(`✅ ${MODEL} sikeresen válaszolt.`);
  }

  res.json({ reply });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 AI proxy fut a ${PORT} porton – stabil Gemma mód aktív!`));
