const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// In production, use environment variables
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-secret-key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key';

// Mock database for refresh tokens (in production, use real database)
const refreshTokens = new Map();

// Mock users
const users = [
  { id: 1, email: 'user@example.com', password: 'password123', name: 'Test User' },
];

// Mock modules
const modules = [
  { id: 1, name: 'JavaScript Basics', description: 'Learn JavaScript fundamentals' },
  { id: 2, name: 'React Fundamentals', description: 'Build React applications' },
  { id: 3, name: 'Node.js Backend', description: 'Server-side JavaScript' },
];

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Middleware to verify access token
function verifyAccessToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No access token provided' });
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>
  if (!token) {
    return res.status(401).json({ message: 'Invalid token format' });
  }

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid access token' });
  }
}

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Create access token (short-lived: 15 minutes)
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1m' }
  );

  // Create refresh token (long-lived: 7 days)
  const refreshToken = jwt.sign(
    { userId: user.id },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '5m' }
  );

  // Store refresh token in "database"
  refreshTokens.set(refreshToken, {
    userId: user.id,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Return access token in response body
  res.json({
    message: 'Login successful',
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
});

// Refresh token endpoint
app.post('/api/refresh-token', (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token' });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    
    // Check if refresh token exists in database
    const storedToken = refreshTokens.get(refreshToken);
    if (!storedToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      refreshTokens.delete(refreshToken);
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    // Find user
    const user = users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      ACCESS_TOKEN_SECRET,
      { expiresIn: '1m' }
    );

    // Optionally, generate new refresh token (rotate refresh tokens)
    const newRefreshToken = jwt.sign(
      { userId: user.id },
      REFRESH_TOKEN_SECRET,
      { expiresIn: '5m' }
    );

    // Remove old refresh token and store new one
    refreshTokens.delete(refreshToken);
    refreshTokens.set(newRefreshToken, {
      userId: user.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // Set new refresh token as httpOnly cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'Token refreshed',
      accessToken: newAccessToken
    });

  } catch (error) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  // Remove refresh token from database
  if (refreshToken) {
    refreshTokens.delete(refreshToken);
  }

  // Clear refresh token cookie
  res.clearCookie('refreshToken');
  
  res.json({ message: 'Logged out successfully' });
});

// Protected route - Get user profile
app.get('/api/me', verifyAccessToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  res.json({
    id: user.id,
    email: user.email,
    name: user.name
  });
});

// Protected route - Get modules
app.get('/api/modules', verifyAccessToken, (req, res) => {
  res.json(modules);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Hybrid Auth Server running on http://localhost:${PORT}`);
  console.log(`📝 Test credentials: user@example.com / password123`);
}); 