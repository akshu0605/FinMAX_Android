const { connectDB, Reminder } = require('./_utils/db');
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

        const { title, dueDate, amount, status } = body;

        if (!title || typeof title !== 'string' || !title.trim())
            return badRequest('title is required');
        if (!dueDate || isNaN(Date.parse(dueDate)))
            return badRequest('dueDate must be a valid ISO date string');
        if (amount !== undefined && (isNaN(amount) || amount < 0))
            return badRequest('amount must be a non-negative number');

        const reminder = await Reminder.create({
            userId: decoded.userId,
            title: title.trim().slice(0, 200),
            dueDate: new Date(dueDate),
            amount: amount !== undefined ? Number(amount) : undefined,
            status: status === 'completed' ? 'completed' : 'pending',
        });

        return created({ reminder });
    } catch (err) {
        console.error('[add-reminder]', err.message);
        return serverError();
    }
};
