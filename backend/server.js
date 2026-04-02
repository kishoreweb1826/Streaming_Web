import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const VIDSRC_BASE = process.env.STREAM_PROVIDER || 'https://vidsrc.cc';

/* ================================================ */
/*  HEALTH                                          */
/* ================================================ */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'NovaStream Backend running' });
});

/* ================================================ */
/*  CONFIG                                          */
/* ================================================ */
app.get('/api/config', (_req, res) => {
  res.json({
    streamProvider: VIDSRC_BASE,
    features: { enableServerSwitching: true, enableAds: false },
  });
});

/* ================================================ */
/*  VAPI PROXY — Movies by type                     */
/*  GET /api/vapi/movie/:type/:page                 */
/* ================================================ */
app.get('/api/vapi/movie/:type/:page', async (req, res) => {
  try {
    const { type, page } = req.params;
    const url = `${VIDSRC_BASE}/vapi/movie/${type}/${page}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('VAPI movie error:', err.message);
    res.status(502).json({ error: 'Failed to fetch movie data', items: [] });
  }
});

/* ================================================ */
/*  VAPI PROXY — TV by type                         */
/*  GET /api/vapi/tv/:type/:page                    */
/* ================================================ */
app.get('/api/vapi/tv/:type/:page', async (req, res) => {
  try {
    const { type, page } = req.params;
    const url = `${VIDSRC_BASE}/vapi/tv/${type}/${page}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('VAPI tv error:', err.message);
    res.status(502).json({ error: 'Failed to fetch TV data', items: [] });
  }
});

/* ================================================ */
/*  VAPI PROXY — Latest episodes                    */
/*  GET /api/vapi/episode/latest/:page              */
/* ================================================ */
app.get('/api/vapi/episode/latest/:page', async (req, res) => {
  try {
    const { page } = req.params;
    const url = `${VIDSRC_BASE}/vapi/episode/latest/${page}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('VAPI episode error:', err.message);
    res.status(502).json({ error: 'Failed to fetch episode data', items: [] });
  }
});

/* ================================================ */
/*  START                                           */
/* ================================================ */
app.listen(PORT, () => {
  console.log(`✨ NovaStream Backend running → http://localhost:${PORT}`);
});
