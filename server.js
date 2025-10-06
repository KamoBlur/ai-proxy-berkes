import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Proxy endpoint az AI-hoz
app.post("/ask", async (req, res) => {
  const question = req.body.question || "";
  if (!question.trim()) {
    return res.json({ response: "Kérlek, írj be egy kérdést!" });
  }

  const prompt = `Te egy magyar könyvelési asszisztens vagy.
Csak könyveléssel, adózással, vállalkozással, ÁFA-val, NAV-val kapcsolatos kérdésekre válaszolj.
Ha más témát kapsz, válaszolj így: "Sajnálom, ebben a témában nem tudok segíteni."

Kérdés: ${question}`;

  try {
    const hfRes = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    const data = await hfRes.json();
    let text = data[0]?.generated_text || "Sajnálom, nem találtam választ.";
    res.json({ response: text });
  } catch (err) {
    res.json({ response: "⚠️ Hiba történt az AI lekérése közben." });
  }
});

app.get("/", (req, res) => res.send("AI proxy is running! 🚀"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
