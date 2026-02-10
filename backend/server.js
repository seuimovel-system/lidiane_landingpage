const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  .split(',')
  .map(o => o.trim());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions)); 

app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
});
app.use('/send-lead', limiter);

app.get('/token', (req, res) => {
  const token = jwt.sign(
    { site: 'lidiane' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  res.json({ token });
});

function authJWT(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(403).json({ error: 'Token não enviado' });

  const token = auth.split(' ')[1];

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: 'Token inválido' });
  }
}

app.post('/send-lead', authJWT, async (req, res) => {
  try {
    const response = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const text = await response.text();
    if (!response.ok) return res.status(response.status).send(text);

    res.json({ success: true });
  } catch (err) {
    console.error("🔥 Erro:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log("🚀 Backend rodando na porta " + PORT);
});