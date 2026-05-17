/* global exports, process */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateShortId(length = 7) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return result;
}

async function getDbClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('Missing TURSO_DATABASE_URL');
  }

  if (url.startsWith('file:')) {
    const { createClient } = await import('@libsql/client');
    return createClient({ url });
  }

  if (!authToken) {
    throw new Error('Missing TURSO_AUTH_TOKEN for remote database');
  }

  const { createClient } = await import('@libsql/client/web');
  return createClient({ url, authToken });
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(data),
  };
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.handler = async function (event) {
  const { httpMethod } = event;

  if (httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { email, sessionId, quizState } = body;

    if (!email || !validateEmail(email)) {
      return jsonResponse(400, { error: 'A valid email is required' });
    }

    const db = await getDbClient();
    let id;

    for (let attempt = 0; attempt < 5; attempt++) {
      id = generateShortId();
      try {
        await db.execute({
          sql: `INSERT INTO email_signups (id, email, session_id, quiz_state)
                VALUES (?, ?, ?, ?)`,
          args: [id, email.trim(), sessionId || null, quizState ? JSON.stringify(quizState) : null],
        });
        break;
      } catch (error) {
        if (error.message?.includes('UNIQUE constraint')) {
          id = null;
          continue;
        }
        throw error;
      }
    }

    if (!id) {
      return jsonResponse(500, { error: 'Failed to generate unique ID' });
    }

    console.log('Email signup saved:', { id, email: email.trim() });
    console.log('Mailchimp local dev: skipping subscription');

    return jsonResponse(201, { success: true, id });
  } catch (error) {
    console.error('Function error:', error);
    return jsonResponse(500, { error: 'Internal server error' });
  }
};
