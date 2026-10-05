import { GoogleGenAI } from '@google/genai';
import { buildSystemPrompt, buildFeedbackPrompt } from './prompts.js';

// ── Models ─────────────────────────────────────────────────────────────────
// Primary active model recommended by Google AI Studio
// Primary active models with verified quota and high speed
const PRIMARY_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemma-4-26b-a4b-it'];

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment');
  return new GoogleGenAI({ apiKey });
}

// ── Helper: Retry with exponential backoff & model fallbacks ────────────────
async function executeWithModelFallback(operationName, executeFn) {
  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError = null;

  for (const model of models) {
    let attempt = 0;
    const maxRetries = 2;
    let delay = 500; // Start faster (was 1000)

    while (attempt <= maxRetries) {
      try {
        return await executeFn(model);
      } catch (err) {
        attempt++;
        lastError = err;
        const isTransient =
          err.status === 503 ||
          err.status === 429 ||
          err.message?.includes('503') ||
          err.message?.includes('429') ||
          err.message?.includes('high demand') ||
          err.message?.includes('UNAVAILABLE');

        if (attempt <= maxRetries && isTransient) {
          console.warn(`[${operationName}] Model ${model} returned 503/429. Retrying ${attempt}/${maxRetries} after ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
        } else {
          // If out of retries for this model, break and try next fallback model
          break;
        }
      }
    }
  }

  throw lastError;
}

// ── Helper: Format Gemini chat history ─────────────────────────────────────
// Ensures history starts with 'user' and alternates strictly between user and model
function buildGeminiHistory(transcript, jobType = 'job') {
  const historyMessages = transcript.slice(0, -1);
  const history = [];

  // Gemini API requires the first turn in history to have role: 'user'.
  // If the conversation starts with Alex's opening greeting (role: 'ai'),
  // prepend a natural candidate arrival turn so the model has proper conversational grounding.
  if (historyMessages.length > 0 && historyMessages[0].role === 'ai') {
    history.push({
      role: 'user',
      parts: [{ text: `Hello, I am here for the ${jobType} interview.` }],
    });
  }

  for (const msg of historyMessages) {
    if (!msg.text || !msg.text.trim()) continue;
    const role = msg.role === 'ai' ? 'model' : 'user';

    // Merge consecutive messages with the same role to maintain strict alternation
    if (history.length > 0 && history[history.length - 1].role === role) {
      history[history.length - 1].parts[0].text += `\n${msg.text}`;
    } else {
      history.push({
        role,
        parts: [{ text: msg.text }],
      });
    }
  }

  return history;
}

// ── chat() ─────────────────────────────────────────────────────────────────
// Sends one conversation turn to Gemini.
// Stateless: history is reconstructed on each call.
export async function chat({ config, transcript, message }) {
  return executeWithModelFallback('chat', async (model) => {
    const ai = getClient();
    const systemPrompt = buildSystemPrompt(config);
    const history = buildGeminiHistory(transcript, config?.jobType);

    const chatSession = ai.chats.create({
      model,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
        topP: 0.9,
        maxOutputTokens: 150, // Alex should give 1-3 short spoken sentences
      },
      history,
    });

    const response = await chatSession.sendMessage({ message });
    return response.text;
  });
}

// ── chatStream() ───────────────────────────────────────────────────────────
// Streaming variant: yields text chunks as they arrive from Gemini.
// Used by the SSE /api/chat/stream endpoint for faster perceived latency.
export async function* chatStream({ config, transcript, message }) {
  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError = null;

  for (const model of models) {
    try {
      const ai = getClient();
      const systemPrompt = buildSystemPrompt(config);
      const history = buildGeminiHistory(transcript, config?.jobType);

      const chatSession = ai.chats.create({
        model,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.8,
          topP: 0.9,
          maxOutputTokens: 150,
        },
        history,
      });

      const stream = await chatSession.sendMessageStream({ message });
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) yield text;
      }
      return; // success — stop trying fallback models
    } catch (err) {
      lastError = err;
      console.warn(`[chatStream] Model ${model} failed:`, err.message);
      // Try next model
    }
  }

  throw lastError;
}

// ── generateFeedback() ─────────────────────────────────────────────────────
// One-shot generation for post-interview feedback report.
export async function generateFeedback({ config, transcript }) {
  return executeWithModelFallback('generateFeedback', async (model) => {
    const ai = getClient();
    const prompt = buildFeedbackPrompt({ config, transcript });

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        maxOutputTokens: 2500,
      },
    });

    const raw = response.text;

    try {
      return JSON.parse(raw);
    } catch {
      // Strip markdown code fences if present
      const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      return JSON.parse(stripped);
    }
  });
}
