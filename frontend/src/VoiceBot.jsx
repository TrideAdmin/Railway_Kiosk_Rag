// VoiceBot.jsx — Railway Kiosk with RAG Integration
import { useState, useRef, useCallback, useEffect } from "react";
import { sendVoiceMessage, sendTextMessage } from "./api";
import AdminPanel from "./AdminPanel";
import avatarPng from "../assests/avatar.png";

const STATUS = {
  IDLE: "idle",
  RECORDING: "recording",
  PROCESSING: "processing",
  PLAYING: "playing",
  ERROR: "error",
};

const SOURCE_LABELS = {
  rag: { label: "RAG · Pinecone + Gemini", color: "#22c55e", icon: "🧠" },
  gemini: { label: "Gemini AI", color: "#a78bfa", icon: "✨" },
  static: { label: "Intent Engine", color: "#60a5fa", icon: "⚡" },
  fallback: { label: "Fallback", color: "#f59e0b", icon: "🔄" },
};

const LANGUAGES = [
  {
    code: "en-IN", label: "EN", name: "English",
    placeholder: "Type your enquiry…",
    speakLabel: "Speak", processingLabel: "Processing…", stopLabel: "Stop",
    emptyHint: 'Try: "Trains to New Delhi" or tap a quick query below',
    quickLabel: "Quick queries:",
    suggestions: [
      "Trains to New Delhi today",
      "Train number of Mumbai Rajdhani",
      "Arrival time of Bhopal Express",
      "All trains in next 1 hour",
      "What food is available on platform 5",
    ],
  },
  {
    code: "hi-IN", label: "हि", name: "Hindi",
    placeholder: "अपनी पूछताछ टाइप करें…",
    speakLabel: "बोलें", processingLabel: "प्रक्रिया…", stopLabel: "रोकें",
    emptyHint: 'कहें: "दिल्ली के लिए ट्रेन" या नीचे त्वरित प्रश्न दबाएं',
    quickLabel: "त्वरित प्रश्न:",
    suggestions: [
      "आज नई दिल्ली के लिए ट्रेन",
      "मुंबई राजधानी का ट्रेन नंबर",
      "भोपाल एक्सप्रेस का आगमन समय",
      "अगले एक घंटे में सभी ट्रेनें",
      "प्लेटफॉर्म 5 पर क्या सुविधाएं हैं",
    ],
  },
  {
    code: "te-IN", label: "తె", name: "Telugu",
    placeholder: "మీ విచారణ టైప్ చేయండి…",
    speakLabel: "మాట్లాడండి", processingLabel: "ప్రాసెసింగ్…", stopLabel: "ఆపండి",
    emptyHint: '"న్యూ ఢిల్లీకి రైళ్లు" లేదా క్రింద త్వరిత ప్రశ్న నొక్కండి',
    quickLabel: "త్వరిత ప్రశ్నలు:",
    suggestions: [
      "ఈ రోజు న్యూ ఢిల్లీకి రైళ్లు",
      "ముంబై రాజ్‌ధాని రైలు నంబర్",
      "భోపాల్ ఎక్స్‌ప్రెస్ రాక సమయం",
      "తదుపరి 1 గంటలో అన్ని రైళ్లు",
      "ప్లాట్‌ఫారం 5లో ఏ సౌకర్యాలు ఉన్నాయి",
    ],
  },
];

export default function VoiceBot() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [currentResponse, setCurrentResponse] = useState("");
  const [responseSource, setResponseSource] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const processAudioRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const addToConversation = useCallback((transcript, response, source) => {
    setConversation((prev) => [
      { transcript, response, source, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 9),
    ]);
  }, []);

  const playAudio = useCallback((blob) => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => setStatus(STATUS.PLAYING);
      audio.onended = () => { URL.revokeObjectURL(url); setStatus(STATUS.IDLE); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Playback failed")); };
      audio.play().catch(reject);
    });
  }, []);

  const processAudio = useCallback(async (audioBlob) => {
    setStatus(STATUS.PROCESSING);
    try {
      const { audioBlob: rb, transcript: t, responseText: r, source: s } =
        await sendVoiceMessage(audioBlob, language.code);
      setCurrentTranscript(t || "(unclear)");
      setCurrentResponse(r);
      setResponseSource(s || null);
      addToConversation(t, r, s);
      await playAudio(rb);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || "Something went wrong.");
      setStatus(STATUS.ERROR);
    }
  }, [language, playAudio, addToConversation]);

  processAudioRef.current = processAudio;

  const startRecording = useCallback(async () => {
    setErrorMsg(""); setCurrentTranscript(""); setCurrentResponse(""); setResponseSource(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await processAudioRef.current(new Blob(audioChunksRef.current, { type: mimeType }));
      };
      recorder.start(100);
      setStatus(STATUS.RECORDING);
    } catch (err) {
      setErrorMsg(err.name === "NotAllowedError" ? "Microphone access denied." : err.message);
      setStatus(STATUS.ERROR);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setStatus(STATUS.PROCESSING);
    }
  }, []);

  const handleMicClick = useCallback(() => {
    if (status === STATUS.RECORDING) stopRecording();
    else if (status === STATUS.IDLE || status === STATUS.ERROR) startRecording();
    else if (status === STATUS.PLAYING && audioRef.current) {
      audioRef.current.pause();
      setStatus(STATUS.IDLE);
    }
  }, [status, startRecording, stopRecording]);

  const handleSuggestion = useCallback(async (text) => {
    setErrorMsg(""); setCurrentTranscript(text); setCurrentResponse(""); setResponseSource(null);
    setStatus(STATUS.PROCESSING);
    try {
      const { audioBlob, responseText: r, source: s } = await sendTextMessage(text, language.code);
      setCurrentResponse(r);
      setResponseSource(s || null);
      addToConversation(text, r, s);
      await playAudio(audioBlob);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || "Error.");
      setStatus(STATUS.ERROR);
    }
  }, [language, playAudio, addToConversation]);

  const handleTextSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const query = textInput.trim();
    setTextInput("");
    await handleSuggestion(query);
  }, [textInput, handleSuggestion]);

  const handleLanguageSwitch = (lang) => {
    if (status === STATUS.RECORDING) stopRecording();
    setLanguage(lang);
    setErrorMsg(""); setCurrentTranscript(""); setCurrentResponse(""); setResponseSource(null);
  };

  const isRecording = status === STATUS.RECORDING;
  const isProcessing = status === STATUS.PROCESSING;
  const isPlaying = status === STATUS.PLAYING;
  const isDisabled = isProcessing;
  const src = responseSource ? SOURCE_LABELS[responseSource] : null;

  return (
    <div className="vb-wrapper">
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      {/* Header */}
      <header className="vb-header">
        <div className="vb-logo">
          <span className="vb-train-icon">🚂</span>
          <div>
            <h1>Indian Railways</h1>
            <span className="vb-subtitle">Digital Voice Enquiry Assistant</span>
          </div>
        </div>
        <div className="vb-header-right">
          <div className="vb-header-controls">
            <button className="vb-admin-btn" onClick={() => setShowAdmin(true)} title="RAG Admin Panel">
              ⚙️
            </button>
            <button className="vb-theme-btn"
              onClick={() => setDarkMode(v => !v)}
              title={darkMode ? "Light Mode" : "Dark Mode"}>
              {darkMode ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="vb-status-badge" data-status={status}>
            <span className="vb-dot" />
            {status === STATUS.IDLE && "Ready"}
            {status === STATUS.RECORDING && "Listening…"}
            {status === STATUS.PROCESSING && "Thinking…"}
            {status === STATUS.PLAYING && "Speaking…"}
            {status === STATUS.ERROR && "Error"}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="vb-main">
        <div className="vb-orb-area">
          {/* Transcript bubble */}
          {currentTranscript && (
            <div className="vb-transcript-bubble">
              <span>{isRecording ? "🎤" : "💬"}</span>
              <span className="vb-transcript-text">{currentTranscript}</span>
            </div>
          )}

          {/* Mic orb */}
          <div className="vb-orb-wrapper">
            <button
              className={`vb-mic-btn ${isRecording ? "recording" : ""} ${isPlaying ? "playing" : ""}`}
              onClick={handleMicClick}
              title={
                isRecording ? language.stopLabel
                  : isProcessing ? language.processingLabel
                    : isPlaying ? language.stopLabel
                      : language.speakLabel
              }
              disabled={isProcessing}>
              <img src={avatarPng} alt="Assistant Avatar" className="vb-avatar-img" />
              {isRecording && <><span className="vb-pulse-ring" /><span className="vb-pulse-ring vb-pulse-ring--delay" /></>}
            </button>
          </div>

          {/* Response (Removed as requested so it does not show up when speaking) */}

          {/* Processing */}
          {isProcessing && (
            <div className="vb-processing">
              <div className="vb-spinner" />
              <span>{language.processingLabel}</span>
            </div>
          )}

          {/* Empty hint */}
          {!currentTranscript && !currentResponse && !isProcessing && (
            <div className="vb-empty">
              <p className="vb-empty-hint">{language.emptyHint}</p>
            </div>
          )}

          <div className="vb-lang-switcher">
            {LANGUAGES.map((lang) => (
              <button key={lang.code}
                className={`vb-lang-btn ${language.code === lang.code ? "active" : ""}`}
                onClick={() => handleLanguageSwitch(lang)}
                disabled={isDisabled}>
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Error */}
      {errorMsg && (
        <div className="vb-error">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg("")}>✕</button>
        </div>
      )}

      {/* Quick queries */}
      <section className="vb-suggestions">
        <p className="vb-suggestions-label">{language.quickLabel}</p>
        <div className="vb-suggestions-row">
          {language.suggestions.map((s) => (
            <button key={s} className="vb-chip"
              onClick={() => handleSuggestion(s)}
              disabled={isDisabled || isRecording}>
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* Text input */}
      <div className="vb-text-area">
        <form className="vb-text-form" onSubmit={handleTextSubmit}>
          <input className="vb-text-input" type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={language.placeholder}
            disabled={isDisabled || isRecording} />
          <button className="vb-text-send" type="submit"
            disabled={!textInput.trim() || isDisabled || isRecording}>
            <SendIcon />
          </button>
        </form>
      </div>

      {/* History Floating Button & Panel */}
      {conversation.length > 0 && !showHistory && (
        <button className="vb-history-toggle" onClick={() => setShowHistory(true)} title="View History">
          <HistoryIcon />
        </button>
      )}

      {showHistory && conversation.length > 0 && (
        <div className="vb-history-panel">
          <div className="vb-history-header">
            <h3>Recent Queries</h3>
            <button className="vb-history-close" onClick={() => setShowHistory(false)}>✕</button>
          </div>
          <div className="vb-history-content">
            {conversation.map((c, i) => {
              const csrc = c.source ? SOURCE_LABELS[c.source] : null;
              return (
                <div key={i} className="vb-history-item">
                  <div className="vb-history-q">💬 {c.transcript}</div>
                  <div className="vb-history-a">
                    <span className="vb-assistant-emoji-mini">👮🏼‍♀️</span> {c.response?.substring(0, 80)}{c.response?.length > 80 ? "…" : ""}
                  </div>
                  <span className="vb-history-time">{c.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
function StopIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>;
}
function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
