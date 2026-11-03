const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectDB, User } = require('./_utils/db');
const { preflight, created, badRequest, serverError } = require('./_utils/response');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return preflight();
    if (event.httpMethod !== 'POST') return badRequest('Method not allowed');

    try {
        await connectDB();

        // ── Parse & validate body ──────────────────────────────────────
        let body;
        try { body = JSON.parse(event.body || '{}'); }
        catch { return badRequest('Invalid JSON body'); }

        const { name, email, password } = body;

        if (!name || typeof name !== 'string' || name.trim().length < 2)
            return badRequest('Name must be at least 2 characters');

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return badRequest('Invalid email address');

        if (!password || password.length < 6)
            return badRequest('Password must be at least 6 characters');

        // ── Check for existing user ────────────────────────────────────
        const existing = await User.findOne({ email: email.toLowerCase() }).lean();
        if (existing) return badRequest('An account with this email already exists');

        // ── Hash password & persist ───────────────────────────────────
        const hashed = await bcrypt.hash(password, 12);
        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashed,
        });

        // ── Sign token ────────────────────────────────────────────────
        const token = jwt.sign(
            { userId: user._id.toString(), email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return created({
            token,
            user: { id: user._id, name: user.name, email: user.email },
        });

    } catch (err) {
        console.error('[register]', err.message);
        return serverError('Registration failed. Please try again.');
    }
};
