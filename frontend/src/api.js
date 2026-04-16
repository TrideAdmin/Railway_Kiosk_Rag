// // api.js — Frontend API client
// // Vite proxy forwards these to http://localhost:5000 automatically
// // No need for VITE_API_URL env var in development

// /**
//  * Send voice audio to /voice endpoint.
//  */

// const API_BASE = "https://suraksha-sevika-api.tride.live";

// export async function sendVoiceMessage(audioBlob, language = "en-IN") {
//   const formData = new FormData();
//   formData.append("audio", audioBlob, "recording.webm");
//   formData.append("language", language);

//   const response = await fetch(`${API_BASE}/voice`, {
//     method: "POST",
//     body: formData,
//   });

//   if (!response.ok) {
//     const err = await response.json().catch(() => ({}));
//     throw new Error(err.error || `Server error: ${response.status}`);
//   }

//   const transcript = decodeURIComponent(response.headers.get("X-Transcript") || "");
//   const responseText = decodeURIComponent(response.headers.get("X-Response-Text") || "");
//   const source = response.headers.get("X-Source") || null;
//   const intent = response.headers.get("X-Intent") || "";
//   const audioBuffer = await response.blob();

//   return { audioBlob: audioBuffer, transcript, responseText, source, intent };
// }

// // ✅ FIXED
// export async function sendTextMessage(text, language = "en-IN") {
//   const response = await fetch(`${API_BASE}/text`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ text, language }),
//   });

//   if (!response.ok) {
//     const err = await response.json().catch(() => ({}));
//     throw new Error(err.error || `Server error: ${response.status}`);
//   }

//   const responseText = decodeURIComponent(response.headers.get("X-Response-Text") || "");
//   const source = response.headers.get("X-Source") || null;
//   const intent = response.headers.get("X-Intent") || "";
//   const audioBuffer = await response.blob();

//   return { audioBlob: audioBuffer, responseText, source, intent };
// }

// // ✅ FIXED
// export async function queryRAG(query, language = "en-IN") {
//   const response = await fetch(`${API_BASE}/query`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ query, language, tts: false }),
//   });

//   return response.json();
// }
// api.js — Frontend API client

const API_BASE = import.meta.env.PROD ? "https://suraksha-sevika-api.tride.live" : "";

// =============================================
// VOICE
// =============================================
export async function sendVoiceMessage(audioBlob, language = "en-IN") {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  formData.append("language", language);

  const response = await fetch(`${API_BASE}/voice`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  const transcript = decodeURIComponent(response.headers.get("X-Transcript") || "");
  const responseText = decodeURIComponent(response.headers.get("X-Response-Text") || "");
  const source = response.headers.get("X-Source") || null;
  const intent = response.headers.get("X-Intent") || "";
  const audioBuffer = await response.blob();

  return { audioBlob: audioBuffer, transcript, responseText, source, intent };
}

// =============================================
// TEXT
// =============================================
export async function sendTextMessage(text, language = "en-IN") {
  const response = await fetch(`${API_BASE}/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  const responseText = decodeURIComponent(response.headers.get("X-Response-Text") || "");
  const source = response.headers.get("X-Source") || null;
  const intent = response.headers.get("X-Intent") || "";
  const audioBuffer = await response.blob();

  return { audioBlob: audioBuffer, responseText, source, intent };
}

// =============================================
// RAG QUERY
// =============================================
export async function queryRAG(query, language = "en-IN") {
  const response = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, language, tts: false }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  return response.json();
}

// =============================================
// ✅ INGEST — THIS WAS MISSING (cause of 405)
// =============================================
export async function ingestDocuments({ files = [], namespace = "railway", inlineText = "", apiUrl = "", clearFirst = false }) {
  const formData = new FormData();

  // Attach files
  files.forEach((file) => formData.append("files", file));

  // Namespace
  formData.append("namespace", namespace);

  // Clear flag
  if (clearFirst) formData.append("clearFirst", "true");

  // Build sources array for inline text / API URL
  const sources = [];
  if (inlineText?.trim()) {
    sources.push({ type: "text", content: inlineText.trim(), namespace });
  }
  if (apiUrl?.trim()) {
    sources.push({ type: "api", url: apiUrl.trim(), namespace });
  }
  if (sources.length > 0) {
    formData.append("sources", JSON.stringify(sources));
  }

  const response = await fetch(`${API_BASE}/ingest`, {
    method: "POST",
    body: formData,   // ✅ NO Content-Type header — browser sets multipart boundary automatically
  });

  if (!response.ok) {
    const text = await response.text();
    let errMsg;
    try {
      errMsg = JSON.parse(text).error;
    } catch {
      errMsg = `Server error ${response.status}`;
    }
    throw new Error(errMsg);
  }

  return response.json();
}

// =============================================
// STATS & CLEAR
// =============================================
export async function getIngestStats() {
  const response = await fetch(`${API_BASE}/ingest/stats`);
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function clearIngestIndex() {
  const response = await fetch(`${API_BASE}/ingest/clear`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}