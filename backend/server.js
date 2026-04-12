// server.js — Railway Voice Bot Backend + RAG Pipeline
// Stack: Node.js + Express + Gemini + Pinecone + Sarvam AI (STT/TTS)

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { speechToText, textToSpeech } = require("./sarvam");
const { GoogleGenerativeAI } = require("@google/generative-ai");


// ── Gemini direct client (lazy) ───────────────────────────────────────────────
let _gemini = null;
function getGemini() {
  if (!_gemini) _gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return _gemini;
}

const LANG_NAMES = { "en-IN": "English", "hi-IN": "Hindi", "te-IN": "Telugu" };

/**
 * Gemini direct query — used when Pinecone is unavailable or not yet set up.
 * Answers railway questions using built-in knowledge + intent context.
 */
async function geminiDirectQuery(userQuery, language = "en-IN", intentContext = null) {
  const langName = LANG_NAMES[language] || "English";
  const model = getGemini().getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `You are a helpful Indian railway station enquiry assistant (kiosk).
Answer passenger questions about trains, platforms, timings, PNR, facilities, and general railway help.
Rules:
1. Respond ONLY in ${langName}.
2. Keep answers SHORT — 1-3 spoken sentences (this is a voice kiosk).
3. Do NOT use bullet points or lists.
4. For "help me" or "what can you do" — briefly explain you can answer questions about train timings, platforms, delays, PNR status, ticket booking, and station facilities.
5. Always be helpful and friendly.`,
  });
  const contextNote = intentContext ? `\nContext: ${JSON.stringify(intentContext)}` : "";
  const result = await model.generateContent(`Passenger query: "${userQuery}"${contextNote}\nAnswer in ${langName}:`);
  return result.response.text().trim();
}
const { detectIntent } = require("./intent");
const {
  ingestDocuments,
  ragQuery,
  clearIndex,
  getIndexStats,
} = require("./rag/pipeline");

const app = express();
const PORT = process.env.PORT || 5000;
// =============================================
// MIDDLEWARE
// =============================================

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// =============================================
// MULTER — Audio + Document uploads
// =============================================

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) =>
    cb(null, `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`),
});
const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/") || /\.(wav|webm|ogg)$/.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"), false);
    }
  },
});

const docStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dataDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}${ext}`);
  },
});
const docUpload = multer({
  storage: docStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".csv", ".json", ".txt"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, CSV, JSON, TXT files are allowed"), false);
    }
  },
});

// =============================================
// HELPERS
// =============================================

function cleanupFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error("[Cleanup] Error:", err.message);
  }
}

/** Pre-process text specifically for TTS out-aloud (converts dense digits to space-separated words depending on language) */
function formatForSpeech(text, lang) {
  if (!text) return text;
  const EN = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const HI = ["शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ"];
  const TE = ["సున్న", "ఒకటి", "రెండు", "మూడు", "నాలుగు", "అయిదు", "ఆరు", "ఏడు", "ఎనిమిది", "తొమ్మిది"];
  const base = lang.startsWith("hi") ? HI : lang.startsWith("te") ? TE : EN;

  return text.replace(/\b\d{4,5}\b/g, match => {
    return match.split("").map(d => base[parseInt(d)]).join(" ");
  });
}

/** Sanitize errors sent to the frontend to prevent leaking absolute paths or verbose native stack traces */
function sanitizeError(msg) {
  if (!msg) return "Unexpected error";
  if (msg.includes("ffmpeg") || msg.includes("Command failed") || msg.includes("Audio conversion failed")) {
    return "Audio processing failed. Please check your microphone format or try again.";
  }
  if (msg.includes("quota") || msg.includes("429")) {
    return "Service API quota exceeded. Please try again later.";
  }
  let clean = msg.replace(/[a-zA-Z]:\\[^\s"']+/g, "[PATH_HIDDEN]");
  clean = clean.replace(/\/home\/[^\s"']+/g, "[PATH_HIDDEN]");
  clean = clean.replace(/\/Users\/[^\s"']+/g, "[PATH_HIDDEN]");
  if (clean.length > 150) {
    clean = clean.substring(0, 150) + "...";
  }
  return clean;
}

/**
 * Hybrid response routing:
 * 1. Known intents with high confidence → static (fast, reliable)
 * 2. Unknown / complex queries → RAG (Pinecone + Gemini)
 * 3. RAG fallback → Sarvam Chat
 */
const STATIC_INTENTS = new Set([
  "greeting", "farewell", "pnr_status", "ticket_info", "no_input",
]);

async function buildHybridResponse(userQuery, intentData, staticText, language) {
  let parsedIntent = null;
  try { parsedIntent = JSON.parse(intentData); } catch (_) { }
  const topic = parsedIntent?.topic || "unknown";

  // Fast path: simple intents that don't need RAG
  if (STATIC_INTENTS.has(topic)) {
    console.log("[Routing] Static intent:", topic);
    return { response: staticText, source: "static" };
  }

  // RAG path: search Pinecone + Gemini generation
  console.log("[Routing] RAG query for intent:", topic);
  try {
    const ragResponse = await ragQuery(userQuery, language, parsedIntent);
    if (ragResponse && ragResponse.trim().length > 5) {
      return { response: ragResponse, source: "rag" };
    }
  } catch (ragErr) {
    console.error("[RAG] Error:", ragErr.message, "-> trying Gemini direct");
  }

  // Gemini direct fallback — no vector search, just smart LLM response
  try {
    const geminiResponse = await geminiDirectQuery(userQuery, language, parsedIntent);
    if (geminiResponse && geminiResponse.trim().length > 5) {
      console.log("[Routing] Gemini direct response used");
      return { response: geminiResponse, source: "gemini" };
    }
  } catch (gemErr) {
    console.error("[Gemini direct] Error:", gemErr.message);
  }

  // Last resort: static text from intent.js
  return { response: staticText, source: "fallback" };
}

// =============================================
// ROUTES — Health
// =============================================

app.get("/health", async (req, res) => {
  try {
    const stats = await getIndexStats();
    res.json({
      status: "ok",
      message: "Railway Voice Bot + RAG Backend",
      timestamp: new Date().toISOString(),
      pinecone: {
        totalVectors: stats.totalRecordCount || 0,
        namespaces: Object.keys(stats.namespaces || {}),
      },
    });
  } catch (err) {
    res.json({
      status: "ok",
      message: "Railway Voice Bot + RAG Backend",
      pinecone: { error: err.message },
    });
  }
});

// =============================================
// ROUTE — /ingest (RAG Document Ingestion)
// =============================================

/**
 * POST /ingest
 * Upload files (PDF, CSV, JSON, TXT) or send raw text/API config.
 *
 * Multipart form:
 *   files[]     - one or more files
 *   namespace   - optional grouping label (e.g. "timetables", "schedules")
 *   clearFirst  - "true" to wipe index before ingesting
 *
 * JSON body (for API/text sources):
 *   { sources: [{ type, url/content, namespace, metadata }], clearFirst }
 */
app.post("/ingest", docUpload.array("files", 20), async (req, res) => {
  console.log("\n--- Ingest Request ---");

  try {
    if (req.body.clearFirst === "true") {
      console.log("[Ingest] Clearing existing index...");
      await clearIndex();
    }

    const sources = [];
    const namespace = req.body.namespace || "railway";

    // Handle uploaded files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase().slice(1);
        sources.push({
          type: ext === "pdf" ? "pdf" : ext,
          path: file.path,
          namespace,
          metadata: { originalName: file.originalname },
        });
        console.log(`[Ingest] File queued: ${file.originalname} (${ext})`);
      }
    }

    // Handle JSON body sources (API endpoints, inline text)
    if (req.body.sources) {
      const bodySources = JSON.parse(req.body.sources || "[]");
      sources.push(...bodySources.map((s) => ({ ...s, namespace: s.namespace || namespace })));
    }

    if (sources.length === 0) {
      return res.status(400).json({ error: "No sources provided. Upload files or send sources array." });
    }

    const result = await ingestDocuments(sources);

    // Cleanup uploaded files after ingestion
    if (req.files) {
      req.files.forEach((f) => cleanupFile(f.path));
    }

    res.json({
      success: true,
      message: `Ingested ${result.ingested} source(s) → ${result.chunks} chunks into Pinecone`,
      ingested: result.ingested,
      chunks: result.chunks,
      namespace,
    });
  } catch (err) {
    console.error("[Ingest] Error:", err);
    if (req.files) req.files.forEach((f) => cleanupFile(f.path));
    res.status(500).json({ error: err.message || "Ingestion failed" });
  }
});

// =============================================
// ROUTE — /query (RAG Text Query)
// =============================================

/**
 * POST /query
 * Body: { query, language, tts }
 * Returns: JSON with response text (+ audio if tts=true)
 */
app.post("/query", async (req, res) => {
  const { query, language = "en-IN", tts = false } = req.body;

  if (!query) return res.status(400).json({ error: "query is required" });

  console.log("\n--- RAG Query ---");
  console.log("[Query]", query, "| Lang:", language);

  try {
    const { intent, response: staticText, intentData } = detectIntent(query, language);
    const { response, source } = await buildHybridResponse(query, intentData, staticText, language);

    console.log(`[Query] Source: ${source} | Intent: ${intent}`);

    if (tts) {
      const audioBuffer = await textToSpeech(formatForSpeech(response, language), language);
      res.set({
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.length,
        "X-Response-Text": encodeURIComponent(response),
        "X-Intent": intent,
        "X-Source": source,
      });
      return res.send(audioBuffer);
    }

    res.json({ response, intent, source, query, language });
  } catch (err) {
    console.error("[Query] Error:", err.message);
    res.status(500).json({ error: sanitizeError(err.message) });
  }
});

// =============================================
// ROUTE — /voice (Voice → STT → RAG → TTS)
// =============================================

app.post("/voice", audioUpload.single("audio"), async (req, res) => {
  const uploadedFilePath = req.file?.path;
  const language = req.body?.language || "en-IN";

  console.log("\n--- Voice Request ---");
  console.log("[Voice] File:", req.file?.filename, "| Lang:", language);

  try {
    // Step 1: STT
    const transcript = await speechToText(uploadedFilePath, language);
    if (!transcript?.trim()) {
      cleanupFile(uploadedFilePath);
      return res.status(400).json({ error: "Could not transcribe audio. Please speak clearly." });
    }
    console.log("[Voice] Transcript:", transcript);

    // Step 2: Intent detection
    const { intent, response: staticText, intentData } = detectIntent(transcript, language);

    // Step 3: Hybrid RAG response
    const { response: responseText, source } = await buildHybridResponse(
      transcript, intentData, staticText, language
    );
    console.log("[Voice] Response source:", source, "| Text:", responseText.substring(0, 80));

    // Step 4: TTS
    const audioBuffer = await textToSpeech(formatForSpeech(responseText, language), language);
    cleanupFile(uploadedFilePath);

    res.set({
      "Content-Type": "audio/wav",
      "Content-Length": audioBuffer.length,
      "X-Transcript": encodeURIComponent(transcript),
      "X-Intent": intent,
      "X-Response-Text": encodeURIComponent(responseText),
      "X-Source": source,
    });
    return res.send(audioBuffer);

  } catch (error) {
    cleanupFile(uploadedFilePath);
    console.error("[Voice] Error:", error.message);
    return res.status(500).json({ error: sanitizeError(error.message) });
  }
});

// =============================================
// ROUTE — /text (Text → RAG → TTS)
// =============================================

app.post("/text", async (req, res) => {
  const { text, language = "en-IN" } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });

  console.log("\n--- Text Request ---");
  console.log("[Text]", text, "| Lang:", language);

  try {
    const { intent, response: staticText, intentData } = detectIntent(text, language);
    const { response: responseText, source } = await buildHybridResponse(
      text, intentData, staticText, language
    );

    console.log(`[Text] Intent: ${intent} | Source: ${source} | Text: ${responseText.substring(0, 80)}`);

    const audioBuffer = await textToSpeech(formatForSpeech(responseText, language), language);
    res.set({
      "Content-Type": "audio/wav",
      "Content-Length": audioBuffer.length,
      "X-Intent": intent,
      "X-Response-Text": encodeURIComponent(responseText),
      "X-Source": source,
    });
    return res.send(audioBuffer);
  } catch (error) {
    console.error("[Text] Error:", error.message);
    return res.status(500).json({ error: sanitizeError(error.message) });
  }
});

// =============================================
// ROUTE — /ingest/stats
// =============================================

app.get("/ingest/stats", async (req, res) => {
  try {
    const stats = await getIndexStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// ROUTE — /ingest/clear
// =============================================

app.delete("/ingest/clear", async (req, res) => {
  try {
    await clearIndex();
    res.json({ success: true, message: "Pinecone index cleared." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// ERROR HANDLING
// =============================================

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large." });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  console.error("[Unhandled]", err);
  res.status(500).json({ error: "Internal server error" });
});

// =============================================
// START
// =============================================

app.listen(PORT, () => {
  
  console.log(`\n🚂 Railway Voice Bot + RAG`);
  console.log(`📡 http://localhost:${PORT}`);
  console.log(`🔍 Health:   GET  /health`);
  console.log(`📥 Ingest:   POST /ingest`);
  console.log(`🔎 Query:    POST /query`);
  console.log(`🎤 Voice:    POST /voice`);
  console.log(`⌨️  Text:     POST /text`);
  console.log(`📊 Stats:    GET  /ingest/stats`);
  console.log(`🗑️  Clear:    DELETE /ingest/clear`);
  console.log(`\n⚠️  Ensure .env has: GEMINI_API_KEY, PINECONE_API_KEY, SARVAM_API_KEY\n`);
});
