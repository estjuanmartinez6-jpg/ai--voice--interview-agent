import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { chat, chatStream, generateFeedback } from './gemini.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json({ limit: '1mb' }));

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({ ok: true, keyLoaded: hasKey });
});

// ── POST /api/chat ─────────────────────────────────────────────────────────
// Body: {
//   config:     { jobType, difficulty, sessionLength },
//   transcript: [{ role: 'user'|'ai', text: string, wordCount?: number, durationMs?: number }],
//   message:    string   ← latest user message (already appended to transcript by client)
// }
// Returns: { text: string }
app.post('/api/chat', async (req, res) => {
  try {
    const { config, transcript, message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }
    if (!config || !config.jobType) {
      return res.status(400).json({ error: 'config.jobType is required' });
    }

    const aiText = await chat({ config, transcript, message });
    res.json({ text: aiText });
  } catch (err) {
    console.error('[/api/chat]', err);
    res.status(500).json({ error: 'Gemini request failed', detail: err.message });
  }
});

// ── POST /api/chat/stream ──────────────────────────────────────────────────
// Same body as /api/chat but returns Server-Sent Events (SSE).
// Each event is a text chunk as it arrives from Gemini.
// Client can start TTS as soon as the first sentence arrives.
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { config, transcript, message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }
    if (!config || !config.jobType) {
      return res.status(400).json({ error: 'config.jobType is required' });
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering if present
    });

    const stream = chatStream({ config, transcript, message });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('[/api/chat/stream]', err);
    // If headers already sent, just end
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Gemini stream failed', detail: err.message });
    }
  }
});

// ── POST /api/feedback ─────────────────────────────────────────────────────
// Body: {
//   config:     { jobType, difficulty, sessionLength },
//   transcript: [{ role, text, wordCount?, durationMs? }]
// }
// Returns: feedback JSON object (see prompts.js for schema)
app.post('/api/feedback', async (req, res) => {
  try {
    const { config, transcript } = req.body;

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return res.status(400).json({ error: 'transcript array is required' });
    }
    if (!config || !config.jobType) {
      return res.status(400).json({ error: 'config.jobType is required' });
    }

    const feedback = await generateFeedback({ config, transcript });
    res.json(feedback);
  } catch (err) {
    console.error('[/api/feedback]', err);
    res.status(500).json({ error: 'Feedback generation failed', detail: err.message });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ InterviewReady server running on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY is not set — copy .env.example to .env and add your key.\n');
  }
});
