import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import NavBar from './components/NavBar';
import UploadCard from './components/UploadCard';
import ScansCard from './components/ScansCard';
import ReportPanel from './components/ReportPanel';

function App() {
  const [selected, setSelected] = useState(null); // object with hash, etc.
  // const [savedJsonPath, setSavedJsonPath] = useState(null);

  return (
    <>
      <NavBar />
      <Container fluid>
        <Row>
          <Col md={4}>
          <UploadCard onUploaded={(data) => { setSelected({ hash: data.hash }); if (data.jsonPath) setSelected(prev => ({ ...(prev||{}), jsonPath: data.jsonPath })); }} />
            <ScansCard onSelect={(s) => setSelected({ hash: s.MD5 || s.MD5 || s.MD5, ...s })} />
          </Col>

          <Col md={8}>
          <ReportPanel hash={selected?.hash} initialJsonPath={selected?.jsonPath} />
          </Col>
        </Row>
      </Container>
      <footer className="text-center text-muted py-3">
        <small>MobSF UI — built with ❤️ & Bootstrap</small>
      </footer>
    </>
  );
}

export default App;
