// src/components/HumanReport.js
import React, { useMemo } from "react";
import { Card, Badge, Table, Row, Col, ListGroup } from "react-bootstrap";
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";

/*
  HumanReport
  Props:
    - data: the MobSF JSON report object
*/

const SEVERITY_COLORS = {
  high: "#e63946",      // red
  warning: "#f4c542",   // yellow
  info: "#59b5ff",      // sky blue
};

function SeverityBadge({ sev }) {
  if (!sev) return null;
  if (sev === "high") return <Badge bg="danger" className="ms-1">High</Badge>;
  if (sev === "warning") return <Badge bg="warning" text="dark" className="ms-1">Medium</Badge>;
  return <Badge bg="info" className="ms-1">Normal</Badge>;
}

// Simple mapping of issue title -> recommended fix (editable / extendable)
const FIX_SUGGESTIONS = [
  { match: /hardcoded/i, fix: "Remove hardcoded secrets. Use secure storage and environment variables." },
  { match: /insecure|http:/i, fix: "Use TLS (HTTPS) for network calls and validate certificates." },
  { match: /exported activity/i, fix: "Restrict exported activities or add permission checks." },
  { match: /allowbackup|backup/i, fix: "Disable backup or prevent sensitive file backups." },
  { match: /adb|root/i, fix: "Avoid executing code requiring root/adb. Harden native libraries." },
  { match: /sql injection|sql injection/i, fix: "Sanitize inputs and use prepared statements." },
  { match: /weak crypt|weak key|ECB/i, fix: "Use modern crypto (AES-GCM) and secure key management." },
  { match: /cleartext password|credential/i, fix: "Never store passwords in plaintext; use secure vaults." },
  { match: /debuggable/i, fix: "Turn off debuggable flag in production builds." },
  // fallback
  { match: /.*/, fix: "Review this finding and apply appropriate secure coding or configuration changes." },
];

function recommendFix(title) {
  const found = FIX_SUGGESTIONS.find(s => s.match.test(title));
  return found ? found.fix : FIX_SUGGESTIONS[FIX_SUGGESTIONS.length - 1].fix;
}

export default function HumanReport({ data }) {
  if (!data) return <div className="text-muted">No report loaded.</div>;

  // Attempt to extract common fields (MobSF report structures vary slightly)
  const appName = data.app_name || data.APP_NAME || data.AppName || data.file_name || data.file || "(unknown)";
  const fileName = data.file_name || data.FILE_NAME || data.filename || "(unknown)";
  const size = data.size || data.SIZE || data.apk_size || data.file_size || "unknown";
  const packageName = data.package_name || data.PACKAGE_NAME || data.package || data.APP_PACKAGE_NAME || "(unknown)";
  const versionName = data.version_name || data.VERSION_NAME || data.version || "-";
  const targetSdk = data.target_sdk || data.TargetSdkVersion || data.target_sdk_version || "-";
  const minSdk = data.min_sdk || data.MinSdkVersion || "-";
  const md5 = data.hash || data.MD5 || data.MD5SUM || data.md5 || "(n/a)";

  // Findings: try to locate common places MobSF puts 'findings' or 'manifest_analysis' etc.
  const manifestAnalysis = data.manifest_analysis || data.Manifest || data.manifest || {};
  const manifestFindings = manifestAnalysis.manifest_findings || manifestAnalysis.findings || manifestAnalysis.report || [];

  // Some MobSF JSONs put API findings in "api" or "api_findings" etc.
  const apiFindings = data.api || data.api_results || data.api_findings || [];

  // Build a unified list of findings: normalize to { title, severity, description, path }
  const normalizeFinding = (f) => {
    if (!f) return null;
    // Different shapes handled
    const title = f.title || f.name || f.check || f.issue || (typeof f === 'string' ? f : JSON.stringify(f).slice(0,60));
    const severity = (f.severity || f.level || f.risk || "").toString().toLowerCase();
    const desc = f.description || f.desc || f.details || f.message || f.snippet || "";
    const path = f.path || f.file || f.location || "";
    return { title, severity: severity || "info", description: desc, path };
  };

  const findingsRaw = [
    ... (Array.isArray(manifestFindings) ? manifestFindings : []),
    ... (Array.isArray(apiFindings) ? apiFindings : []),
    // some reports embed "dynamic" or "vulnerabilities" nodes
    ... (Array.isArray(data.vulnerabilities) ? data.vulnerabilities : []),
  ];

  const findings = findingsRaw
    .map(normalizeFinding)
    .filter(Boolean);

  // classify counts
  const counts = findings.reduce((acc, f) => {
    if (!f) return acc;
    const s = (f.severity || "info").toLowerCase();
    if (s.includes("high") || s === "high" || s.includes("critical")) acc.high++;
    else if (s.includes("warn") || s === "warning" || s === "medium") acc.medium++;
    else acc.info++;
    return acc;
  }, { high: 0, medium: 0, info: 0 });

  // Score: simple function - penalize high and medium
  const score = Math.max(0, 100 - (counts.high * 8 + counts.medium * 4 + counts.info * 1));
  const pieData = [
    { name: 'High', value: counts.high, color: SEVERITY_COLORS.high },
    { name: 'Medium', value: counts.medium, color: SEVERITY_COLORS.warning },
    { name: 'Info', value: counts.info, color: SEVERITY_COLORS.info },
  ];

  // pick top issues
  const highFindings = findings.filter(f => (f.severity || "").toLowerCase().includes("high") || (f.severity || "").toLowerCase().includes("critical")).slice(0, 50);
  const medFindings = findings.filter(f => (f.severity || "").toLowerCase().includes("warn") || (f.severity || "").toLowerCase().includes("medium") || (f.severity || "").toLowerCase().includes("warning")).slice(0, 50);
  const infoFindings = findings.filter(f => !((f.severity || "").toLowerCase().includes("high") || (f.severity || "").toLowerCase().includes("warn") || (f.severity || "").toLowerCase().includes("medium"))).slice(0, 50);

  // Dangerous permissions extraction
  const permsObj = data.permissions || data.Permission || data.manifest_permissions || {};
  const dangerousPerms = Object.entries(permsObj).filter(([k,v]) => {
    // MobSF may mark permission object with status or level
    if (!v) return false;
    const vv = typeof v === 'string' ? v : (v.status || v.level || v.risk || '');
    return /(dangerous|danger|privileged)/i.test(vv) || /(WRITE|RECORD|CALL|SMS|LOCATION|CAMERA|STORAGE|CONTACTS)/i.test(k);
  }).map(([k,v]) => ({ name: k, info: typeof v === 'string' ? v : (v.description || v.info || JSON.stringify(v)) }));

  // helper for badge color
  const badgeFor = (s) => {
    const low = (s || "").toLowerCase();
    if (low.includes("high") || low.includes("critical")) return <Badge bg="danger">High</Badge>;
    if (low.includes("warn") || low.includes("medium")) return <Badge bg="warning" text="dark">Medium</Badge>;
    return <Badge bg="info">Normal</Badge>;
  };

  // small formatter for descriptions
  const short = (t, n=160) => typeof t === 'string' ? (t.length > n ? t.slice(0,n) + '…' : t) : JSON.stringify(t).slice(0,n);

  return (
    <div>
      {/* Overview */}
      <Card className="mb-3 shadow-sm">
        <Card.Body>
          <Card.Title>📱 Application Overview</Card.Title>
          <Row>
            <Col md={8}>
              <Table borderless size="sm">
                <tbody>
                  <tr><th>Name</th><td>{appName}</td></tr>
                  <tr><th>APK File</th><td>{fileName}</td></tr>
                  <tr><th>Package</th><td>{packageName}</td></tr>
                  <tr><th>Version</th><td>{versionName}</td></tr>
                  <tr><th>Size</th><td>{size}</td></tr>
                  <tr><th>Target / Min SDK</th><td>{targetSdk} / {minSdk}</td></tr>
                  <tr><th>Hash</th><td style={{wordBreak:'break-all'}}>{md5}</td></tr>
                </tbody>
              </Table>
            </Col>

            <Col md={4} className="text-center">
              <div style={{height:120}}>
                <h6 className="mb-2">Security Score</h6>
                <div style={{fontSize:22, fontWeight:700}}>{score} / 100</div>
                <div className="mt-2">
                  <div style={{height:10, background:'#eee', borderRadius:6, overflow:'hidden'}}>
                    <div style={{
                      width: `${score}%`,
                      height: '100%',
                      background: score > 80 ? '#2ca02c' : score > 50 ? '#f4c542' : '#e63946'
                    }} />
                  </div>
                </div>
              </div>

              <div style={{height:170}}>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={pieData.filter(d=>d.value>0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={50}
                      label={(entry)=>entry.value>0?entry.name:''}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={20} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Key Vulnerabilities */}
      <Card className="mb-3 shadow-sm">
        <Card.Body>
          <Card.Title>⚠️ Key Vulnerabilities</Card.Title>

          <h6 className="text-danger">High ({highFindings.length})</h6>
          {highFindings.length === 0 ? <div className="text-muted small">No high severity issues.</div> : (
            <ListGroup className="mb-3">
              {highFindings.map((f,i)=>(
                <ListGroup.Item key={i}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>{f.title}</strong> {badgeFor(f.severity)}
                      <div className="small text-muted">{short(f.description)}</div>
                      {f.path && <div className="small text-muted">Path: {f.path}</div>}
                    </div>
                    <div style={{minWidth:240}}>
                      <div className="small text-muted">Fix recommendation:</div>
                      <div style={{marginTop:6}}><em>{recommendFix(f.title)}</em></div>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}

          <h6 className="text-warning">Medium ({medFindings.length})</h6>
          {medFindings.length === 0 ? <div className="text-muted small">No medium severity issues.</div> : (
            <ListGroup className="mb-3">
              {medFindings.map((f,i)=>(
                <ListGroup.Item key={i}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>{f.title}</strong> {badgeFor(f.severity)}
                      <div className="small text-muted">{short(f.description)}</div>
                    </div>
                    <div style={{minWidth:240}}>
                      <div className="small text-muted">Fix recommendation:</div>
                      <div style={{marginTop:6}}><em>{recommendFix(f.title)}</em></div>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}

          <h6 className="text-info">Other findings ({infoFindings.length})</h6>
          {infoFindings.length === 0 ? <div className="text-muted small">No other issues.</div> : (
            <ListGroup className="mb-3">
              {infoFindings.map((f,i)=>(
                <ListGroup.Item key={i}>
                  <div>
                    <strong>{f.title}</strong> {badgeFor(f.severity)}
                    <div className="small text-muted">{short(f.description)}</div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
      </Card>

      {/* Dangerous permissions */}
      <Card className="mb-3 shadow-sm">
        <Card.Body>
          <Card.Title>📜 Dangerous Permissions</Card.Title>
          {dangerousPerms.length === 0 ? (
            <div className="text-muted small">No dangerous permissions detected.</div>
          ) : (
            <ListGroup>
              {dangerousPerms.map((p, i)=>(
                <ListGroup.Item key={i}>
                  <strong>{p.name}</strong> <Badge bg="danger" className="ms-2">Dangerous</Badge>
                  <div className="small text-muted mt-1">{short(p.info)}</div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
