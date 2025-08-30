// src/handler.js
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,x-signing-secret',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
  };

  // CORS preflight
  const method = event.requestContext?.http?.method || event.httpMethod;
  if (method === 'OPTIONS') return { statusCode: 204, headers };

  const action = event.queryStringParameters?.action || '';
  const secret = process.env.SIGNING_SECRET || '';
  const provided = event.headers?.['x-signing-secret'] || event.headers?.['X-Signing-Secret'];

  if (!provided || provided !== secret) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'unauthorized', action }) };
  }

  // Stubbed endpoints for Step 3 verification
  if (action === 'save-subscription') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, action }) };
  }
  if (action === 'notify-new') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, action }) };
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'unknown action', action }) };
};

