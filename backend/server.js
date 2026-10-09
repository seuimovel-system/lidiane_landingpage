// Backend antigo da LP (Render): entrega ao n8n uma CÓPIA do lead que o
// formulário já gravou no funil de Recrutamento do OnixTeam (OnixCloud).
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const { N8N_WEBHOOK_URL, JWT_SECRET } = process.env;
if (!N8N_WEBHOOK_URL || !JWT_SECRET) {
  console.error('Defina N8N_WEBHOOK_URL e JWT_SECRET no ambiente (ver .env.example).');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// O Render entrega a requisição por um proxy: sem isto o IP de todo mundo é o
// do proxy e o limite de requisições vira um balde só para o site inteiro.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// A LP entra sempre; ALLOWED_ORIGINS soma outras. Até 09/10/2026 esta lista não
// valia (o filtro devolvia "permitido" para qualquer origem), então o valor do
// Render nunca foi posto à prova: barra no fim ou espaço não podem cortar a LP.
const allowedOrigins = new Set(
  ['https://lidianepinheiro.seuimovel.com.br', ...(process.env.ALLOWED_ORIGINS || '').split(',')]
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean),
);

app.use(cors({
  // Só a LP. Requisição sem Origin (curl, servidor) segue sem cabeçalho de CORS.
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));

app.use('/token', rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));
app.use('/send-lead', rateLimit({ windowMs: 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false }));

app.get('/token', (req, res) => {
  const token = jwt.sign({ site: 'lidiane' }, JWT_SECRET, { expiresIn: '5m' });
  res.json({ token });
});

function authJWT(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(403).json({ error: 'Token não enviado' });
  try {
    jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(403).json({ error: 'Token inválido' });
  }
}

const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Só os campos do formulário seguem para o n8n — antes o corpo inteiro passava,
// e qualquer um podia empurrar o JSON que quisesse para dentro do fluxo.
function leadDoCorpo(b) {
  const lead = {
    nome: texto(b.nome, 120),
    email: texto(b.email, 254).toLowerCase(),
    telefone: texto(b.telefone, 30),
    corretor: b.corretor === 'sim' || b.corretor === 'nao' ? b.corretor : '',
    corretora: texto(b.corretora, 120),
    origem: texto(b.origem, 80),
  };
  const valido = lead.nome.length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email) &&
    lead.telefone.replace(/\D/g, '').length >= 10 &&
    lead.corretor !== '';
  return valido ? lead : null;
}

app.post('/send-lead', authJWT, async (req, res) => {
  const lead = leadDoCorpo(req.body || {});
  if (!lead) return res.status(400).json({ error: 'Dados inválidos' });
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
      timeout: 10000,
    });
    if (!response.ok) {
      console.error('n8n respondeu', response.status);
      return res.status(502).json({ error: 'Falha ao entregar o lead' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao chamar o n8n:', err.message);
    return res.status(502).json({ error: 'Falha ao entregar o lead' });
  }
});

app.listen(PORT, () => {
  console.log('Backend rodando na porta ' + PORT);
});
