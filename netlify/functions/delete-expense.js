const { connectDB, Expense } = require('./_utils/db');
const { verifyToken } = require('./_utils/auth');
const { preflight, ok, badRequest, unauthorized, notFound, serverError } = require('./_utils/response');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return preflight();
    if (event.httpMethod !== 'DELETE') return badRequest('Method not allowed');

    try {
        let decoded;
        try { decoded = verifyToken(event); } catch (e) { return unauthorized(e.message); }

        await connectDB();

        const { id } = event.queryStringParameters || {};
        if (!id) return badRequest('Expense id is required (?id=...)');

        const result = await Expense.findOneAndDelete({ _id: id, userId: decoded.userId });
        if (!result) return notFound('Expense not found');

        return ok({ message: 'Expense deleted', id });
    } catch (err) {
        console.error('[delete-expense]', err.message);
        return serverError();
    }
};
