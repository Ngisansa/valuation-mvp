import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import App from './App'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Wizard from './pages/Wizard'
import Dashboard from './pages/Dashboard'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <nav style={{ padding: 10 }}>
        <Link to="/">Home</Link> | <Link to="/signup">Signup</Link> | <Link to="/login">Login</Link> | <Link to="/wizard">Valuation Wizard</Link> | <Link to="/dashboard">Dashboard</Link>
      </nav>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/wizard" element={<Wizard />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)