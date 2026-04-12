// rag/pipeline.js — RAG Pipeline: Ingest → Embed → Store → Retrieve → Generate
// Stack: Gemini (embeddings + LLM) + Pinecone (vector DB)

// NOTE: dotenv is loaded by server.js before this module is used.
// Do NOT call dotenv.config() here — it would use the wrong path on Windows.
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Pinecone } = require("@pinecone-database/pinecone");
const pdfParse = require("pdf-parse");
const csv = require("csv-parse/sync");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// ── Lazy clients (initialized on first use so .env is already loaded) ─────────
let _genAI = null;
let _pc = null;

function getGenAI() {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set in .env");
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

function getPinecone() {
  if (!_pc) {
    if (!process.env.PINECONE_API_KEY) throw new Error("PINECONE_API_KEY is not set in .env");
    _pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return _pc;
}

// Strip accidental full URLs — only the short index name is valid (e.g. "railway-kiosk")
const _rawIndex = process.env.PINECONE_INDEX || "railway-kiosk";
const INDEX_NAME = _rawIndex.replace(/^https?:\/\//, "").split(".")[0].slice(0, 44);
const EMBED_MODEL = "gemini-embedding-001"; // 3072 dimensions
const GEN_MODEL = "gemini-2.5-flash";
const CHUNK_SIZE = 500;   // characters per chunk
const CHUNK_OVERLAP = 80; // overlap between chunks

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Split text into overlapping chunks */
function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  let start = 0;
  const clean = text.replace(/\s+/g, " ").trim();
  while (start < clean.length) {
    const end = Math.min(start + size, clean.length);
    chunks.push(clean.slice(start, end).trim());
    start += size - overlap;
  }
  return chunks.filter((c) => c.length > 30);
}

/** Generate embedding vector for a single text using Gemini */
async function embedText(text) {
  const model = getGenAI().getGenerativeModel({ model: EMBED_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/** Ensure Pinecone index exists with correct dimensions (3072 for text-embedding-004) */
async function ensureIndex() {
  const existing = await getPinecone().listIndexes();
  const names = (existing.indexes || []).map((i) => i.name);
  if (!names.includes(INDEX_NAME)) {
    console.log(`[Pinecone] Creating index: ${INDEX_NAME} (dimension: 3072)`);
    await getPinecone().createIndex({
      name: INDEX_NAME,
      dimension: 3072,
      metric: "cosine",
      spec: { serverless: { cloud: "aws", region: "us-east-1" } },
    });
    // Wait for index to be ready
    let ready = false;
    while (!ready) {
      await new Promise((r) => setTimeout(r, 3000));
      const desc = await getPinecone().describeIndex(INDEX_NAME);
      ready = desc.status?.ready;
      console.log(`[Pinecone] Index status: ${desc.status?.state}`);
    }
    console.log("[Pinecone] Index ready.");
  }
  return getPinecone().index(INDEX_NAME);
}

// ── INGESTION ─────────────────────────────────────────────────────────────────

/** Parse a PDF file and return raw text */
async function parsePDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

/** Parse a CSV file and return structured text */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const records = csv.parse(content, { columns: true, skip_empty_lines: true });
  return records
    .map((row) => Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(" | "))
    .join("\n");
}

/** Parse a JSON file and return structured text */
function parseJSON(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const flatten = (obj, prefix = "") =>
    Object.entries(obj)
      .map(([k, v]) =>
        typeof v === "object" && v !== null
          ? flatten(v, `${prefix}${k}.`)
          : `${prefix}${k}: ${v}`
      )
      .flat();
  if (Array.isArray(data)) {
    return data.map((item) => flatten(item).join(" | ")).join("\n");
  }
  return flatten(data).join(" | ");
}

/** Parse a plain text file */
function parseTXT(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

/** Fetch live train data from IRCTC-compatible API */
async function fetchLiveAPI(endpoint, params = {}) {
  try {
    const response = await axios.get(endpoint, {
      params,
      headers: { Authorization: `Bearer ${process.env.IRCTC_API_KEY || ""}` },
      timeout: 10000,
    });
    const data = response.data;
    if (Array.isArray(data)) {
      return data.map((item) => JSON.stringify(item)).join("\n");
    }
    return JSON.stringify(data, null, 2);
  } catch (err) {
    console.error(`[API] Fetch failed: ${err.message}`);
    return null;
  }
}

/**
 * MAIN INGEST FUNCTION
 * Accepts file paths (PDF/CSV/JSON/TXT) or API config objects.
 * Chunks → Embeds → Upserts to Pinecone.
 *
 * @param {Array} sources - Array of { type, path/url, namespace, metadata }
 * @returns {{ ingested: number, chunks: number }}
 */
async function ingestDocuments(sources) {
  const index = await ensureIndex();
  let totalChunks = 0;
  let totalDocs = 0;

  for (const source of sources) {
    console.log(`\n[Ingest] Processing: ${source.type} | ${source.path || source.url}`);
    let rawText = "";

    try {
      switch (source.type) {
        case "pdf":
          rawText = await parsePDF(source.path);
          break;
        case "csv":
          rawText = parseCSV(source.path);
          break;
        case "json":
          rawText = parseJSON(source.path);
          break;
        case "txt":
          rawText = parseTXT(source.path);
          break;
        case "api":
          rawText = await fetchLiveAPI(source.url, source.params);
          if (!rawText) continue;
          break;
        case "text":
          rawText = source.content;
          break;
        default:
          console.warn(`[Ingest] Unknown type: ${source.type}`);
          continue;
      }

      const chunks = chunkText(rawText);
      console.log(`[Ingest] → ${chunks.length} chunks from ${source.path || source.url || "inline"}`);

      // Embed + upsert in batches of 100
      const BATCH_SIZE = 100;
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const vectors = await Promise.all(
          batch.map(async (chunk, j) => {
            const embedding = await embedText(chunk);
            const id = `${source.namespace || "default"}_${Date.now()}_${i + j}`;
            return {
              id,
              values: embedding,
              metadata: {
                text: chunk,
                source: source.path || source.url || "inline",
                namespace: source.namespace || "default",
                type: source.type,
                ...((source.metadata) || {}),
              },
            };
          })
        );
        await index.upsert(vectors);
        console.log(`[Ingest] Upserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${vectors.length} vectors)`);
        totalChunks += vectors.length;
      }
      totalDocs++;
    } catch (err) {
      console.error(`[Ingest] Error processing ${source.path || source.url}: ${err.message}`);
    }
  }

  console.log(`\n[Ingest] Done: ${totalDocs} sources, ${totalChunks} total chunks`);
  return { ingested: totalDocs, chunks: totalChunks };
}

// ── RETRIEVAL ─────────────────────────────────────────────────────────────────

/**
 * Vector search: embed the query, find top-k similar chunks from Pinecone.
 * @param {string} query - User's question
 * @param {number} topK - Number of results
 * @param {string} namespace - Filter to specific namespace
 * @returns {Array} - Array of { text, score, source }
 */
async function retrieveContext(query, topK = 5, namespace = null) {
  const index = await ensureIndex();
  const queryEmbedding = await embedText(query);

  const searchParams = {
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  };
  if (namespace) searchParams.filter = { namespace: { $eq: namespace } };

  const results = await index.query(searchParams);
  return (results.matches || []).map((m) => ({
    text: m.metadata?.text || "",
    score: m.score,
    source: m.metadata?.source || "",
    namespace: m.metadata?.namespace || "",
  }));
}

// ── GENERATION (RAG) ──────────────────────────────────────────────────────────

const LANG_NAMES = { "en-IN": "English", "hi-IN": "Hindi", "te-IN": "Telugu" };

/**
 * Full RAG pipeline: query → retrieve → generate with Gemini.
 * @param {string} userQuery - User's question
 * @param {string} language - 'en-IN' | 'hi-IN' | 'te-IN'
 * @param {Object} intentContext - Structured intent data from existing intent.js
 * @returns {string} - Final LLM response
 */
async function ragQuery(userQuery, language = "en-IN", intentContext = null) {
  const langName = LANG_NAMES[language] || "English";

  // Step 1: Retrieve relevant context from Pinecone
  console.log(`[RAG] Retrieving context for: "${userQuery}"`);
  const contextDocs = await retrieveContext(userQuery, 5);

  const hasContext = contextDocs.length > 0 && contextDocs[0].score > 0.5;
  const contextText = hasContext
    ? contextDocs
        .map((d, i) => `[Source ${i + 1} (relevance: ${(d.score * 100).toFixed(0)}%)]\n${d.text}`)
        .join("\n\n")
    : "No relevant documents found in knowledge base.";

  console.log(`[RAG] Retrieved ${contextDocs.length} chunks (best score: ${contextDocs[0]?.score?.toFixed(3) || 0})`);

  // Step 2: Build prompt with retrieved context + intent data
  const intentSection = intentContext
    ? `\nREAL-TIME STATION DATA (live):\n${JSON.stringify(intentContext, null, 2)}\n`
    : "";

  const systemPrompt = `You are a helpful Indian railway station voice assistant (Railway Kiosk).
You answer passenger queries about trains, timings, platforms, delays, PNR, and station facilities.

RETRIEVED KNOWLEDGE BASE CONTEXT:
${contextText}
${intentSection}
RESPONSE RULES:
1. Respond ONLY in ${langName}. Never mix languages.
2. Use the retrieved context above as your PRIMARY source of truth.
3. If context is insufficient, use the real-time station data.
4. Keep answers SHORT (1-3 sentences) — this is a voice assistant.
5. Always mention train name AND number when discussing trains.
6. Always mention platform number when relevant.
7. If you don't know, say so clearly in ${langName}.
8. Do NOT use bullet points or lists — speak in natural sentences.
9. For Hindi/Telugu: spell out all numbers as words.`;

  const userPrompt = `Passenger question: "${userQuery}"

Answer in ${langName} based on the retrieved context above.`;

  // Step 3: Generate with Gemini
  try {
    const model = getGenAI().getGenerativeModel({
      model: GEN_MODEL,
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(userPrompt);
    const response = result.response.text().trim();
    console.log(`[RAG] Generated response (${language}): ${response.substring(0, 100)}...`);
    return response;
  } catch (err) {
    console.error("[RAG] Gemini error:", err.message);
    throw new Error(`RAG generation failed: ${err.message}`);
  }
}

/**
 * Delete all vectors in the index (for re-ingestion).
 * Retries on 404 because Pinecone's data plane can take 10-30s to come online
 * after the control plane reports the index as "ready".
 */
async function clearIndex() {
  const index = await ensureIndex();

  // Check if index is actually empty — skip deleteAll if so (avoids 404 on fresh index)
  const stats = await index.describeIndexStats();
  const totalVectors = stats.totalRecordCount ?? stats.totalVectorCount ?? 0;
  if (totalVectors === 0) {
    console.log("[Pinecone] Index is already empty, skipping clear.");
    return;
  }

  const MAX_RETRIES = 6;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await index.deleteAll();
      console.log("[Pinecone] Index cleared.");
      return;
    } catch (err) {
      const is404 = err?.message?.includes("404") || err?.name === "PineconeNotFoundError";
      if (is404 && attempt < MAX_RETRIES) {
        const wait = attempt * 5000; // 5s, 10s, 15s, 20s, 25s
        console.log(`[Pinecone] Data plane not ready yet (attempt ${attempt}/${MAX_RETRIES}), retrying in ${wait / 1000}s...`);
        await new Promise((r) => setTimeout(r, wait));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Get index statistics.
 */
async function getIndexStats() {
  const index = await ensureIndex();
  return await index.describeIndexStats();
}

module.exports = {
  ingestDocuments,
  retrieveContext,
  ragQuery,
  clearIndex,
  getIndexStats,
  ensureIndex,
};
