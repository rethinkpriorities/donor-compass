// AWS Lambda handler for email signup API

import crypto from 'node:crypto';

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

  if (!authToken) {
    throw new Error('Missing TURSO_AUTH_TOKEN');
  }

  const { createClient } = await import('@libsql/client/web');
  return createClient({ url, authToken });
}

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
};

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: RESPONSE_HEADERS,
    body: JSON.stringify(data),
  };
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function subscribeToMailchimp(email) {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;

  if (!apiKey || !serverPrefix || !audienceId) {
    console.log('Mailchimp env vars missing — skipping subscription');
    return;
  }

  const subscriberHash = crypto
    .createHash('md5')
    .update(email.toLowerCase())
    .digest('hex');

  const url = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash}`;
  const auth = Buffer.from(`anystring:${apiKey}`).toString('base64');

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: email,
        status_if_new: 'pending',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Mailchimp subscribe failed:', response.status, text);
    } else {
      console.log('Mailchimp subscribe ok for', email);
    }
  } catch (error) {
    console.error('Mailchimp subscribe error:', error);
  }
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: RESPONSE_HEADERS, body: '' };
  }

  if (method !== 'POST') {
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
          args: [
            id,
            email.trim(),
            sessionId || null,
            quizState ? JSON.stringify(quizState) : null,
          ],
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

    await subscribeToMailchimp(email.trim());

    return jsonResponse(201, { success: true, id });
  } catch (error) {
    console.error('Function error:', error);
    return jsonResponse(500, { error: 'Internal server error' });
  }
};
