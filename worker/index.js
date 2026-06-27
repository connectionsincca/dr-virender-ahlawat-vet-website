const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://virenderahlawat.ca',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const RATE_LIMIT_MAX  = 5;   // max failed attempts
const RATE_LIMIT_SECS = 900; // 15 minutes

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url  = new URL(request.url);
    const path = url.pathname;

    if (path === '/status' && request.method === 'GET') {
      return handleStatus(env);
    }
    if (path === '/setup' && request.method === 'POST') {
      return handleSetup(request, env);
    }
    if (path === '/login' && request.method === 'POST') {
      return handleLogin(request, env);
    }
    if (path === '/change-password' && request.method === 'POST') {
      return handleChangePassword(request, env);
    }

    return json({ error: 'Not found' }, 404);
  }
};

// ── /status ────────────────────────────────────────────────────────────────
async function handleStatus(env) {
  const hash = await env.ADMIN_CONFIG.get('password_hash');
  return json({ configured: !!hash });
}

// ── /setup ─────────────────────────────────────────────────────────────────
async function handleSetup(request, env) {
  const existing = await env.ADMIN_CONFIG.get('password_hash');
  if (existing) return json({ error: 'Admin already configured. Use change-password.' }, 400);

  const { passwordHash, encryptedToken } = await request.json();
  if (!passwordHash || !encryptedToken) return json({ error: 'Missing fields.' }, 400);

  await env.ADMIN_CONFIG.put('password_hash',    passwordHash);
  await env.ADMIN_CONFIG.put('encrypted_token',  encryptedToken);

  return json({ ok: true });
}

// ── /login ─────────────────────────────────────────────────────────────────
async function handleLogin(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimitKey = `rate:${ip}`;

  // Check rate limit
  const attempts = parseInt(await env.ADMIN_CONFIG.get(rateLimitKey) || '0');
  if (attempts >= RATE_LIMIT_MAX) {
    return json({ error: 'Too many failed attempts. Try again in 15 minutes.' }, 429);
  }

  const { passwordHash } = await request.json();
  if (!passwordHash) return json({ error: 'Missing fields.' }, 400);

  const storedHash = await env.ADMIN_CONFIG.get('password_hash');
  if (!storedHash) return json({ error: 'Admin not configured.' }, 400);

  if (passwordHash !== storedHash) {
    // Increment rate limit counter
    await env.ADMIN_CONFIG.put(rateLimitKey, String(attempts + 1), { expirationTtl: RATE_LIMIT_SECS });
    return json({ error: 'Incorrect password.' }, 401);
  }

  // Clear rate limit on success
  await env.ADMIN_CONFIG.delete(rateLimitKey);

  const encryptedToken = await env.ADMIN_CONFIG.get('encrypted_token');
  return json({ ok: true, encryptedToken });
}

// ── /change-password ────────────────────────────────────────────────────────
async function handleChangePassword(request, env) {
  const { oldPasswordHash, newPasswordHash, newEncryptedToken } = await request.json();
  if (!oldPasswordHash || !newPasswordHash || !newEncryptedToken) {
    return json({ error: 'Missing fields.' }, 400);
  }

  const storedHash = await env.ADMIN_CONFIG.get('password_hash');
  if (!storedHash) return json({ error: 'Admin not configured.' }, 400);

  if (oldPasswordHash !== storedHash) {
    return json({ error: 'Current password is incorrect.' }, 401);
  }

  await env.ADMIN_CONFIG.put('password_hash',   newPasswordHash);
  await env.ADMIN_CONFIG.put('encrypted_token', newEncryptedToken);

  return json({ ok: true });
}

// ── helpers ─────────────────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
