const { connectDB, Expense } = require('./_utils/db');
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

        const { title, amount, category, date, note } = body;

        if (!title || typeof title !== 'string' || !title.trim())
            return badRequest('title is required');
        if (!amount || isNaN(amount) || amount <= 0)
            return badRequest('amount must be a positive number');
        if (!category || typeof category !== 'string' || !category.trim())
            return badRequest('category is required');
        if (!date || isNaN(Date.parse(date)))
            return badRequest('date must be a valid ISO date string');

        const expense = await Expense.create({
            userId: decoded.userId,
            title: title.trim().slice(0, 200),
            amount: Number(amount),
            category: category.trim().slice(0, 100),
            date: new Date(date),
            note: note ? String(note).trim().slice(0, 500) : undefined,
        });

        return created({ expense });
    } catch (err) {
        console.error('[add-expense]', err.message);
        return serverError();
    }
};
