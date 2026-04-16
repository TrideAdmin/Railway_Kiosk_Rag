// AdminPanel.jsx — RAG Document Ingestion Admin Panel
import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.PROD ? "https://suraksha-sevika-api.tride.live" : ""; // Vite proxy forwards to backend on port 5000 in dev

export default function AdminPanel({ onClose }) {
  const [tab, setTab] = useState("upload");
  const [files, setFiles] = useState([]);
  const [namespace, setNamespace] = useState("railway");
  const [clearFirst, setClearFirst] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [testQuery, setTestQuery] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [apiText, setApiText] = useState("");
  const [apiUrl, setApiUrl] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/ingest/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Stats error:", err);
    }
  };

  const handleUpload = useCallback(async () => {
    if (files.length === 0 && !apiText && !apiUrl) {
      alert("Add files, text, or an API URL first.");
      return;
    }

    setIngesting(true);
    setIngestResult(null);

    try {
      const formData = new FormData();
      formData.append("namespace", namespace);
      formData.append("clearFirst", clearFirst.toString());

      files.forEach((f) => formData.append("files", f));

      // Add text/api as JSON sources
      const extraSources = [];
      if (apiText.trim()) {
        extraSources.push({ type: "text", content: apiText, namespace });
      }
      if (apiUrl.trim()) {
        extraSources.push({ type: "api", url: apiUrl, namespace });
      }
      if (extraSources.length > 0) {
        formData.append("sources", JSON.stringify(extraSources));
      }

      const res = await fetch(`${API_URL}/ingest`, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Ingestion failed");
      setIngestResult({ success: true, ...data });
      setFiles([]); setApiText(""); setApiUrl("");
      fetchStats();
    } catch (err) {
      setIngestResult({ success: false, error: err.message });
    } finally {
      setIngesting(false);
    }
  }, [files, namespace, clearFirst, apiText, apiUrl]);

  const handleClearIndex = async () => {
    if (!confirm("⚠️ This will delete ALL vectors from Pinecone. Are you sure?")) return;
    try {
      const res = await fetch(`${API_URL}/ingest/clear`, { method: "DELETE" });
      const data = await res.json();
      alert(data.message);
      fetchStats();
    } catch (err) {
      alert("Clear failed: " + err.message);
    }
  };

  const handleTestQuery = async () => {
    if (!testQuery.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: testQuery, language: "en-IN", tts: false }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ error: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="admin-overlay">
      <div className="admin-panel">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-title">
            <span>⚙️</span>
            <div>
              <h2>RAG Admin Panel</h2>
              <p>Pinecone + Gemini</p>
            </div>
          </div>
          <button className="admin-close" onClick={onClose}>✕</button>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="admin-stats">
            <div className="admin-stat">
              <span className="stat-num">{stats.totalRecordCount || 0}</span>
              <span className="stat-label">Total Vectors</span>
            </div>
            <div className="admin-stat">
              <span className="stat-num">{Object.keys(stats.namespaces || {}).length}</span>
              <span className="stat-label">Namespaces</span>
            </div>
            <div className="admin-stat">
              <span className="stat-num">{stats.dimension || 768}</span>
              <span className="stat-label">Dimensions</span>
            </div>
            <button className="admin-refresh" onClick={fetchStats} title="Refresh stats">↻</button>
          </div>
        )}

        {/* Tabs */}
        <div className="admin-tabs">
          {[
            { id: "upload", label: "📥 Ingest" },
            { id: "test", label: "🔎 Test RAG" },
            { id: "manage", label: "🗂️ Manage" },
          ].map((t) => (
            <button key={t.id}
              className={`admin-tab ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Ingest */}
        {tab === "upload" && (
          <div className="admin-content">
            <div className="admin-field">
              <label>Namespace (group label)</label>
              <input value={namespace} onChange={(e) => setNamespace(e.target.value)}
                placeholder="e.g. schedules, faqs, manuals" className="admin-input" />
            </div>

            <div className="admin-field">
              <label>Upload Files (PDF, CSV, JSON, TXT)</label>
              <div className="admin-dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
                }}>
                <input type="file" multiple accept=".pdf,.csv,.json,.txt"
                  onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files)])}
                  style={{ display: "none" }} id="file-input" />
                <label htmlFor="file-input" className="admin-dropzone-label">
                  📁 Click or drag files here
                </label>
                {files.length > 0 && (
                  <div className="admin-file-list">
                    {files.map((f, i) => (
                      <div key={i} className="admin-file-item">
                        <span>{f.name} ({(f.size / 1024).toFixed(1)} KB)</span>
                        <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="admin-field">
              <label>Inline Text / Railway Data (paste directly)</label>
              <textarea className="admin-textarea" rows={4}
                value={apiText}
                onChange={(e) => setApiText(e.target.value)}
                placeholder="Paste train schedules, station info, FAQs etc..." />
            </div>

            <div className="admin-field">
              <label>Live API URL (IRCTC / custom endpoint)</label>
              <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api.example.com/trains?station=NDLS"
                className="admin-input" />
            </div>

            <div className="admin-checkbox">
              <input type="checkbox" id="clearFirst" checked={clearFirst}
                onChange={(e) => setClearFirst(e.target.checked)} />
              <label htmlFor="clearFirst">Clear existing index before ingesting</label>
            </div>

            <button className="admin-ingest-btn" onClick={handleUpload} disabled={ingesting}>
              {ingesting ? (
                <><span className="admin-spin">⟳</span> Ingesting…</>
              ) : "📥 Start Ingestion"}
            </button>

            {ingestResult && (
              <div className={`admin-result ${ingestResult.success ? "success" : "error"}`}>
                {ingestResult.success ? (
                  <>✅ {ingestResult.message}<br /><small>Namespace: {ingestResult.namespace}</small></>
                ) : (
                  <>❌ {ingestResult.error}</>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Test */}
        {tab === "test" && (
          <div className="admin-content">
            <p className="admin-help">Test RAG pipeline: query → Pinecone retrieve → Gemini generate</p>
            <div className="admin-field">
              <label>Test Query (English)</label>
              <input value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTestQuery()}
                placeholder="e.g. What platform is Mumbai Rajdhani on?"
                className="admin-input" />
            </div>
            <button className="admin-ingest-btn" onClick={handleTestQuery} disabled={testing || !testQuery}>
              {testing ? "Querying…" : "🔎 Run RAG Query"}
            </button>

            {testResult && (
              <div className="admin-test-result">
                {testResult.error ? (
                  <div className="admin-result error">❌ {testResult.error}</div>
                ) : (
                  <>
                    <div className="test-field">
                      <strong>Intent:</strong> {testResult.intent}
                    </div>
                    <div className="test-field">
                      <strong>Source:</strong>
                      <span className={`source-tag source-${testResult.source}`}>
                        {testResult.source}
                      </span>
                    </div>
                    <div className="test-field">
                      <strong>Response:</strong>
                      <p className="test-response">{testResult.response}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Manage */}
        {tab === "manage" && (
          <div className="admin-content">
            <p className="admin-help">Manage your Pinecone index.</p>

            {stats && (
              <div className="admin-ns-list">
                <h3>Namespaces</h3>
                {Object.entries(stats.namespaces || {}).length === 0 ? (
                  <p className="admin-empty">No namespaces found. Ingest some data first.</p>
                ) : (
                  Object.entries(stats.namespaces).map(([ns, info]) => (
                    <div key={ns} className="admin-ns-item">
                      <span className="ns-name">{ns}</span>
                      <span className="ns-count">{info.recordCount || 0} vectors</span>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="admin-danger-zone">
              <h3>⚠️ Danger Zone</h3>
              <p>Permanently delete all vectors from the Pinecone index. Cannot be undone.</p>
              <button className="admin-clear-btn" onClick={handleClearIndex}>
                🗑️ Clear Entire Index
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
