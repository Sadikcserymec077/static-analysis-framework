// src/components/HumanReport.js
import React from "react";
import { Card, Badge, Table, Row, Col, ListGroup } from "react-bootstrap";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

/*
  HumanReport (layout-safe)
  - Chart is fixed-size and centered to avoid overlap/override.
  - Legend rendered as simple badges below the chart (no Recharts Legend).
*/

const SEVERITY_COLORS = {
  high: "#e63946",      // red
  medium: "#f4c542",    // yellow
  info: "#59b5ff",      // sky blue
};

function SeverityBadge({ sev }) {
  if (!sev) return null;
  const s = (sev || "").toLowerCase();
  if (s.includes("high") || s.includes("critical")) return <Badge bg="danger" className="ms-1">High</Badge>;
  if (s.includes("warn") || s.includes("medium") || s.includes("warning")) return <Badge bg="warning" text="dark" className="ms-1">Medium</Badge>;
  return <Badge bg="info" className="ms-1">Normal</Badge>;
}

const short = (t, n = 160) => typeof t === "string" ? (t.length > n ? t.slice(0, n) + "…" : t) : (t ? String(t).slice(0, n) : "");

export default function HumanReport({ data }) {
  if (!data) return <div className="text-muted">No report loaded.</div>;

  const appName = data.app_name || data.APP_NAME || data.file_name || data.file || "(unknown)";
  const fileName = data.file_name || data.FILE_NAME || "(unknown)";
  const size = data.size || data.file_size || data.apk_size || "unknown";
  const packageName = data.package_name || data.PACKAGE_NAME || "(unknown)";
  const versionName = data.version_name || data.VERSION_NAME || "-";
  const targetSdk = data.target_sdk || data.TargetSdkVersion || "-";
  const minSdk = data.min_sdk || data.MinSdkVersion || "-";
  const md5 = data.hash || data.MD5 || data.md5 || "(n/a)";

  // Normalize findings from common places
  const manifestAnalysis = data.manifest_analysis || data.Manifest || data.manifest || {};
  const manifestFindingsRaw = Array.isArray(manifestAnalysis.manifest_findings) ? manifestAnalysis.manifest_findings : (Array.isArray(manifestAnalysis.findings) ? manifestAnalysis.findings : []);
  const manifestFindings = manifestFindingsRaw.filter(item => item && (typeof item !== 'string' || item.trim() !== ''));

  const apiFindings = Array.isArray(data.api) ? data.api : (Array.isArray(data.api_findings) ? data.api_findings : []);
  const otherFindings = Array.isArray(data.vulnerabilities) ? data.vulnerabilities : [];

  const raw = [
    ...manifestFindings,
    ...apiFindings,
    ...otherFindings,
  ];

  const normalizeFinding = (f) => {
    if (!f) return null;
    const title = f.title || f.name || f.check || f.issue || (typeof f === "string" ? f : (f.issue_title || f.rule || JSON.stringify(f).slice(0,60)));
    const severity = (f.severity || f.level || f.risk || "").toString().toLowerCase() || "info";
    const description = f.description || f.desc || f.details || f.message || f.snippet || f.detail || "";
    const path = f.path || f.file || f.location || f.component || "";
    const remediation = f.remediation || f.fix || f.recommendation || f.fix_recommendation || f.remediation_text || null;
    return { title, severity, description, path, remediation };
  };

  const findings = raw.map(normalizeFinding).filter(Boolean);

  // compute counts reliably
  const counts = findings.reduce((acc, f) => {
    const s = (f.severity || "info").toLowerCase();
    if (s.includes("high") || s.includes("critical")) acc.high++;
    else if (s.includes("warn") || s.includes("medium") || s === "warning") acc.medium++;
    else acc.info++;
    return acc;
  }, { high: 0, medium: 0, info: 0 });

  const score = Math.max(0, 100 - (counts.high * 8 + counts.medium * 4 + counts.info * 1));

  // Keep pie data in fixed order High/Medium/Info
  const pieData = [
    { name: 'High', key: 'high', value: counts.high, color: SEVERITY_COLORS.high },
    { name: 'Medium', key: 'medium', value: counts.medium, color: SEVERITY_COLORS.medium },
    { name: 'Info', key: 'info', value: counts.info, color: SEVERITY_COLORS.info },
  ];

  const highFindings = findings.filter(f => (f.severity||"").includes("high") || (f.severity||"").includes("critical"));
  const medFindings = findings.filter(f => (f.severity||"").includes("warn") || (f.severity||"").includes("medium") || (f.severity||"").includes("warning"));
  const infoFindings = findings.filter(f => !((f.severity||"").includes("high") || (f.severity||"").includes("warn") || (f.severity||"").includes("medium") || (f.severity||"").includes("critical")));

  // Dangerous permissions
  const permsObj = data.permissions || data.Permission || data.manifest_permissions || {};
  const dangerousPerms = Object.entries(permsObj).filter(([k,v]) => {
    if (!v) return false;
    const vv = typeof v === 'string' ? v : (v.status || v.level || v.risk || v.description || '');
    return /(dangerous|danger|privileged)/i.test(vv) || /(WRITE|RECORD|CALL|SMS|LOCATION|CAMERA|STORAGE|CONTACTS)/i.test(k);
  }).map(([k,v]) => ({ name: k, info: typeof v === 'string' ? v : (v.description || JSON.stringify(v)) }));

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

            {/* Fixed-size chart column to prevent overlap */}
            <Col md={4} className="text-center d-flex flex-column align-items-center justify-content-center">
              <div className="humanreport-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={40}
                      innerRadius={20}
                      labelLine={false}
                      label={({ name, value }) => (value > 0 ? `${name}: ${value}` : '')}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Custom compact legend (stable, won't cause layout shifts) */}
              <div className="humanreport-legend mt-2">
                {pieData.map(d => (
                  <span key={d.key} style={{ marginRight: 10, display: 'inline-flex', alignItems: 'center', gap:6 }}>
                    <span style={{ width:12, height:12, background:d.color, display:'inline-block', borderRadius:3 }} />
                    <small style={{ color: '#333' }}>{d.name}: <strong>{d.value}</strong></small>
                  </span>
                ))}
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
                    <div style={{flex:1}}>
                      <strong>{f.title}</strong> <SeverityBadge sev={f.severity} />
                      <div className="small text-muted">{short(f.description)}</div>
                      {f.path && <div className="small text-muted">Path: {f.path}</div>}
                    </div>
                    <div style={{minWidth:240}}>
                      {f.remediation ? (
                        <>
                          <div className="small text-muted">Fix recommendation:</div>
                          <div style={{marginTop:6}}><em>{short(f.remediation, 400)}</em></div>
                        </>
                      ) : (
                        <div className="small text-muted">No fix recommendation provided in report.</div>
                      )}
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
                    <div style={{flex:1}}>
                      <strong>{f.title}</strong> <SeverityBadge sev={f.severity} />
                      <div className="small text-muted">{short(f.description)}</div>
                    </div>
                    <div style={{minWidth:240}}>
                      {f.remediation ? (
                        <>
                          <div className="small text-muted">Fix recommendation:</div>
                          <div style={{marginTop:6}}><em>{short(f.remediation, 400)}</em></div>
                        </>
                      ) : (
                        <div className="small text-muted">No fix recommendation provided in report.</div>
                      )}
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
                    <strong>{f.title}</strong> <SeverityBadge sev={f.severity} />
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
