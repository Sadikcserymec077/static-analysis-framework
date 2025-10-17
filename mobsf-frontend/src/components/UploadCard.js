// src/components/UploadCard.js
import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, ProgressBar, Form } from 'react-bootstrap';
import { uploadFile, triggerScan, getScanLogs, saveJsonReport } from '../api';

export default function UploadCard({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, uploading, uploaded, scanning, ready, error
  const [message, setMessage] = useState('');
  const [hash, setHash] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const startPolling = (h) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const r = await getScanLogs(h);
        const logs = r.data.logs || [];
        const joined = JSON.stringify(logs).toLowerCase();

        // keywords that indicate report is being generated or finished
        const readyKeywords = [
          'generating report',
          'generating hashes',
          'generation complete',
          'completed',
          'finished',
          'saving to database',
          'saved to database',
          'saving results',
          'report generated'
        ];

        const isReady = readyKeywords.some(k => joined.includes(k));

        if (isReady) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setStatus('ready');
          setMessage('Scan completed — fetching & saving JSON report...');

          try {
            const saveResp = await saveJsonReport(h);
            const path = (saveResp?.data?.path) || `/reports/json/${h}`;
            setMessage('Report saved: ' + path);
            onUploaded && onUploaded({ hash: h, jsonPath: path });
          } catch (e) {
            setStatus('error');
            setMessage('Failed to save report: ' + (e?.response?.data?.error?.report || JSON.stringify(e?.response?.data) || e.message));
          }
        } else {
          setStatus('scanning');
          // set a short preview message from last log entry
          const last = logs.length ? logs[logs.length - 1] : null;
          if (last && last.status) setMessage(`${last.timestamp || ''} — ${last.status}`);
        }
      } catch (err) {
        console.error('poll logs error', err);
        // if logs return 404 or not found, keep polling
        setMessage('Polling logs... (no chatty logs yet)');
      }
    }, 5000);
  };

  const handleUpload = async () => {
    if (!file) return setMessage('Choose an APK first.');
    setStatus('uploading'); setProgress(2); setMessage('Uploading...');
    try {
      const res = await uploadFile(file, (pe) => setProgress(Math.round((pe.loaded * 100) / pe.total)));
      const h = res.data.hash || res.data.MD5 || res.data.md5;
      setHash(h);
      setStatus('uploaded');
      setMessage('Uploaded — hash: ' + h);
      // trigger scan
      setStatus('scanning');
      await triggerScan(h);
      setMessage('Scan triggered — polling logs...');
      startPolling(h);
    } catch (err) {
      console.error(err);
      setStatus('error');
      const errMsg = err?.response?.data?.error || err?.message || 'Upload failed';
      setMessage(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    }
  };

  return (
    <Card className="mb-3 shadow-sm">
      <Card.Body>
        <Card.Title>Upload APK</Card.Title>
        <Form.Group controlId="fileInput" className="mb-2">
          <Form.Control type="file" accept=".apk,.zip,.xapk,.apks" onChange={handleChange} />
        </Form.Group>

        <div className="d-flex gap-2">
          <Button variant="primary" onClick={handleUpload} disabled={!file || status === 'uploading' || status === 'scanning'}>
            {status === 'uploading' ? 'Uploading…' : 'Upload & Scan'}
          </Button>
          <Button variant="outline-secondary" onClick={() => { setFile(null); setProgress(0); setMessage(''); setHash(null); }}>
            Reset
          </Button>
        </div>

        <div className="mt-3">
          <ProgressBar now={progress} label={progress > 0 ? `${progress}%` : ''} animated={status === 'uploading'} />
          <div className="mt-2 text-break" style={{ whiteSpace: 'pre-wrap' }}>{message}</div>
          {hash && <div className="small text-muted mt-1">Hash: {hash}</div>}
        </div>
      </Card.Body>
    </Card>
  );
}
