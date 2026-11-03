const { connectDB, Expense } = require('./_utils/db');
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

        const { id, title, amount, category, date, note } = body;
        if (!id) return badRequest('Expense id is required');

        const expense = await Expense.findOne({ _id: id, userId: decoded.userId });
        if (!expense) return notFound('Expense not found');

        if (title) expense.title = String(title).trim().slice(0, 200);
        if (amount) expense.amount = Number(amount);
        if (category) expense.category = String(category).trim().slice(0, 100);
        if (date && !isNaN(Date.parse(date))) expense.date = new Date(date);
        if (note !== undefined) expense.note = String(note).trim().slice(0, 500);

        await expense.save();
        return ok({ expense });
    } catch (err) {
        console.error('[update-expense]', err.message);
        return serverError();
    }
};
