// src/components/ReportPanel.js
import React, { useState, useEffect } from "react";
import { Card, Button, Badge } from "react-bootstrap";
import { getReportJSON, getCrucial, savePdfReport, saveJsonReport } from "../api";
import HumanReport from "./HumanReport";

export default function ReportPanel({ hash, initialJsonPath }) {
  const [report, setReport] = useState(null);
  const [jsonPath, setJsonPath] = useState(initialJsonPath || null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [msg, setMsg] = useState("");
  const [viewMode, setViewMode] = useState("none"); // 'none' | 'json' | 'pdf' | 'summary'

  useEffect(() => {
    // Reset on hash change
    setReport(null);
    setJsonPath(initialJsonPath || null);
    setSummary(null);
    setPdfUrl(null);
    setMsg("");
    setViewMode("none");
  }, [hash, initialJsonPath]);

  // Get JSON (try direct, fallback to save)
  const handleGetJSON = async () => {
    if (!hash) { setMsg("No hash selected"); return; }
    setLoading(true); setMsg("Loading JSON report...");
    try {
      const r = await getReportJSON(hash);
      setReport(r.data);
      setViewMode("json");
      setMsg("");
    } catch (err) {
      // fallback: save & load
      try {
        const r2 = await saveJsonReport(hash);
        const payload = r2.data.data || r2.data;
        setReport(payload);
        setJsonPath(r2.data.path || `/reports/json/${hash}`);
        setViewMode("json");
        setMsg("");
      } catch (e) {
        const body = e?.response?.data || e?.message;
        setMsg("JSON fetch failed: " + (typeof body === "string" ? body : JSON.stringify(body)));
      }
    } finally { setLoading(false); }
  };

  const handleGetSummary = async () => {
    if (!hash) { setMsg("No hash selected"); return; }
    setLoading(true); setMsg("Loading summary...");
    try {
      const r = await getCrucial(hash);
      setSummary(r.data);
      setViewMode("summary");
      setMsg("");
    } catch (e) {
      setMsg("Summary failed: " + (e?.response?.data || e?.message));
    } finally { setLoading(false); }
  };

  const handlePreviewPDF = async () => {
    if (!hash) { setMsg("No hash selected"); return; }
    setLoading(true); setMsg("Fetching PDF...");
    try {
      const r = await savePdfReport(hash); // blob response
      const blob = new Blob([r.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setViewMode("pdf");
      setMsg("PDF preview loaded below.");
    } catch (e) {
      setMsg("PDF fetch failed: " + (e?.response?.data || e?.message));
    } finally { setLoading(false); }
  };

  const handleDownloadPdf = async () => {
    if (!hash) { setMsg("No hash selected"); return; }
    setMsg("Preparing PDF for download...");
    try {
      const r = await savePdfReport(hash);
      const blob = new Blob([r.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${hash}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg("Download started.");
    } catch (e) {
      setMsg("Download failed: " + (e?.response?.data || e?.message));
    }
  };

  const closePdf = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setViewMode("none");
  };

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <Card.Title>Report</Card.Title>
            <div className="text-muted">Hash: <Badge bg="light" text="dark">{hash || "none"}</Badge></div>
          </div>

          <div>
            <Button variant="outline-primary" size="sm" onClick={handleGetJSON} disabled={!hash || loading}>Get JSON</Button>{' '}
            <Button variant="outline-secondary" size="sm" onClick={handleGetSummary} disabled={!hash || loading}>Get Summary</Button>{' '}
            <Button variant="warning" size="sm" onClick={handlePreviewPDF} disabled={!hash || loading}>Preview PDF</Button>
            {viewMode === 'pdf' && <Button variant="outline-danger" size="sm" onClick={closePdf} style={{ marginLeft: 8 }}>Close PDF</Button>}
          </div>
        </div>

        {msg && <div className="alert alert-info py-1">{msg}</div>}

        {/* JSON -> Human friendly */}
        {viewMode === 'json' && report && (
          <div>
            <HumanReport data={report} />
          </div>
        )}

        {/* Summary (crucial) */}
        {viewMode === 'summary' && summary && (
          <div style={{ maxHeight: 560, overflow: 'auto' }}>
            <h6>Summary ({summary.count})</h6>
            <ul>
              {summary.findings.map((f,i)=>(
                <li key={i}><strong>{f.path}</strong>: {f.snippet}</li>
              ))}
            </ul>
          </div>
        )}

        {/* PDF preview */}
        {viewMode === 'pdf' && pdfUrl && (
          <div>
            <iframe title="report-pdf" src={pdfUrl} style={{ width: '100%', height: 640, border: '1px solid #ddd', borderRadius: 6 }} />
          </div>
        )}

        {/* placeholder */}
        {viewMode === 'none' && <div className="text-muted">Choose Get JSON, Get Summary or Preview PDF.</div>}

        {/* Download PDF button (always show when there's a hash) */}
        <div className="mt-3 d-flex justify-content-end">
          <Button variant="success" onClick={handleDownloadPdf} disabled={!hash}>Download PDF Report</Button>
        </div>
      </Card.Body>
    </Card>
  );
}
