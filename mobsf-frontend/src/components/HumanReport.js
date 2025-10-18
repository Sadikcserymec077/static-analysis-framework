import React from "react";
import { Card, Badge, Table, Row, Col, ListGroup, Container } from "react-bootstrap";
import { PieChart, Pie, Cell } from "recharts";

/*
  HumanReport — Chart & Score at top with smaller APK info for more space.
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

  // --- Basic metadata
  const appName = data.app_name || data.APP_NAME || data.file_name || data.file || "(unknown)";
  const fileName = data.file_name || data.FILE_NAME || "(unknown)";
  const size = data.size || data.file_size || data.apk_size || "unknown";
  const packageName = data.package_name || data.PACKAGE_NAME || "(unknown)";
  const versionName = data.version_name || data.VERSION_NAME || "-";
  const targetSdk = data.target_sdk || data.TargetSdkVersion || "-";
  const minSdk = data.min_sdk || data.MinSdkVersion || "-";
  const md5 = data.hash || data.MD5 || data.md5 || "(n/a)";

  // --- Findings normalization
  const manifestAnalysis = data.manifest_analysis || data.Manifest || data.manifest || {};
  const manifestFindingsRaw = Array.isArray(manifestAnalysis.manifest_findings)
    ? manifestAnalysis.manifest_findings
    : Array.isArray(manifestAnalysis.findings)
    ? manifestAnalysis.findings
    : [];
  const manifestFindings = manifestFindingsRaw.filter(
    (item) => item && (typeof item !== "string" || item.trim() !== "")
  );

  const apiFindings = Array.isArray(data.api) ? data.api : Array.isArray(data.api_findings) ? data.api_findings : [];
  const otherFindings = Array.isArray(data.vulnerabilities) ? data.vulnerabilities : [];

  const raw = [...manifestFindings, ...apiFindings, ...otherFindings];

  const normalizeFinding = (f) => {
    if (!f) return null;
    const title = f.title || f.name || f.check || f.issue || (typeof f === "string" ? f : f.rule || JSON.stringify(f).slice(0, 60));
    const severity = (f.severity || f.level || f.risk || "").toString().toLowerCase() || "info";
    const description = f.description || f.desc || f.details || f.message || f.snippet || f.detail || "";
    const path = f.path || f.file || f.location || f.component || "";
    const remediation =
      f.remediation || f.fix || f.recommendation || f.fix_recommendation || f.remediation_text || null;
    return { title, severity, description, path, remediation };
  };

  const findings = raw.map(normalizeFinding).filter(Boolean);

  // --- Counts & Score
  const counts = findings.reduce(
    (acc, f) => {
      const s = (f.severity || "info").toLowerCase();
      if (s.includes("high") || s.includes("critical")) acc.high++;
      else if (s.includes("warn") || s.includes("medium") || s === "warning") acc.medium++;
      else acc.info++;
      return acc;
    },
    { high: 0, medium: 0, info: 0 }
  );

  const score = Math.max(0, 100 - (counts.high * 8 + counts.medium * 4 + counts.info * 1));

  // --- Pie Data
  const pieData = [
    { name: "High", key: "high", value: counts.high, color: SEVERITY_COLORS.high },
    { name: "Medium", key: "medium", value: counts.medium, color: SEVERITY_COLORS.medium },
    { name: "Info", key: "info", value: counts.info, color: SEVERITY_COLORS.info },
  ];

  // --- Finding categories
  const highFindings = findings.filter((f) => (f.severity || "").includes("high") || (f.severity || "").includes("critical"));
  const medFindings = findings.filter((f) => (f.severity || "").includes("warn") || (f.severity || "").includes("medium"));
  const infoFindings = findings.filter(
    (f) =>
      !(
        (f.severity || "").includes("high") ||
        (f.severity || "").includes("warn") ||
        (f.severity || "").includes("medium") ||
        (f.severity || "").includes("critical")
      )
  );

  // --- Permissions
  const permsObj = data.permissions || data.Permission || data.manifest_permissions || {};
  const dangerousPerms = Object.entries(permsObj)
    .filter(([k, v]) => {
      if (!v) return false;
      const vv = typeof v === "string" ? v : v.status || v.level || v.risk || v.description || "";
      return /(dangerous|danger|privileged)/i.test(vv) || /(WRITE|RECORD|CALL|SMS|LOCATION|CAMERA|STORAGE|CONTACTS)/i.test(k);
    })
    .map(([k, v]) => ({ name: k, info: typeof v === "string" ? v : v.description || JSON.stringify(v) }));

  // --- Render
  return (
    <div>
      {/* === Top Section: Chart, Score, APK Info === */}
      <Card className="mb-3 shadow-sm">
        <Card.Body>
          <Container>
            <Row className="align-items-center">
              {/* Chart */}
              <Col md={4} className="text-center">
{/* Chart box (no on-slice labels) */}
<div style={{ width: 180, height: 140, margin: "0 auto" }}>
  <PieChart width={160} height={120}>
    <Pie
      data={pieData}
      dataKey="value"
      nameKey="name"
      cx="50%"
      cy="50%"
      outerRadius={44}
      innerRadius={20}
      labelLine={false}
      // remove label to avoid truncated text on small charts
      label={false}
    >
      {pieData.map((entry, idx) => (
        <Cell key={`cell-${idx}`} fill={entry.color} />
      ))}
    </Pie>
  </PieChart>
</div>
<div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
  {pieData.map((d) => (
    <div key={d.key} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 12, height: 12, background: d.color, display: "inline-block", borderRadius: 3 }} />
      <small style={{ color: "#333", fontSize: 14 }}>
        <strong style={{ marginRight: 6 }}>{d.name}:</strong> {d.value}
      </small>
    </div>
  ))}
</div>
              </Col>

              {/* Score */}
              <Col md={4} className="text-center">
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Security Score</div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: score > 80 ? "#2ca02c" : score > 50 ? SEVERITY_COLORS.medium : SEVERITY_COLORS.high,
                  }}
                >
                  {score} / 100
                </div>
                <div style={{ marginTop: 10, width: 160, margin: "8px auto 0" }}>
                  <div style={{ height: 10, background: "#eee", borderRadius: 6, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${score}%`,
                        height: "100%",
                        background: score > 80 ? "#2ca02c" : score > 50 ? SEVERITY_COLORS.medium : SEVERITY_COLORS.high,
                      }}
                    />
                  </div>
                </div>
              </Col>

              {/* Small APK Info */}
              <Col md={4}>
                <Table borderless size="sm" className="table-compact">
                  <tbody>
                    <tr><th>Name</th><td>{appName}</td></tr>
                    <tr><th>File</th><td>{fileName}</td></tr>
                    <tr><th>Pkg</th><td>{packageName}</td></tr>
                    <tr><th>Ver</th><td>{versionName}</td></tr>
                    <tr><th>Size</th><td>{size}</td></tr>
                    <tr><th>SDK</th><td>{targetSdk}/{minSdk}</td></tr>
                  </tbody>
                </Table>
              </Col>
            </Row>
          </Container>
        </Card.Body>
      </Card>

      {/* === Report Details === */}
      <Card className="mb-3 shadow-sm">
        <Card.Body>
          <Card.Title>⚠️ Key Vulnerabilities</Card.Title>

          {/* High */}
          <h6 className="text-danger">High ({highFindings.length})</h6>
          {highFindings.length === 0 ? (
            <div className="text-muted small">No high severity issues.</div>
          ) : (
            <ListGroup className="mb-3">
              {highFindings.map((f, i) => (
                <ListGroup.Item key={i}>
                  <strong>{f.title}</strong> <SeverityBadge sev={f.severity} />
                  <div className="small text-muted">{short(f.description)}</div>
                  {f.remediation && (
                    <>
                      <div className="small text-muted mt-1">Fix:</div>
                      <em>{short(f.remediation, 400)}</em>
                    </>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}

          {/* Medium */}
          <h6 className="text-warning">Medium ({medFindings.length})</h6>
          {medFindings.length === 0 ? (
            <div className="text-muted small">No medium severity issues.</div>
          ) : (
            <ListGroup className="mb-3">
              {medFindings.map((f, i) => (
                <ListGroup.Item key={i}>
                  <strong>{f.title}</strong> <SeverityBadge sev={f.severity} />
                  <div className="small text-muted">{short(f.description)}</div>
                  {f.remediation && (
                    <>
                      <div className="small text-muted mt-1">Fix:</div>
                      <em>{short(f.remediation, 400)}</em>
                    </>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}

          {/* Info */}
          <h6 className="text-info">Other findings ({infoFindings.length})</h6>
          {infoFindings.length === 0 ? (
            <div className="text-muted small">No other issues.</div>
          ) : (
            <ListGroup className="mb-3">
              {infoFindings.map((f, i) => (
                <ListGroup.Item key={i}>
                  <strong>{f.title}</strong> <SeverityBadge sev={f.severity} />
                  <div className="small text-muted">{short(f.description)}</div>
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
              {dangerousPerms.map((p, i) => (
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
