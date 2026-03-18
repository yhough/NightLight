require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sessionsRouter = require('./routes/sessions');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Routes
app.use('/sessions', sessionsRouter);

// 404 catch-all
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`NightLight backend running on http://localhost:${PORT}`);
  console.log(`Twilio: ${process.env.TWILIO_ACCOUNT_SID ? 'configured' : '⚠️  NOT configured (SMS will fail)'}`);
});
