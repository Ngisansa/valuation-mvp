import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [vals, setVals] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    (async () => {
      const resp = await axios.get(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}/api/valuations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVals(resp.data.data);
    })();
  }, [token]);

  const download = (v) => {
    if (!v.pdf_path) {
      alert('No PDF generated yet. Click Generate PDF.');
      return;
    }
    window.location = `${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}/api/pdf/download/${v.pdf_path}?token=${token}`;
  };

  const generate = async (v) => {
    try {
      const resp = await axios.post(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}/api/pdf/generate/${v.id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('PDF generation started');
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Your Valuations</h2>
      {vals.map(v => (
        <div key={v.id} style={{ border: '1px solid #eee', padding: 10, marginBottom: 10 }}>
          <div>Type: {v.type}</div>
          <div>Created: {v.created_at}</div>
          <div>Confidence: {v.confidence}</div>
          <div>
            <button onClick={()=>generate(v)}>Generate PDF</button>
            <button onClick={()=>download(v)}>Download PDF</button>
          </div>
        </div>
      ))}
    </div>
  );
}