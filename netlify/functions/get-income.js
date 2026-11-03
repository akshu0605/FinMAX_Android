const { connectDB, Income } = require('./_utils/db');
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
        if (params.month) filter.month = Number(params.month);
        if (params.year) filter.year = Number(params.year);

        const incomes = await Income.find(filter).sort({ year: -1, month: -1 }).lean();
        return ok({ incomes });
    } catch (err) {
        console.error('[get-income]', err.message);
        return serverError();
    }
};
