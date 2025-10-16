import React, { useState } from 'react';
import UploadForm from './components/UploadForm';
import ScansList from './components/ScansList';
import ReportView from './components/ReportView';

function App(){
  const [selected, setSelected] = useState(null);
  // selected can be { MD5: '...', FILE_NAME: ..., ... } or {hash,...} returned from upload
  const hash = selected?.MD5 || selected?.hash;

  return (
    <div style={{padding:20}}>
      <h1>MobSF Static Analysis UI</h1>
      <div style={{display:'flex', gap:20}}>
        <div style={{flex:1}}>
          <UploadForm onUpload={data => setSelected(data)} />
          <ScansList onSelect={s => setSelected(s)} />
        </div>
        <div style={{flex:2}}>
          <h2>Selected: {hash || 'none'}</h2>
          <ReportView hash={hash} />
        </div>
      </div>
    </div>
  );
}

export default App;
