// api/rooms/index.js
// Vercel Serverless Function using Upstash Redis for storage.
// GET: /api/rooms?id=ROOM -> { version, items }
// POST: /api/rooms?id=ROOM with { baseVersion, mutation } -> returns updated state

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv(); // Requires env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

function sanitize(id) {
  return String(id || '').toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'default-room';
}

function applyMutation(state, mut) {
  if (!mut || typeof mut !== 'object') return state;
  const next = { ...state, items: [...state.items] };
  if (mut.op === 'full' && Array.isArray(mut.items)) {
    next.items = mut.items;
  } else if (mut.op === 'add' && mut.item) {
    if (!next.items.some(x => x.id === mut.item.id)) next.items.unshift(mut.item);
  } else if (mut.op === 'remove' && mut.id) {
    next.items = next.items.filter(x => x.id !== mut.id);
  } else if (mut.op === 'update' && mut.id && mut.patch) {
    next.items = next.items.map(x => x.id === mut.id ? { ...x, ...mut.patch } : x);
  }
  next.version = (state.version || 0) + 1;
  next.updatedAt = Date.now();
  return next;
}

export default async function handler(req, res) {
  const rawId = req.query.id;
  const id = sanitize(rawId);
  const key = `watchlist:room:${id}`;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).send('ok');

  let state = await redis.get(key);
  if (!state) state = { version: 0, items: [] };

  if (req.method === 'GET') {
    return res.status(200).json(state);
  }
  if (req.method === 'POST') {
    const body = req.body || {};
    const mut = body.mutation;
    const next = applyMutation(state, mut);
    await redis.set(key, next);
    return res.status(200).json(next);
  }

  return res.status(405).send('Method Not Allowed');
}
