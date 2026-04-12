// api.js — Frontend API client
// Vite proxy forwards these to http://localhost:5000 automatically
// No need for VITE_API_URL env var in development

/**
 * Send voice audio to /voice endpoint.
 */
export async function sendVoiceMessage(audioBlob, language = "en-IN") {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  formData.append("language", language);

  const response = await fetch("/voice", { method: "POST", body: formData });

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

/**
 * Send text query to /text endpoint.
 */
export async function sendTextMessage(text, language = "en-IN") {
  const response = await fetch("/text", {
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

/**
 * Direct RAG query without TTS (for Admin Panel testing).
 */
export async function queryRAG(query, language = "en-IN") {
  const response = await fetch("/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, language, tts: false }),
  });
  return response.json();
}
