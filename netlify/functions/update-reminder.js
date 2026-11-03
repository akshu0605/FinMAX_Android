const { connectDB, Reminder } = require('./_utils/db');
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

        const { id, title, dueDate, amount, status } = body;
        if (!id) return badRequest('Reminder id is required');

        const reminder = await Reminder.findOne({ _id: id, userId: decoded.userId });
        if (!reminder) return notFound('Reminder not found');

        if (title) reminder.title = String(title).trim().slice(0, 200);
        if (dueDate && !isNaN(Date.parse(dueDate))) reminder.dueDate = new Date(dueDate);
        if (amount !== undefined) reminder.amount = Number(amount);
        if (status && ['pending', 'completed'].includes(status)) reminder.status = status;

        await reminder.save();
        return ok({ reminder });
    } catch (err) {
        console.error('[update-reminder]', err.message);
        return serverError();
    }
};
