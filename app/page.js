'use client';

import { useEffect, useState } from 'react';

const MODES = [
  {
    id: 'text',
    icon: '📄',
    title: 'Text Only',
    desc: 'Plain text body extraction',
    enabled: true,
  },
  {
    id: 'clean',
    icon: '🧹',
    title: 'Clean Headers',
    desc: 'News-style with header rewrite',
    enabled: false,
  },
  {
    id: 'newsletter',
    icon: '📰',
    title: 'Newsletter Original',
    desc: 'Raw newsletter format',
    enabled: false,
  },
  {
    id: 'headers',
    icon: '🗂️',
    title: 'Headers Only',
    desc: 'Cleaned headers with custom params',
    enabled: false,
  },
];

export default function Page() {
  const [me, setMe] = useState({ loading: true, connected: false });
  const [folders, setFolders] = useState([]);
  const [folderId, setFolderId] = useState('');
  const [startFrom, setStartFrom] = useState(1);
  const [limit, setLimit] = useState(50);
  const [mode, setMode] = useState('text');
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth_error');
    if (authError) setError(authError);

    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => setMe({ loading: false, ...data }))
      .catch(() => setMe({ loading: false, connected: false }));
  }, []);

  useEffect(() => {
    if (!me.connected) return;
    fetch('/api/folders')
      .then((r) => r.json())
      .then((data) => {
        if (data.folders) {
          setFolders(data.folders);
          if (data.folders.length && !folderId) {
            setFolderId(data.folders[0].id);
          }
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.connected]);

  const selectedFolder = folders.find((f) => f.id === folderId);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setMe({ loading: false, connected: false });
    setFolders([]);
    setFolderId('');
  }

  async function handleExtract() {
    if (!folderId) return;
    setExtracting(true);
    setError('');
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, startFrom, limit }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Extraction failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'email_extraction.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <div className="brand">
          <div className="brand-icon">📧</div>
          <div>
            <div className="brand-title">Email Extraction · Outlook</div>
            <div className="brand-sub">Graph API · v1.0</div>
          </div>
        </div>
        <div className={`status-pill ${me.connected ? '' : 'disconnected'}`}>
          <span className="dot" />
          {me.loading ? 'Checking…' : me.connected ? 'Connected' : 'Not connected'}
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="grid">
        <div className="stack">
          <div className="card">
            <div className="card-header">
              <div className="icon-badge">🔑</div>
              <h2>Connection</h2>
            </div>

            {me.connected ? (
              <>
                <label className="field-label">Signed in as</label>
                <input type="text" value={me.email || ''} disabled />
                <div style={{ marginTop: 16 }}>
                  <button className="btn btn-danger-link" onClick={handleLogout}>
                    ⎋ Disconnect
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="helper-text" style={{ marginBottom: 16 }}>
                  Sign in with your Microsoft account to grant read-only access to your
                  mailbox via Microsoft Graph. No password is ever seen or stored by this app.
                </p>
                <a href="/api/auth/login" style={{ textDecoration: 'none' }}>
                  <button className="btn btn-primary" disabled={me.loading}>
                    🔗 Connect Outlook Account
                  </button>
                </a>
              </>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="icon-badge">⚙️</div>
              <h2>Download Mode</h2>
            </div>
            {MODES.map((m) => (
              <div
                key={m.id}
                className={`mode-option ${mode === m.id ? 'selected' : ''}`}
                style={{ opacity: m.enabled ? 1 : 0.5, cursor: m.enabled ? 'pointer' : 'not-allowed' }}
                onClick={() => m.enabled && setMode(m.id)}
              >
                <div className="icon-badge">{m.icon}</div>
                <div>
                  <div className="mode-title">{m.title}</div>
                  <div className="mode-desc">
                    {m.enabled ? m.desc : `${m.desc} — coming soon`}
                  </div>
                </div>
                <div className="radio-dot" />
              </div>
            ))}
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-header">
              <div className="icon-badge">🗃️</div>
              <h2>Extraction Parameters</h2>
            </div>

            <div className="folder-select-wrap">
              <label className="field-label">Label / Folder</label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                disabled={!me.connected || folders.length === 0}
              >
                {folders.length === 0 ? (
                  <option value="">
                    {me.connected ? 'Loading folders…' : 'Connect your account first'}
                  </option>
                ) : (
                  folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedFolder ? (
              <div className="field-hint">
                ✉️ {selectedFolder.count} emails in folder
              </div>
            ) : (
              <div style={{ height: 18 }} />
            )}

            <div className="row-2">
              <div>
                <label className="field-label">Start From</label>
                <input
                  type="number"
                  min={1}
                  value={startFrom}
                  onChange={(e) => setStartFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Limit</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <button
              className="btn btn-primary"
              disabled={!me.connected || !folderId || extracting}
              onClick={handleExtract}
              style={{ marginBottom: 10 }}
            >
              {extracting ? 'Extracting…' : '⚡ Start Extraction'}
            </button>
            <p className="helper-text" style={{ textAlign: 'center', margin: 0 }}>
              Downloads a .zip of plain-text files, one per email.
            </p>
            {extracting && (
              <div className="progress-note">
                Fetching messages from Microsoft Graph — this can take a moment for large limits.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
