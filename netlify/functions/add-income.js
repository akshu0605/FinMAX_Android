const { connectDB, Income } = require('./_utils/db');
const { verifyToken } = require('./_utils/auth');
const { preflight, created, badRequest, unauthorized, serverError } = require('./_utils/response');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return preflight();
    if (event.httpMethod !== 'POST') return badRequest('Method not allowed');

    try {
        let decoded;
        try { decoded = verifyToken(event); } catch (e) { return unauthorized(e.message); }

        await connectDB();

        let body;
        try { body = JSON.parse(event.body || '{}'); } catch { return badRequest('Invalid JSON'); }

        const { amount, month, year, source } = body;

        if (!amount || isNaN(amount) || amount <= 0) return badRequest('amount must be a positive number');
        if (!month || month < 1 || month > 12) return badRequest('month must be 1–12');
        if (!year || year < 2000) return badRequest('Invalid year');

        const income = await Income.create({
            userId: decoded.userId,
            amount: Number(amount),
            month: Number(month),
            year: Number(year),
            source: source ? String(source).trim().slice(0, 100) : 'Salary',
        });

        return created({ income });
    } catch (err) {
        console.error('[add-income]', err.message);
        return serverError();
    }
};
