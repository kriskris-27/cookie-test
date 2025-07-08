import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';

// API base URL
const API_BASE = 'http://192.168.66.219:4000/api';

// Custom hook for API calls with automatic token refresh
function useApi() {
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken') || null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Save access token to localStorage when it changes
  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    } else {
      localStorage.removeItem('accessToken');
    }
  }, [accessToken]);

  // Function to refresh access token
  const refreshToken = useCallback(async () => {
    if (isRefreshing) return null;
    
    setIsRefreshing(true);
    try {
      const response = await fetch(`${API_BASE}/refresh-token`, {
        method: 'POST',
        credentials: 'include', // This sends the httpOnly refresh token cookie
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.accessToken);
        return data.accessToken;
      } else {
        // Refresh failed, clear tokens
        setAccessToken(null);
        return null;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      setAccessToken(null);
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // Function to make authenticated API calls
  const apiCall = useCallback(async (endpoint, options = {}) => {
    const makeRequest = async (token) => {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        credentials: 'include',
      });

      if (response.status === 401) {
        const errorData = await response.json();
        if (errorData.code === 'TOKEN_EXPIRED') {
          // Try to refresh token
          const newToken = await refreshToken();
          if (newToken) {
            // Retry the request with new token
            return makeRequest(newToken);
          }
        }
        throw new Error('Authentication failed');
      }

      return response;
    };

    return makeRequest(accessToken);
  }, [accessToken, refreshToken]);

  return { apiCall, accessToken, setAccessToken, refreshToken };
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store access token in memory (will be saved to localStorage by useApi hook)
        onLogin(data.accessToken);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>🔐 Hybrid Authentication Login</h2>
      <p className="subtitle">Access Token + Refresh Token Demo</p>
      
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
        {error && <div className="error">{error}</div>}
      </form>

      <div className="credentials">
        <h4>Test Credentials:</h4>
        <p><strong>Email:</strong> user@example.com</p>
        <p><strong>Password:</strong> password123</p>
      </div>
    </div>
  );
}

function Dashboard({ onLogout }) {
  const { apiCall, accessToken } = useApi();
  const [user, setUser] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load user profile
        const userResponse = await apiCall('/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
        }

        // Load modules
        const modulesResponse = await apiCall('/modules');
        if (modulesResponse.ok) {
          const modulesData = await modulesResponse.json();
          setModules(modulesData);
        }
      } catch (error) {
        setError('Failed to load data');
        console.error('Dashboard error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      loadData();
    }
  }, [apiCall, accessToken]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      onLogout();
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error">{error}</div>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="header">
        <h2>🎓 Learning Dashboard</h2>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>

      {user && (
        <div className="user-info">
          <h3>Welcome, {user.name}!</h3>
          <p>Email: {user.email}</p>
        </div>
      )}

      <div className="modules-section">
        <h3>📚 Available Modules</h3>
        <div className="modules-grid">
          {modules.map((module) => (
            <div key={module.id} className="module-card">
              <h4>{module.name}</h4>
              <p>{module.description}</p>
              <button className="start-btn">Start Learning</button>
            </div>
          ))}
        </div>
      </div>

      <div className="token-info">
        <h4>🔑 Token Information</h4>
        <p><strong>Access Token:</strong> {accessToken ? '✅ Present' : '❌ Missing'}</p>
        <p><strong>Refresh Token:</strong> ✅ In httpOnly Cookie (Secure)</p>
        <p><strong>Storage:</strong> Access token in localStorage, Refresh token in httpOnly cookie</p>
      </div>
    </div>
  );
}

function App() {
  const { accessToken, setAccessToken } = useApi();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!accessToken);
  }, [accessToken]);

  const handleLogin = (token) => {
    setAccessToken(token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setAccessToken(null);
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <Dashboard onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
