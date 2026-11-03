// Shared CORS headers applied to every response
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
};

/**
 * Handle preflight OPTIONS requests — every handler should call this first.
 * Usage:  if (event.httpMethod === 'OPTIONS') return preflight();
 */
const preflight = () => ({ statusCode: 204, headers: CORS, body: '' });

const build = (statusCode, body) => ({
    statusCode,
    headers: CORS,
    body: JSON.stringify(body),
});

const ok = (data) => build(200, { success: true, data });
const created = (data) => build(201, { success: true, data });
const badRequest = (msg) => build(400, { success: false, error: msg });
const unauthorized = (msg = 'Unauthorized') => build(401, { success: false, error: msg });
const notFound = (msg) => build(404, { success: false, error: msg });
const serverError = (msg = 'Internal server error') => build(500, { success: false, error: msg });

module.exports = { preflight, ok, created, badRequest, unauthorized, notFound, serverError };
