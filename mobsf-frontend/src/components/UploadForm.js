// src/components/UploadForm.js
import React, { useState, useEffect, useRef } from 'react';
import { uploadFile, triggerScan, getScanLogs, saveJsonReport, savePdfReport } from '../api';

export default function UploadForm({ onReportReady }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | uploading | scanning | ready | error
  const [hash, setHash] = useState(null);
  const [logs, setLogs] = useState([]);
  const [reportPath, setReportPath] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleChange = (e) => {
    setFile(e.target.files[0]);
  };

  const startPollingLogs = (h) => {
    // poll every 6 seconds
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await getScanLogs(h);
        const logsArray = r.data.logs || [];
        setLogs(logsArray);
        // check if report ready / completed
        const joined = JSON.stringify(logsArray).toLowerCase();
        if (joined.includes('generating report') || joined.includes('completed') || joined.includes('finished')) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setStatus('ready');
          // auto-save JSON report
          try {
            const saveResp = await saveJsonReport(h);
            setReportPath(saveResp.data.path || `/reports/json/${h}`);
            // optionally fetch PDF and make downloadable link
            // you may choose to call savePdfReport() instead of letting user press download
            onReportReady && onReportReady({ hash: h, jsonPath: saveResp.data.path });
          } catch (e) {
            // if save fails, still notify user and show option to try manually
            setStatus('error');
          }
        } else {
          setStatus('scanning');
        }
      } catch (err) {
        console.error('poll logs error', err);
      }
    }, 6000);
  };

  const handleUpload = async () => {
    if (!file) return alert('Choose a file first');
    setStatus('uploading');
    setProgress(0);
    try {
      const r = await uploadFile(file, (pe) => setProgress(Math.round((pe.loaded * 100) / pe.total)));
      const returnedHash = r.data.hash || r.data.MD5 || r.data.md5;
      setHash(returnedHash);
      setStatus('uploaded');

      // trigger scan (backend proxies to MobSF)
      await triggerScan(returnedHash);
      setStatus('scanning');
      // start polling
      startPollingLogs(returnedHash);
    } catch (err) {
      console.error(err);
      setStatus('error');
      alert('Upload failed: ' + (err?.response?.data?.error || err?.message || 'unknown'));
    }
  };

  // Optional: manual buttons for user to fetch report/pdf
  const manualFetchJson = async () => {
    if (!hash) return alert('No hash');
    setStatus('fetching');
    try {
      const resp = await saveJsonReport(hash);
      setReportPath(resp.data.path || `/reports/json/${hash}`);
      setStatus('ready');
      onReportReady && onReportReady({ hash, jsonPath: resp.data.path });
    } catch (e) {
      setStatus('error');
      alert('Fetch JSON failed: ' + (e?.response?.data?.error?.report || JSON.stringify(e?.response?.data) || e.message));
    }
  };

  const manualDownloadPdf = async () => {
    if (!hash) return alert('No hash');
    // Downloads blob via browser
    try {
      const resp = await savePdfReport(hash);
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${hash}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('PDF download failed: ' + (e?.response?.data?.error?.report || JSON.stringify(e?.response?.data) || e.message));
    }
  };

  return (
    <div>
      <h3>Upload APK / ZIP</h3>
      <input type="file" accept=".apk,.zip,.xapk,.apks" onChange={handleChange} />
      <button onClick={handleUpload}>Upload & Scan</button>
      <div>Progress: {progress}%</div>
      <div>Status: <strong>{status}</strong></div>

      {hash && (
        <div style={{ marginTop: 8 }}>
          <div><strong>Hash:</strong> {hash}</div>
          <div style={{ marginTop: 6 }}>
            <button onClick={manualFetchJson}>Fetch / Save JSON Now</button>
            <button onClick={manualDownloadPdf} style={{ marginLeft: 8 }}>Download PDF</button>
            {reportPath && <a href={`${reportPath}`} target="_blank" rel="noreferrer" style={{ marginLeft: 10 }}>Open saved JSON</a>}
          </div>
          <div style={{ marginTop: 10 }}>
            <strong>Recent logs (last 6):</strong>
            <ul>
              {logs.slice(-6).map((l, i) => <li key={i}>{l.timestamp ? `${l.timestamp} — ${l.status}` : JSON.stringify(l)}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
