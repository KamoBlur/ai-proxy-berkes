import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI proxy is running! 🚀");
});

// 🔹 API végpont a PHP számára
app.get("/api", async (req, res) => {
  const question = req.query.q;

  if (!question) {
    return res.json({ reply: "Kérlek, írj be egy kérdést!" });
  }

  try {
    // Itt hívhatod az Ollama API-t, OpenAI-t vagy bármi mást
    // Most példaként az ollama local endpointot hívjuk:
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3:1b",
        prompt: question
      })
    });

    const data = await response.json();
    res.json({ reply: data.response || "Nem találtam választ a kérdésedre." });
  } catch (error) {
    console.error("AI proxy hiba:", error);
    res.json({ reply: "⚠️ A szerver nem tudta lekérni a választ." });
  }
});

// 🔹 Port beállítása (Render automatikusan adja)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ AI proxy fut a ${PORT} porton`));
