const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
const PORT = 4000;
const JWT_SECRET = 'supersecretkey'; 

// Hardcoded users
const users = [
  { id: 1, email: 'user@example.com', password: 'password123', name: 'Test User' },
];

// Mock modules
const modules = [
  { id: 1, name: 'Module 1', description: 'First module' },
  { id: 2, name: 'Module 2', description: 'Second module' },
];

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '1h' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'Logged in' });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

app.get('/api/me', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  res.json({ id: user.id, email: user.email, name: user.name });
});

app.get('/api/modules', authMiddleware, (req, res) => {
  res.json(modules);
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
}); 