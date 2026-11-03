const { connectDB, Reminder } = require('./_utils/db');
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
        if (params.status && ['pending', 'completed'].includes(params.status))
            filter.status = params.status;

        const reminders = await Reminder.find(filter).sort({ dueDate: 1 }).lean();
        return ok({ reminders });
    } catch (err) {
        console.error('[get-reminders]', err.message);
        return serverError();
    }
};
