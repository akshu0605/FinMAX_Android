const { connectDB, Expense } = require('./_utils/db');
const { verifyToken } = require('./_utils/auth');
const { preflight, ok, unauthorized, serverError } = require('./_utils/response');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return preflight();
    if (event.httpMethod !== 'GET') return ({ statusCode: 405, body: 'Method not allowed' });

    try {
        let decoded;
        try { decoded = verifyToken(event); } catch (e) { return unauthorized(e.message); }

        await connectDB();

        const params = event.queryStringParameters || {};
        const filter = { userId: decoded.userId };

        if (params.category) filter.category = params.category;
        if (params.from || params.to) {
            filter.date = {};
            if (params.from) filter.date.$gte = new Date(params.from);
            if (params.to) filter.date.$lte = new Date(params.to);
        }

        const expenses = await Expense.find(filter).sort({ date: -1 }).lean();
        const total = expenses.reduce((s, e) => s + e.amount, 0);

        return ok({ expenses, total });
    } catch (err) {
        console.error('[get-expenses]', err.message);
        return serverError();
    }
};
