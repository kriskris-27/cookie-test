import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:4000/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Login failed');
        return;
      }
      onLogin();
    } catch {
      setError('Network error');
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}

function Dashboard({ onLogout }) {
  const [user, setUser] = useState(null);
  const [modules, setModules] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:4000/api/me', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then(setUser)
      .catch(() => navigate('/login'));
  }, [navigate]);

  useEffect(() => {
    fetch('http://localhost:4000/api/modules', { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(setModules);
  }, []);

  const handleLogout = async () => {
    await fetch('http://localhost:4000/api/logout', { method: 'POST', credentials: 'include' });
    onLogout();
    navigate('/login');
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="dashboard-container">
      <h2>Welcome, {user.name}</h2>
      <button onClick={handleLogout}>Logout</button>
      <h3>Modules</h3>
      <ul>
        {modules.map(m => (
          <li key={m.id}><b>{m.name}</b>: {m.description}</li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetch('http://localhost:4000/api/me', { credentials: 'include' })
      .then(res => setIsAuthenticated(res.ok));
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={() => setIsAuthenticated(true)} />
        } />
        <Route path="/dashboard" element={
          isAuthenticated ? <Dashboard onLogout={() => setIsAuthenticated(false)} /> : <Navigate to="/login" />
        } />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
