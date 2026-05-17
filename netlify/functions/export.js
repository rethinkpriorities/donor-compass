/* global exports, process */

const ROW_LIMIT = 10000;
const TABLES = ['donations', 'shares', 'email_signups'];

async function getDbClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) throw new Error('Missing TURSO_DATABASE_URL');

  if (url.startsWith('file:')) {
    const { createClient } = await import('@libsql/client');
    return createClient({ url });
  }

  if (!authToken) throw new Error('Missing TURSO_AUTH_TOKEN for remote database');

  const { createClient } = await import('@libsql/client/web');
  return createClient({ url, authToken });
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' };

function jsonResponse(statusCode, data) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(data) };
}

function isValidDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : String(value);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function rowsToCsv(columns, rows) {
  const lines = [columns.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => csvEscape(row[c])).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

exports.handler = async function (event) {
  const { httpMethod } = event;

  if (httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const expectedKey = process.env.EXPORT_API_KEY;
  if (!expectedKey) {
    console.error('EXPORT_API_KEY not configured');
    return jsonResponse(500, { error: 'Server misconfigured' });
  }
  const headers = event.headers || {};
  const providedKey = headers['x-api-key'] || headers['X-Api-Key'];
  if (providedKey !== expectedKey) {
    return jsonResponse(401, { error: 'Invalid or missing API key' });
  }

  const params = event.queryStringParameters || {};
  const { from, to } = params;
  if (!from || !to) {
    return jsonResponse(400, { error: 'from and to query parameters are required (YYYY-MM-DD)' });
  }
  if (!isValidDate(from) || !isValidDate(to)) {
    return jsonResponse(400, { error: 'from and to must be in YYYY-MM-DD format' });
  }
  if (from > to) {
    return jsonResponse(400, { error: 'from must be on or before to' });
  }

  const fromBound = `${from} 00:00:00`;
  const toBound = `${to} 23:59:59`;

  try {
    const db = await getDbClient();
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();

    for (const table of TABLES) {
      const result = await db.execute({
        sql: `SELECT * FROM ${table} WHERE created_at BETWEEN ? AND ? ORDER BY created_at LIMIT ?`,
        args: [fromBound, toBound, ROW_LIMIT + 1],
      });

      if (result.rows.length > ROW_LIMIT) {
        return jsonResponse(413, {
          error: `${table} returned more than ${ROW_LIMIT} rows. Narrow the date range.`,
        });
      }

      const columns = result.columns;
      const rows = result.rows.map((row) => {
        const obj = {};
        columns.forEach((c, i) => {
          obj[c] = row[i];
        });
        return obj;
      });

      zip.file(`${table}.csv`, rowsToCsv(columns, rows));
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const filename = `export-${from}_${to}.zip`;

    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      body: zipBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('Export function error:', error);
    return jsonResponse(500, { error: 'Internal server error' });
  }
};
