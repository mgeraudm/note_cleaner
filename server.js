require("dotenv").config();

const express = require("express");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Redis } = require("@upstash/redis");

const app = express();
const port = process.env.PORT || 3000;
const geminiApiKey = process.env.GEMINIKEY || process.env.GOOGLE_API_KEY;
const MAX_NOTE_CHARACTERS = 10000;
const DAILY_NOTE_LIMIT = 3;
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
const USAGE_KEY = "note-transform-usage";

if (!geminiApiKey) {
  console.error("Missing GEMINIKEY in .env file.");
}

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

function extractJsonFromText(text) {
  if (!text) return null;

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  return text.trim();
}

async function getRecentUsageCount() {
  const cutoff = Date.now() - ONE_DAY_IN_MS;
  const timestamps = (await redis.lrange(USAGE_KEY, 0, -1)) || [];
  const validTimestamps = timestamps.filter((timestamp) => Number(timestamp) > cutoff);

  if (validTimestamps.length !== timestamps.length) {
    await redis.del(USAGE_KEY);
    if (validTimestamps.length > 0) {
      await redis.rpush(USAGE_KEY, ...validTimestamps);
    }
  }

  return validTimestamps.length;
}

async function addNoteUsage() {
  await redis.rpush(USAGE_KEY, Date.now().toString());
}

function renderIndex(res, data = {}) {
  const defaults = {
    notes: "",
    result: null,
    error: null,
    limitReached: false,
    usageCount: 0,
  };

  res.render("index", { ...defaults, ...data, DAILY_NOTE_LIMIT, MAX_NOTE_CHARACTERS });
}

app.get("/", async (req, res) => {
  try {
    const usageCount = await getRecentUsageCount();
    renderIndex(res, { usageCount });
  } catch (error) {
    console.error("Error loading usage count:", error);
    renderIndex(res, { error: "Unable to load note quota right now." });
  }
});

app.post("/clean-notes", async (req, res) => {
  const notes = (req.body.notes || "").trim();

  if (!notes) {
    return renderIndex(res, {
      notes: "",
      error: "Please paste or type some notes before submitting.",
    });
  }

  if (notes.length > MAX_NOTE_CHARACTERS) {
    return renderIndex(res, {
      notes,
      error: `Your notes exceed the ${MAX_NOTE_CHARACTERS.toLocaleString()} character limit. Please shorten them and try again.`,
    });
  }

  try {
    const usageCount = await getRecentUsageCount();
    if (usageCount >= DAILY_NOTE_LIMIT) {
      return renderIndex(res, {
        notes,
        limitReached: true,
        usageCount,
      });
    }

    if (!genAI) {
      return renderIndex(res, {
        notes,
        error: "The Gemini API key is missing. Please add GEMINIKEY to your .env file.",
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a professional notes editor and analyst. Clean and organize the notes below. Fix typos, grammatical issues, and formatting problems. Remove repeated or duplicated content. Summarize the notes clearly. Extract and list key names, key dates, and key tasks. Return valid JSON only with this exact structure:
{
  "cleaned_notes": "...",
  "summary": "...",
  "key_names": ["..."],
  "key_dates": ["..."],
  "key_tasks": ["..."]
}
Be careful not to invent facts. If something is unclear, keep it generic. Notes:
${notes}`;

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    const cleanedText = extractJsonFromText(responseText);
    const parsed = JSON.parse(cleanedText);

    await addNoteUsage();

    const updatedUsageCount = await getRecentUsageCount();

    renderIndex(res, {
      notes,
      result: parsed,
      error: null,
      usageCount: updatedUsageCount,
    });
  } catch (error) {
    console.error("Gemini request failed:", error);
    renderIndex(res, {
      notes,
      result: null,
      error: "There was an issue processing your notes. Please try again.",
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
