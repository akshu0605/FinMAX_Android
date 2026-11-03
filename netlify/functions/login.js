const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectDB, User } = require('./_utils/db');
const { preflight, ok, badRequest, unauthorized, serverError } = require('./_utils/response');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return preflight();
    if (event.httpMethod !== 'POST') return badRequest('Method not allowed');

    try {
        await connectDB();

        let body;
        try { body = JSON.parse(event.body || '{}'); }
        catch { return badRequest('Invalid JSON body'); }

        const { email, password } = body;

        if (!email || !password) return badRequest('Email and password are required');

        // ── Find user ─────────────────────────────────────────────────
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return unauthorized('Invalid email or password');

        // ── Verify password ───────────────────────────────────────────
        const match = await bcrypt.compare(password, user.password);
        if (!match) return unauthorized('Invalid email or password');

        // ── Sign token ────────────────────────────────────────────────
        const token = jwt.sign(
            { userId: user._id.toString(), email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return ok({
            token,
            user: { id: user._id, name: user.name, email: user.email },
        });

    } catch (err) {
        console.error('[login]', err.message);
        return serverError('Login failed. Please try again.');
    }
};
