// sarvam.js - Sarvam AI STT, TTS and Chat Integration — Updated

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const path = require("path");
const { execFile } = require("child_process");

// =============================================
// CONFIGURATION
// =============================================
const SARVAM_API_KEY = process.env.SARVAM_API_KEY || "YOUR_SARVAM_API_KEY_HERE";
const SARVAM_BASE_URL = "https://api.sarvam.ai";

// =============================================
// AUDIO CONVERSION — WebM/OGG → WAV
// =============================================

/**
 * Convert any audio format to 16kHz mono WAV using ffmpeg.
 * The Sarvam STT API requires a specific WAV format.
 */
function convertToWav(inputPath) {
  return new Promise((resolve, reject) => {
    const outputPath = inputPath.replace(/\.[^/.]+$/, "") + "_converted.wav";
    // Force: 16kHz sample rate, mono channel, 16-bit PCM — required by Sarvam STT
    execFile(
      "ffmpeg",
      [
        "-y",
        "-i", inputPath,
        "-ar", "16000",   // 16 kHz — MUST match Sarvam STT requirements
        "-ac", "1",       // mono
        "-sample_fmt", "s16",
        "-f", "wav",
        outputPath,
      ],
      (error, stdout, stderr) => {
        if (error) {
          console.error("[ffmpeg] Error:", stderr);
          reject(new Error(`Audio conversion failed: ${error.message}`));
        } else {
          console.log("[ffmpeg] Converted to WAV:", path.basename(outputPath));
          resolve(outputPath);
        }
      }
    );
  });
}

// =============================================
// SPEECH TO TEXT (STT)
// =============================================

/**
 * Convert audio file to text using Sarvam AI STT API.
 * CRITICAL FIX: The language code must be passed correctly to Sarvam's API.
 * Hindi and Telugu require correct BCP-47 codes: hi-IN, te-IN.
 *
 * @param {string} audioFilePath - Path to the audio file
 * @param {string} language - Language code: 'en-IN' | 'hi-IN' | 'te-IN'
 * @returns {Promise<string>} - Transcribed text
 */
async function speechToText(audioFilePath, language = "en-IN") {
  let convertedPath = null;
  try {
    console.log(`[STT] Input: ${path.basename(audioFilePath)} | Lang: ${language}`);
    convertedPath = await convertToWav(audioFilePath);
    // Always use REST API (reliable for all languages, no SDK dependency)
    return await speechToTextREST(convertedPath, language);
  } finally {
    if (convertedPath && fs.existsSync(convertedPath)) {
      try { fs.unlinkSync(convertedPath); } catch (_) {}
    }
  }
}

// ── REST STT (primary for hi-IN/te-IN, fallback for en-IN) ──────────────────
async function speechToTextREST(convertedWavPath, language) {
  console.log(`[STT:rest] Calling Sarvam REST API | lang: ${language}`);
  const formData = new FormData();
  formData.append("file", fs.createReadStream(convertedWavPath), {
    filename: "audio.wav",
    contentType: "audio/wav",
  });

  // CRITICAL FIX: Pass the exact language code as received.
  // Sarvam supports: en-IN, hi-IN, te-IN among others.
  formData.append("language_code", language);
  formData.append("model", "saarika:v2.5");
  formData.append("with_timestamps", "false");

  const response = await axios.post(
    `${SARVAM_BASE_URL}/speech-to-text`,
    formData,
    {
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
        ...formData.getHeaders(),
      },
      timeout: 30000,
    }
  );

  const transcript = response.data?.transcript || "";
  console.log("[STT:rest] Transcript:", transcript || "(empty)");
  console.log("[STT:rest] Full response:", JSON.stringify(response.data));
  return transcript;
}

// =============================================
// TEXT TO SPEECH (TTS)
// =============================================

// Speaker map per language — use language-appropriate voices for bulbul:v2
const TTS_SPEAKERS = {
  "en-IN": "anushka",
  "hi-IN": "anushka",  // anushka supports Hindi well in bulbul:v2
  "te-IN": "anushka",  // anushka supports Telugu in bulbul:v2
};

/**
 * Convert text to speech using Sarvam AI TTS API.
 * CRITICAL FIX: enable_preprocessing should be true for ALL languages
 * so numbers, dates and special chars are properly handled in each script.
 *
 * @param {string} text - Text to convert to speech
 * @param {string} language - Language code (default: 'en-IN')
 * @returns {Promise<Buffer>} - Audio buffer (wav)
 */
async function textToSpeech(text, language = "en-IN") {
  try {
    console.log(`[TTS] Generating for lang: ${language} | text: "${text.substring(0, 80)}..."`);

    const payload = {
      inputs: [text],
      target_language_code: language,
      speaker: TTS_SPEAKERS[language] || "anushka",
      pace: 0.75,
      loudness: 1.5,
      pitch: 0,
      speech_sample_rate: 22050,
      // CRITICAL FIX: Enable preprocessing for ALL languages.
      // This ensures numbers spoken as Hindi/Telugu words are properly handled.
      enable_preprocessing: true,
      model: "bulbul:v2",
    };

    const response = await axios.post(
      `${SARVAM_BASE_URL}/text-to-speech`,
      payload,
      {
        headers: {
          "api-subscription-key": SARVAM_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const audios = response.data?.audios;
    if (!audios || audios.length === 0) {
      throw new Error("No audio returned from Sarvam TTS");
    }

    const audioBuffer = Buffer.from(audios[0], "base64");
    console.log("[TTS] Audio generated, size:", audioBuffer.length, "bytes");
    return audioBuffer;
  } catch (error) {
    const detail = error.response?.data
      ? JSON.stringify(error.response.data)
      : error.message;
    console.error("[TTS] Error:", error.response?.status, detail);
    throw new Error(`TTS failed: ${detail}`);
  }
}

// =============================================
// CHAT / TEXT GENERATION — Sarvam AI (Fallback for unknown queries)
// =============================================

const LANG_NAMES = {
  "en-IN": "English",
  "hi-IN": "Hindi",
  "te-IN": "Telugu",
};

const { TRAINS, PLATFORM_FACILITIES } = require("./intent");

/**
 * Generate a natural language response using Sarvam AI Chat API.
 * This is called ONLY for dynamic/unknown queries not covered by intent.js.
 *
 * @param {string} userQuery      - Original user utterance (transcribed)
 * @param {string} intentData     - JSON string with the extracted facts
 * @param {string} language       - Language code: 'en-IN' | 'hi-IN' | 'te-IN'
 * @returns {Promise<string>}     - Generated response text
 */
async function sarvamChat(userQuery, intentData, language = "en-IN") {
  const langName = LANG_NAMES[language] || "English";

  const stationKnowledge = buildStationKnowledge();

  const systemPrompt = `You are a helpful Indian railway station enquiry assistant for passengers.

STATION DATA (today's trains):
${stationKnowledge}

STRICT RULES — follow every one:
1. Always respond in ${langName} ONLY. Do not mix languages or use English words in Hindi/Telugu responses.
2. When mentioning a train, always state the train name AND train number together.
   - English: "Mumbai Rajdhani, train number 12951, ..."
   - Hindi: "मुंबई राजधानी, ट्रेन नंबर एक दो नौ पाँच एक, ..."
   - Telugu: "ముంబై రాజ్‌ధాని, రైలు నంబర్ ఒకటి రెండు తొమ్మిది అయిదు ఒకటి, ..."
3. Keep the response to 1-2 spoken sentences. No bullet points or lists.
4. If a train is delayed, always mention the delay duration.
5. Never say "I found" or repeat the passenger's question back.
6. When responding in Hindi: spell out ALL numbers as Hindi words (digits are NOT allowed in Hindi responses).
   - Train numbers digit by digit: 12951 → "एक दो नौ पाँच एक"
   - Times as words: 08:52 → "आठ बजकर बावन मिनट", 10:00 → "दस बजे"
   - Platform numbers: 3 → "तीन"
   - Delay: 17 → "सत्रह मिनट"
7. When responding in Telugu: spell out ALL numbers as Telugu words (digits are NOT allowed in Telugu responses).
   - Train numbers digit by digit: 12951 → "ఒకటి రెండు తొమ్మిది అయిదు ఒకటి"
   - Times as words: 08:52 → "ఎనిమిది గంటల యాభై రెండు నిమిషాలకు", 10:00 → "పది గంటలకు"
   - Platform numbers: 3 → "మూడు"
8. For questions about general help, station info, or anything else: answer helpfully using the station data above.`;

  const userMessage = `Passenger asked: "${userQuery}"\n\nAnswer in ${langName}.`;

  try {
    const response = await axios.post(
      `${SARVAM_BASE_URL}/v1/chat/completions`,
      {
        model: "sarvam-105b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMessage  },
        ],
        max_tokens: 250,
        temperature: 0.3,
      },
      {
        headers: {
          "API-Subscription-Key": SARVAM_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content?.trim() || "";
    if (!reply) throw new Error("Empty response from Sarvam Chat");

    console.log("[Chat] Generated response:", reply);
    return reply;

  } catch (error) {
    const detail = error.response?.data
      ? JSON.stringify(error.response.data)
      : error.message;
    console.error("[Chat] Error:", error.response?.status, detail);
    return null;
  }
}

/**
 * Serialize the full station dataset into plain text
 * so the AI can answer ANY question about trains or facilities.
 */
function buildStationKnowledge() {
  const { TRAINS, PLATFORM_FACILITIES } = require("./intent");

  const trainLines = TRAINS.map(t =>
    `Train ${t.number} "${t.name}" | From: ${t.from} → To: ${t.to} | ` +
    `Platform: ${t.platform} | Arrival: ${t.actualArrival} (sched: ${t.scheduledArrival}) | ` +
    `Departure: ${t.actualDeparture} (sched: ${t.scheduledDeparture}) | ` +
    `Status: ${t.status}${t.delay > 0 ? `, ${t.delay} mins late` : ""}`
  ).join("\n");

  const facLines = Object.entries(PLATFORM_FACILITIES).map(([pfNum, fac]) => {
    const parts = [];
    if (fac.food?.length)      parts.push(`Food: ${fac.food.join(", ")}`);
    if (fac.washroom?.length)  parts.push(`Washrooms: ${fac.washroom.join(", ")}`);
    if (fac.cloakroom?.length) parts.push(`Cloakroom: ${fac.cloakroom.join(", ")}`);
    if (fac.waiting?.length)   parts.push(`Waiting: ${fac.waiting.join(", ")}`);
    if (fac.escalator?.length) parts.push(`Escalators: ${fac.escalator.join(", ")}`);
    if (fac.atm?.length)       parts.push(`ATM: ${fac.atm.join(", ")}`);
    if (fac.pharmacy?.length)  parts.push(`Pharmacy: ${fac.pharmacy.join(", ")}`);
    return `Platform ${pfNum} facilities — ${parts.join(" | ")}`;
  }).join("\n");

  return `TRAINS:\n${trainLines}\n\nPLATFORM FACILITIES:\n${facLines}`;
}

module.exports = { speechToText, textToSpeech, sarvamChat };
