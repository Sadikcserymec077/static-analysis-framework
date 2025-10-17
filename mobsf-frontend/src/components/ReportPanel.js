// src/components/ReportPanel.js
import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { getReportJSON, getCrucial, savePdfReport, saveJsonReport } from '../api';

export default function ReportPanel({ hash, initialJsonPath }) {
  const [report, setReport] = useState(null);
  const [jsonPath, setJsonPath] = useState(initialJsonPath || null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [msg, setMsg] = useState('');
  const [viewMode, setViewMode] = useState('none'); // 'none' | 'json' | 'pdf' | 'summary'

  useEffect(() => {
    // clear when hash changes
    setReport(null);
    setPdfUrl(null);
    setMsg('');
    setSummary(null);
    setJsonPath(initialJsonPath || null);
    setViewMode('none');
  }, [hash, initialJsonPath]);

  async function handleGetJSON() {
    if (!hash) { setMsg('No hash selected'); return; }
    setLoading(true);
    setMsg('Loading JSON report...');
    try {
      // attempt to load cached if available, otherwise try proxy
      const r = await getReportJSON(hash);
      setReport(r.data);
      setViewMode('json');
      setMsg('');
    } catch (err) {
      // if proxy fails, try save & load
      try {
        const r2 = await saveJsonReport(hash);
        // r2.data may include { cached, path, data }
        const payload = r2.data.data || r2.data;
        setReport(payload);
        setJsonPath(r2.data.path || `/reports/json/${hash}`);
        setViewMode('json');
        setMsg('');
      } catch (e) {
        const body = e?.response?.data || e?.message;
        setMsg('JSON fetch failed: ' + (typeof body === 'string' ? body : JSON.stringify(body)));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGetSummary() {
    if (!hash) { setMsg('No hash selected'); return; }
    setLoading(true); setMsg('Loading summary...');
    try {
      const r = await getCrucial(hash);
      setSummary(r.data);
      setViewMode('summary');
      setMsg('');
    } catch (e) {
      setMsg('Summary failed: ' + (e?.response?.data || e?.message));
    } finally {
      setLoading(false);
    }
  }

  async function handlePreviewPDF(autoDownload = false) {
    if (!hash) { setMsg('No hash selected'); return; }
    setLoading(true); setMsg('Fetching PDF...');
    try {
      const r = await savePdfReport(hash); // returns blob
      const blob = new Blob([r.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setViewMode('pdf');
      setMsg('PDF loaded below.');
      if (autoDownload) {
        // trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `${hash}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      setMsg('PDF fetch failed: ' + (e?.response?.data || e?.message));
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadPdfFile() {
    if (!pdfUrl) return setMsg('No PDF loaded. Click Preview PDF first.');
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `${hash}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setMsg('Download started.');
  }

  function handleClosePdf() {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setViewMode('none');
  }

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <Card.Title>Report</Card.Title>
            <div className="text-muted">Hash: <Badge bg="light" text="dark">{hash || 'none'}</Badge></div>
          </div>

          <div>
            <Button variant="outline-primary" size="sm" onClick={handleGetJSON} disabled={!hash || loading}>Get JSON</Button>{' '}
            <Button variant="outline-secondary" size="sm" onClick={handleGetSummary} disabled={!hash || loading}>Get Summary</Button>{' '}
            <Button variant="warning" size="sm" onClick={() => handlePreviewPDF(false)} disabled={!hash || loading}>Preview PDF</Button>{' '}
            <Button variant="success" size="sm" onClick={() => handlePreviewPDF(true)} disabled={!hash || loading}>Preview & Download</Button>
          </div>
        </div>

        <div>
          {msg && <div className="alert alert-info">{msg}</div>}

          {/* JSON view */}
          {viewMode === 'json' && report && (
            <div style={{ maxHeight: 560, overflow: 'auto', background: '#f8f9fa', padding: 12, borderRadius: 6 }}>
              <div className="mb-2">
                {jsonPath && <small>Saved JSON: <a href={jsonPath} target="_blank" rel="noreferrer">{jsonPath}</a></small>}
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(report, null, 2)}</pre>
            </div>
          )}

          {/* Summary view */}
          {viewMode === 'summary' && summary && (
            <div>
              <h6>Summary ({summary.count})</h6>
              <ul>
                {summary.findings.map((f, i) => <li key={i}><strong>{f.path}</strong>: {f.snippet}</li>)}
              </ul>
            </div>
          )}

          {/* PDF view */}
          {viewMode === 'pdf' && pdfUrl && (
            <div>
              <div style={{ marginBottom: 8 }}>
                <Button variant="primary" size="sm" onClick={handleDownloadPdfFile}>Download PDF</Button>{' '}
                <Button variant="outline-secondary" size="sm" onClick={handleClosePdf}>Close PDF</Button>
              </div>
              <iframe title="report-pdf" src={pdfUrl} style={{ width: '100%', height: 640, border: '1px solid #ddd' }} />
            </div>
          )}

          {/* None / placeholder */}
          {viewMode === 'none' && (
            <div className="text-muted">Choose <strong>Get JSON</strong> or <strong>Preview PDF</strong> to view content here.</div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}
