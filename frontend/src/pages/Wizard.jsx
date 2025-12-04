import React, { useState } from 'react';
import axios from 'axios';

export default function Wizard() {
  const [type, setType] = useState('property');
  const [inputs, setInputs] = useState({});
  const [result, setResult] = useState(null);

  const token = localStorage.getItem('token');

  const submit = async () => {
    try {
      const resp = await axios.post(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}/api/valuations`, { type, inputs }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(resp.data.valuation);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Valuation Wizard (minimal)</h2>
      <label>Type:
        <select value={type} onChange={(e)=>setType(e.target.value)}>
          <option value="property">Property/Land</option>
          <option value="business">Business</option>
          <option value="shares">Shares</option>
        </select>
      </label>

      {type === 'property' && (
        <div>
          <input placeholder="lat" onChange={(e)=>setInputs({...inputs, lat: parseFloat(e.target.value)})} />
          <input placeholder="lon" onChange={(e)=>setInputs({...inputs, lon: parseFloat(e.target.value)})} />
          <input placeholder="area_sqm" onChange={(e)=>setInputs({...inputs, area_sqm: parseFloat(e.target.value)})} />
          <input placeholder="property_type" onChange={(e)=>setInputs({...inputs, property_type: e.target.value})} />
          <input placeholder="noi (optional)" onChange={(e)=>setInputs({...inputs, noi: parseFloat(e.target.value)})} />
          <input placeholder="cap_rate (e.g., 0.08)" onChange={(e)=>setInputs({...inputs, cap_rate: parseFloat(e.target.value)})} />
          <input placeholder="replacement_cost (optional)" onChange={(e)=>setInputs({...inputs, replacement_cost: parseFloat(e.target.value)})} />
        </div>
      )}

      <button onClick={submit}>Estimate</button>

      {result && (
        <div>
          <h3>Result</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}