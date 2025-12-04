import React, { useState } from 'react';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const submit = async () => {
    try {
      const resp = await axios.post(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}/api/auth/login`, { email, password });
      localStorage.setItem('token', resp.data.token);
      localStorage.setItem('user', JSON.stringify(resp.data.user));
      setMsg('logged in');
    } catch (e) {
      setMsg(e.response?.data?.error || e.message);
    }
  };
  return (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>
      <input placeholder="email" value={email} onChange={(e)=>setEmail(e.target.value)} /> <br/>
      <input placeholder="password" value={password} onChange={(e)=>setPassword(e.target.value)} type="password" /> <br/>
      <button onClick={submit}>Login</button>
      <p>{msg}</p>
    </div>
  );
}