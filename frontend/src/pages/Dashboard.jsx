import { useState, useRef, useEffect, useCallback } from "react";
import { uploadReport } from "../services/uploadService";
import { askQuestion } from "../services/askService";
import { getSummary } from "../services/summaryService";
import { semanticSearch } from "../services/searchService";

/* ─────────────────────────────────────────────────────────────────
   TOAST SYSTEM
───────────────────────────────────────────────────────────────── */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000
    );
  }, []);
  return { toasts, addToast };
}

function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  const icons = { success: "✓", error: "✕", info: "i" };
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{icons[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   LOADING DOTS
───────────────────────────────────────────────────────────────── */
function LoadingDots({ text }) {
  return (
    <span className="loading-dots">
      {text}<span>.</span><span>.</span><span>.</span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────
   BLANK / EMPTY STATE
───────────────────────────────────────────────────────────────── */
function BlankState({ icon, title, body }) {
  return (
    <div className="blank-state">
      <div className="blank-state-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MARKDOWN RENDERER
   Handles: **bold**, *italic*, `code`, # headings,
            - / * bullet lists, 1. numbered lists
   Preserves exact backend content — only improves presentation.
───────────────────────────────────────────────────────────────── */
function parseInline(text) {
  const result = [];
  // Order matters: **bold** must be matched before *italic*
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  let last = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      result.push(text.slice(last, match.index));
    }
    if (match[1]) {
      result.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      result.push(<em key={key++}>{match[4]}</em>);
    } else if (match[5]) {
      result.push(<code key={key++} className="md-code">{match[6]}</code>);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) result.push(text.slice(last));
  return result.length === 0 ? text : result;
}

function renderMarkdown(text) {
  if (!text) return null;
  // Normalize line endings
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line → spacer
    if (!line.trim()) {
      out.push(<div key={`sp${i}`} className="md-spacer" />);
      i++;
      continue;
    }

    // Headings: # ## ###
    const hm = line.match(/^(#{1,3})\s+(.+)/);
    if (hm) {
      const cls = `md-h${hm[1].length}`;
      out.push(<p key={i} className={cls}>{parseInline(hm[2])}</p>);
      i++;
      continue;
    }

    // Bullet list — collect consecutive lines
    if (/^[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ""));
        i++;
      }
      out.push(
        <ul key={`ul${i}`} className="md-ul">
          {items.map((it, j) => <li key={j}>{parseInline(it)}</li>)}
        </ul>
      );
      continue;
    }

    // Numbered list — collect consecutive lines
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      out.push(
        <ol key={`ol${i}`} className="md-ol">
          {items.map((it, j) => <li key={j}>{parseInline(it)}</li>)}
        </ol>
      );
      continue;
    }

    // Default paragraph
    out.push(<p key={i} className="md-p">{parseInline(line)}</p>);
    i++;
  }

  return out;
}

/* ─────────────────────────────────────────────────────────────────
   UPLOAD PANEL
   Fix: multi-phase status  idle → uploading → vectorizing → done
───────────────────────────────────────────────────────────────── */
// uploadPhase: "idle" | "uploading" | "vectorizing" | "done"
function UploadPanel({ addToast, onUploadSuccess }) {
  const [file, setFile]               = useState(null);
  const [loading, setLoading]         = useState(false);
  const [progress, setProgress]       = useState(0);
  const [uploadPhase, setUploadPhase] = useState("idle");
  const [dragging, setDragging]       = useState(false);
  const inputRef = useRef();

  const pickFile = (f) => {
    if (!f) return;
    if (f.type === "application/pdf") {
      setFile(f);
    } else {
      addToast("Only PDF files are supported", "error");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) { addToast("Select a PDF file first", "error"); return; }

    setLoading(true);
    setUploadPhase("uploading");
    setProgress(0);

    try {
      const res = await uploadReport(file, (evt) => {
        const pct = Math.round((evt.loaded * 100) / evt.total);
        setProgress(pct);
        // Network transfer done — server is now generating vectors
        if (pct === 100) setUploadPhase("vectorizing");
      });

      setUploadPhase("done");
      addToast(res.data.message || "Document processed and indexed", "success");
      onUploadSuccess();

      // Keep "done" visible briefly, then reset
      setTimeout(() => {
        setFile(null);
        setProgress(0);
        setUploadPhase("idle");
        setLoading(false);
      }, 2000);

    } catch (err) {
      setUploadPhase("idle");
      setLoading(false);
      addToast(err.response?.data?.detail || "Upload failed", "error");
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <div className="panel-icon-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <h2 className="panel-title">Upload Documents</h2>
            <p className="panel-subtitle">Index financial PDFs into FAISS for AI-powered analysis</p>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={`drop-zone${dragging ? " drop-active" : ""}${file ? " drop-has-file" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        aria-label="Upload PDF"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          style={{ display: "none" }}
          onChange={(e) => pickFile(e.target.files[0])}
        />
        {file ? (
          <div className="drop-file-preview">
            <span className="file-type-badge">PDF</span>
            <span className="file-name-text">{file.name}</span>
            <span className="file-size-text">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        ) : (
          <div className="drop-prompt">
            <div className="drop-prompt-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="drop-title">Drop your PDF here</p>
            <p className="drop-hint">or <span className="drop-link">click to browse files</span></p>
            <p className="drop-spec">Supports: PDF · Max 50 MB</p>
          </div>
        )}
      </div>

      {/* ── Multi-phase Upload Status ── */}
      {uploadPhase === "uploading" && (
        <div className="upload-status uploading">
          <div className="upload-status-row">
            <span className="upload-status-label">Uploading PDF…</span>
            <span className="upload-status-pct">{progress}%</span>
          </div>
          <div className="prog-track">
            <div className="prog-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {uploadPhase === "vectorizing" && (
        <div className="upload-status vectorizing">
          <span className="status-pulse" />
          <span>
            PDF uploaded successfully.&nbsp;
            <strong>Generating vector chunks…</strong>
            &nbsp;This may take a moment.
          </span>
        </div>
      )}

      {uploadPhase === "done" && (
        <div className="upload-status done">
          <span className="upload-done-icon">✓</span>
          <span>Document processed and indexed successfully.</span>
        </div>
      )}

      <button
        className="action-btn action-btn-full"
        onClick={handleUpload}
        disabled={loading || !file}
      >
        {loading ? (
          <LoadingDots text={uploadPhase === "vectorizing" ? "Indexing" : "Uploading"} />
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Process &amp; Index Document
          </>
        )}
      </button>

      <div className="upload-features">
        {[
          { sym: "⬡", label: "FAISS vector indexing" },
          { sym: "◈", label: "Semantic retrieval enabled" },
          { sym: "◉", label: "RAG pipeline ready" },
        ].map((f) => (
          <div key={f.sym} className="upload-feat">
            <span className="upload-feat-sym">{f.sym}</span>
            <span>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ASK PANEL  (Chat Interface)
   Fix 1: isSendingRef — prevents duplicate API calls
   Fix 2: messages/setMessages lifted to Dashboard for persistence
───────────────────────────────────────────────────────────────── */
function AskPanel({ addToast, hasDocuments, messages, setMessages }) {
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef  = useRef();
  const inputRef   = useRef();
  const isSending  = useRef(false); // Guard against duplicate sends

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const q = input.trim();
    if (!q || isSending.current) return;
    if (!hasDocuments) {
      addToast("Upload a document first to ask questions", "error");
      return;
    }

    isSending.current = true;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      const res = await askQuestion(q);
      setMessages((prev) => [...prev, { role: "assistant", text: res.data.answer }]);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to get answer";
      addToast(msg, "error");
      setMessages((prev) => [...prev, { role: "error", text: msg }]);
    } finally {
      setLoading(false);
      isSending.current = false;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const SUGGESTIONS = [
    "What are the key revenue drivers?",
    "Summarize the main risk factors",
    "What is the net income trend?",
    "Highlight outstanding liabilities",
  ];

  return (
    <div className="panel ask-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <div className="panel-icon-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <div>
            <h2 className="panel-title">Ask Questions</h2>
            <p className="panel-subtitle">RAG-powered Q&amp;A across all indexed documents</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="ghost-btn" onClick={() => setMessages([])}>
            Clear chat
          </button>
        )}
      </div>

      {/* Chat Window */}
      <div className="chat-window">
        {messages.length === 0 && !loading ? (
          <div className="chat-empty-state">
            {hasDocuments ? (
              <>
                <div className="empty-state-icon">
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <p className="empty-state-title">Documents ready · Ask anything</p>
                <p className="empty-state-sub">Queries are answered using retrieved chunks from your indexed PDFs</p>
                <div className="suggestions-grid">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      className="suggestion-pill"
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="empty-state-icon">
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <p className="empty-state-title">No documents indexed</p>
                <p className="empty-state-sub">Upload a financial PDF first to start asking questions</p>
              </>
            )}
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, i) => (
              <div key={i} className={`msg msg-${msg.role}`}>
                <div className="msg-avatar">
                  {msg.role === "user" ? "U" : msg.role === "error" ? "!" : "AI"}
                </div>
                <div className="msg-body">
                  <div className="msg-bubble">
                    {/* Apply markdown only to AI responses; user text is plain */}
                    {msg.role === "assistant"
                      ? renderMarkdown(msg.text)
                      : msg.text}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="msg msg-assistant">
                <div className="msg-avatar">AI</div>
                <div className="msg-body">
                  <div className="msg-bubble">
                    <span className="dots-anim"><span /><span /><span /></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="chat-composer">
        <textarea
          ref={inputRef}
          className="composer-input"
          placeholder="Ask about financial metrics, risk factors, revenue trends…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          aria-label="Send"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SUMMARY PANEL
   Fix: renderMarkdown applied to summary output
───────────────────────────────────────────────────────────────── */
function SummaryPanel({ addToast, hasDocuments }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!hasDocuments) { addToast("Upload a document first", "error"); return; }
    setLoading(true);
    setSummary("");
    try {
      const res = await getSummary();
      setSummary(res.data.summary);
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to generate summary", "error");
    }
    setLoading(false);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <div className="panel-icon-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <div>
            <h2 className="panel-title">Generate Summary</h2>
            <p className="panel-subtitle">AI financial insights extracted from indexed documents</p>
          </div>
        </div>
        <button className="action-btn" onClick={generate} disabled={loading}>
          {loading ? <LoadingDots text="Analyzing" /> : "Generate"}
        </button>
      </div>

      {!summary && !loading && (
        <BlankState
          icon={
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          }
          title="No Summary Generated"
          body="Click Generate to create an AI-powered analysis of your uploaded financial documents"
        />
      )}

      {loading && (
        <div className="analysis-loading">
          <div className="analysis-spinner"><div /><div /><div /></div>
          <p>Analyzing financial data across all indexed documents…</p>
        </div>
      )}

      {summary && !loading && (
        <div className="summary-output-card">
          <div className="output-card-header">
            <span className="ai-badge">
              <span className="ai-dot" />
              AI Insights
            </span>
            <span className="output-card-label">Financial Analysis Report</span>
          </div>
          {/* renderMarkdown preserves backend content, only improves formatting */}
          <div className="summary-body">
            {renderMarkdown(summary)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SEARCH PANEL
   Fix: renderMarkdown applied to chunk content
───────────────────────────────────────────────────────────────── */
function SearchPanel({ addToast, hasDocuments }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) { addToast("Enter a search query", "error"); return; }
    if (!hasDocuments)  { addToast("Upload a document first", "error"); return; }
    setLoading(true);
    setResults([]);
    setSearched(false);
    try {
      const res = await semanticSearch(query);
      setResults(res.data.results);
      setSearched(true);
      if (!res.data.results.length) addToast("No matching chunks found", "info");
    } catch (err) {
      addToast(err.response?.data?.detail || "Search failed", "error");
    }
    setLoading(false);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <div className="panel-icon-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <div>
            <h2 className="panel-title">Semantic Search</h2>
            <p className="panel-subtitle">Retrieve relevant document chunks from the vector index</p>
          </div>
        </div>
      </div>

      <div className="search-row">
        <div className="search-field-wrap">
          <svg className="search-field-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-field"
            type="text"
            placeholder="Search by concept, metric, event, or keyword…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
        </div>
        <button className="action-btn" onClick={search} disabled={loading}>
          {loading ? "…" : "Search"}
        </button>
      </div>

      {!searched && !loading && (
        <BlankState
          icon={
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
          title="Semantic Search"
          body="Enter a concept, metric, or financial event to retrieve the most relevant document chunks"
        />
      )}

      {loading && (
        <div className="blank-state">
          <div className="loading-ring" />
          <h3 style={{ marginTop: "8px", fontWeight: 500, fontSize: "14px" }}>
            Searching vector index…
          </h3>
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <BlankState
          icon={
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
          title="No Results Found"
          body="Try different search terms or verify that your documents are properly indexed"
        />
      )}

      {results.length > 0 && (
        <div className="search-results">
          <div className="results-meta">
            <span className="results-count">
              {results.length} chunk{results.length !== 1 ? "s" : ""} retrieved
            </span>
          </div>
          {results.map((item, i) => (
            <div key={i} className="chunk-card">
              <div className="chunk-header">
                <span className="chunk-index">#{String(i + 1).padStart(2, "0")}</span>
                <span className="chunk-source">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  {item.source}
                </span>
              </div>
              {/* renderMarkdown in case chunks contain formatted content */}
              <div className="chunk-content">{renderMarkdown(item.content)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN DASHBOARD
   Fix: chatMessages lifted here so AskPanel state persists
        across tab switches for the full session
───────────────────────────────────────────────────────────────── */
function Dashboard() {
  const [tab, setTab] = useState("upload");

  const [hasDocs, setHasDocs] = useState(
    () => localStorage.getItem("fra_indexed") === "1"
  );

  // Lifted so chat history survives tab switches
  const [chatMessages, setChatMessages] = useState([]);

  const { toasts, addToast } = useToasts();

  const onUploadSuccess = () => {
    setHasDocs(true);
    localStorage.setItem("fra_indexed", "1");
    setTimeout(() => setTab("ask"), 1800);
  };

  const TABS = [
    {
      id: "upload",
      label: "Upload",
      badge: "Start here",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
    },
    {
      id: "ask",
      label: "Ask",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
    },
    {
      id: "summary",
      label: "Summary",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      ),
    },
    {
      id: "search",
      label: "Search",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
  ];

  return (
    <div className="d-workspace">
      <ToastContainer toasts={toasts} />

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="d-sidebar">
        <div className="d-sidebar-brand">
          <div className="d-brand-badge">FRA</div>
          <div className="d-brand-info">
            <span className="d-brand-name">Financial</span>
            <span className="d-brand-sub">Research Assistant</span>
          </div>
        </div>

        <nav className="d-sidebar-nav">
          <div className="d-nav-section-label">Workspace</div>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`d-nav-item${tab === t.id ? " d-nav-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span className="d-nav-icon">{t.icon}</span>
              <span className="d-nav-label">{t.label}</span>
              {t.badge && <span className="d-nav-badge">{t.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="d-sidebar-status">
          <div className="d-status-title">System Status</div>
          <div className="d-status-row">
            <span className={`d-status-dot${hasDocs ? " d-dot-green" : " d-dot-muted"}`} />
            <span className="d-status-text">{hasDocs ? "Documents indexed" : "No documents"}</span>
          </div>
          <div className="d-status-row">
            <span className="d-status-dot d-dot-green" />
            <span className="d-status-text">RAG pipeline active</span>
          </div>
          <div className="d-status-row">
            <span className="d-status-dot d-dot-green" />
            <span className="d-status-text">FAISS index loaded</span>
          </div>
        </div>

        {!hasDocs && (
          <div className="d-sidebar-tip">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Upload a financial PDF to unlock all AI analysis features
          </div>
        )}
      </aside>

      {/* ── Main Workspace ────────────────────────── */}
      <main className="d-main">
        {tab === "upload" && (
          <UploadPanel addToast={addToast} onUploadSuccess={onUploadSuccess} />
        )}
        {tab === "ask" && (
          <AskPanel
            addToast={addToast}
            hasDocuments={hasDocs}
            messages={chatMessages}
            setMessages={setChatMessages}
          />
        )}
        {tab === "summary" && (
          <SummaryPanel addToast={addToast} hasDocuments={hasDocs} />
        )}
        {tab === "search" && (
          <SearchPanel addToast={addToast} hasDocuments={hasDocs} />
        )}
      </main>
    </div>
  );
}

export default Dashboard;