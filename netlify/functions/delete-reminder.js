const { connectDB, Reminder } = require('./_utils/db');
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
        if (!id) return badRequest('Reminder id is required (?id=...)');

        const result = await Reminder.findOneAndDelete({ _id: id, userId: decoded.userId });
        if (!result) return notFound('Reminder not found');

        return ok({ message: 'Reminder deleted', id });
    } catch (err) {
        console.error('[delete-reminder]', err.message);
        return serverError();
    }
};
