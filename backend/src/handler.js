// src/handler.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,x-signing-secret',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
  };

  const method = event.requestContext?.http?.method || event.httpMethod;
  if (method === 'OPTIONS') return { statusCode: 204, headers };

  const qs = event.queryStringParameters || {};
  const action = qs.action || '';

  const secret = process.env.SIGNING_SECRET || '';
  const provided = event.headers?.['x-signing-secret'] || event.headers?.['X-Signing-Secret'];
  if (!provided || provided !== secret) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'unauthorized' }) };
  }

  if (action === 'save-subscription') {
    try {
      const body = JSON.parse(event.body || '{}');
      const userId = body.userId;
      const subscription = body.subscription;
      const endpoint = subscription?.endpoint;

      if (!userId || !endpoint || !subscription) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid payload' }) };
      }

      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

      // Upsert by unique endpoint
      const row = {
        user_id: userId,
        endpoint,
        subscription
      };

      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert(row, { onConflict: 'endpoint' })
        .select()
        .single();

      if (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data }) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // ... keep your other actions ('notify-new', etc.) or default:
  return { statusCode: 400, headers, body: JSON.stringify({ error: 'unknown action', action }) };
};

