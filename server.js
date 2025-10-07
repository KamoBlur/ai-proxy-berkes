import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI proxy fut – magyar adózási asszisztens (Gemma/Gemini + valós NAV-adatok)");
});

// 🔹 AI modellek
const MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "google/gemma-2-9b-it:free",
  "mistralai/mixtral-8x7b-instruct"
];

// 🔹 Alap rendszerprompt (szakmai, de természetes stílusban)
const SYSTEM_PROMPT = `
Te egy tapasztalt magyar könyvelő, adótanácsadó és pénzügyi szakértő vagy.
Feladatod, hogy mindig **a legfrissebb, érvényben lévő magyar adójogszabályok** alapján válaszolj.
Elsősorban a **NAV (nav.gov.hu)**, a **kormany.hu** és a **net.jogtar.hu** információit használd hiteles forrásként.

Fontos szabályok:
- Ha kaptál hivatalos vagy friss forrásból származó szöveget (például NAV közleményből), **mindig azt használd elsődleges forrásnak**.
- Ha a kapott információ és a régi tudásod ellentmond, **a friss hivatalos adatot tekintsd helyesnek**.
- Ha valami bizonytalan, jelezd udvariasan: „A NAV legutóbbi tájékoztatása szerint...”, de soha ne állíts biztosan régi vagy megszűnt adatot.
- A válasz legyen tömör, magyar nyelvű, közérthető és pontos.
- Ha a kérdés nem adózási témájú, válaszolj így: „Sajnálom, de csak könyvelési és adózási témákban tudok segíteni.”
`;


// 🔍 NAV / Kormány / Jogtár keresés (DuckDuckGo API-n keresztül)
async function getTaxContext(query) {
  try {
    const sources = [
      "site:nav.gov.hu",
      "site:kormany.hu",
      "site:net.jogtar.hu"
    ];

    let allResults = "";

    for (const source of sources) {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(source + " " + query)}&format=json`;
      const res = await fetch(url);
      const data = await res.json();
    
      if (data?.AbstractText) {
        allResults += "Forrás (összefoglaló): " + data.AbstractText + "\n";
      } else if (data?.Heading && data?.RelatedTopics?.length) {
        allResults += "Kapcsolódó: " + data.RelatedTopics[0].Text + "\n";
      }
    
      // 🔹 további releváns találatok (ha több is van)
      if (data?.RelatedTopics?.length > 1) {
        allResults += data.RelatedTopics.slice(1, 3)
          .map(t => t.Text)
          .join("\n");
      }
    }

    return allResults.trim();
  } catch (e) {
    console.warn("⚠️ NAV keresés sikertelen:", e.message);
    return "";
  }
}

// 🔹 AI hívás
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
        max_tokens: 700,
      }),
    });

    const text = await response.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.warn(`⚠️ JSON parse hiba (${model}):`, text.slice(0, 150));
      throw new Error("Érvénytelen válasz az OpenRouter-től");
    }

    if (response.ok && data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    } else {
      throw new Error(data.error?.message || "Ismeretlen hiba");
    }
  } catch (err) {
    console.error(`❌ ${model} hiba:`, err.message);
    return null;
  }
}

// 🔹 API végpont
app.get("/api", async (req, res) => {
  const question = req.query.q;
  if (!question) return res.json({ reply: "Kérlek, írj be egy kérdést!" });

  // ⏰ Aktuális dátum és nap neve
  const dateObj = new Date();
  const dayNames = ["vasárnap", "hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat"];
  const currentDayName = dayNames[dateObj.getDay()];
  const currentDate = dateObj.toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" });

  // 📊 Ellenőrizzük, hogy adózási / jogi témáról van-e szó
  const isTaxTopic = /(adó|járulék|kata|szja|bt|kft|vállalkozó|nav|bevallás|szabály|rendelet|törvény|mentesség)/i.test(question);

  let externalContext = "";
  if (isTaxTopic) {
    console.log("🔍 Adózási vagy jogi téma észlelve, friss források lekérése...");
    externalContext = await getTaxContext(question);
  }

  // 📦 A modellnek küldött teljes prompt
  const contextualQuestion = `
  A mai dátum: ${currentDate}, ${currentDayName}.
  ${externalContext ? `Friss információk hivatalos forrásokból:\n${externalContext}\n\n` : ""}
  Kérdés: ${question}
  `;

  // 🚀 AI modellek futtatása
  let reply = null;
  for (const model of MODELS) {
    console.log(`🔄 Próbálkozás a modellel: ${model}`);
    reply = await askModel(contextualQuestion, model);
    if (reply) {
      console.log(`✅ ${model} sikeresen válaszolt.`);
      break;
    } else {
      console.log(`⚠️ ${model} nem válaszolt, következő modell...`);
    }
  }

  if (!reply) {
    reply = "Sajnálom, most nem tudtam friss információt adni. Kérlek, próbáld meg pár perc múlva újra. 📘";
  }

  res.json({ reply });
});

// 🔹 Szerver indítása
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 AI proxy fut a ${PORT} porton – valós NAV és Jogtár lekérdezésekkel!`);
});
