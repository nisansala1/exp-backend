const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});



const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./database.db");
const PORT = process.env.PORT || 5000;
// Create table
db.run(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    amount REAL
  )
`);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// Get all expenses
app.get("/expenses", (req, res) => {
  db.all("SELECT * FROM expenses", [], (err, rows) => {
    res.json(rows);
  });
});

// Add expense
app.post("/expenses", async (req, res) => {
  const { title, amount } = req.body;

  const prompt = `
Categorize this expense and give short advice.
Expense: ${title}
Amount: ${amount}

Return JSON:
{
  "category": "",
  "insight": ""
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    });

    // Safe JSON parsing
    let aiResult = { category: "Other", insight: "No insight available" };
    try {
      aiResult = JSON.parse(response.choices[0].message.content);
    } catch (err) {
      console.error("AI JSON parse failed:", response.choices[0].message.content);
    }

    db.run(
      "INSERT INTO expenses (title, amount, category, insight) VALUES (?, ?, ?, ?)",
      [title, amount, aiResult.category, aiResult.insight],
      () => res.sendStatus(201)
    );
  } catch (err) {
    console.error("OpenAI request failed:", err);
    res.status(500).send("AI call failed");
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
