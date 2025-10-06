const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Alap útvonal
app.get("/", (req, res) => {
  res.send("AI proxy is running! 🚀");
});

// API végpont a PHP számára
app.get("/api", async (req, res) => {
  const question = req.query.q;

  if (!question) {
    return res.json({ reply: "Kérlek, írj be egy kérdést!" });
  }

  try {
    // Itt később beilleszthető a tényleges AI hívás (Ollama, OpenAI stb.)
    // Most csak egy dummy válasz megy vissza:
    res.json({ reply: `A kérdésed: "${question}" — de még csak teszt módban futok 🤖` });
  } catch (error) {
    console.error("AI proxy hiba:", error);
    res.json({ reply: "⚠️ A szerver nem tudta lekérni a választ." });
  }
});

// Port beállítása
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ AI proxy fut a ${PORT} porton`));
