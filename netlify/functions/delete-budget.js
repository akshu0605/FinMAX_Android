const { connectDB, Budget } = require('./_utils/db');
const { verifyToken } = require('./_utils/auth');
const { preflight, ok, badRequest, unauthorized, notFound, serverError } = require('./_utils/response');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return preflight();
    if (event.httpMethod !== 'DELETE') return badRequest('Method not allowed');

    try {
        let decoded;
        try { decoded = verifyToken(event); } catch (e) { return unauthorized(e.message); }

        await connectDB();

        const params = event.queryStringParameters || {};
        const { id } = params;
        if (!id) return badRequest('Budget id is required (?id=...)');

        const result = await Budget.findOneAndDelete({ _id: id, userId: decoded.userId });
        if (!result) return notFound('Budget not found');

        return ok({ message: 'Budget deleted', id });
    } catch (err) {
        console.error('[delete-budget]', err.message);
        return serverError();
    }
};
