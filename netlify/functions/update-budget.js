const { connectDB, Budget } = require('./_utils/db');
const { verifyToken } = require('./_utils/auth');
const { preflight, ok, badRequest, unauthorized, notFound, serverError } = require('./_utils/response');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return preflight();
    if (event.httpMethod !== 'PUT') return badRequest('Method not allowed');

    try {
        let decoded;
        try { decoded = verifyToken(event); } catch (e) { return unauthorized(e.message); }

        await connectDB();

        let body;
        try { body = JSON.parse(event.body || '{}'); } catch { return badRequest('Invalid JSON'); }

        const { id, category, allocatedAmount, month, year } = body;
        if (!id) return badRequest('Budget id is required');

        // Ensure the budget belongs to this user (prevent IDOR)
        const budget = await Budget.findOne({ _id: id, userId: decoded.userId });
        if (!budget) return notFound('Budget not found');

        if (category) budget.category = String(category).trim().slice(0, 100);
        if (allocatedAmount !== undefined) budget.allocatedAmount = Number(allocatedAmount);
        if (month) budget.month = Number(month);
        if (year) budget.year = Number(year);

        await budget.save();
        return ok({ budget });
    } catch (err) {
        console.error('[update-budget]', err.message);
        return serverError();
    }
};
