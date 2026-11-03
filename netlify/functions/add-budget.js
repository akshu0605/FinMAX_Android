const { connectDB, Budget } = require('./_utils/db');
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

        const { category, allocatedAmount, month, year } = body;

        if (!category || typeof category !== 'string' || !category.trim())
            return badRequest('category is required');
        if (!allocatedAmount || isNaN(allocatedAmount) || allocatedAmount < 0)
            return badRequest('allocatedAmount must be a non-negative number');
        if (!month || month < 1 || month > 12) return badRequest('month must be 1–12');
        if (!year || year < 2000) return badRequest('Invalid year');

        const budget = await Budget.create({
            userId: decoded.userId,
            category: category.trim().slice(0, 100),
            allocatedAmount: Number(allocatedAmount),
            month: Number(month),
            year: Number(year),
        });

        return created({ budget });
    } catch (err) {
        console.error('[add-budget]', err.message);
        return serverError();
    }
};
