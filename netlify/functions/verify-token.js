const { connectDB, User } = require('./_utils/db');
const { verifyToken } = require('./_utils/auth');
const { preflight, ok, unauthorized, serverError } = require('./_utils/response');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return preflight();
    if (event.httpMethod !== 'GET') return ({ statusCode: 405, body: 'Method not allowed' });

    try {
        let decoded;
        try { decoded = verifyToken(event); }
        catch (err) { return unauthorized(err.message); }

        await connectDB();
        const user = await User.findById(decoded.userId).select('-password').lean();
        if (!user) return unauthorized('User no longer exists');

        return ok({ user: { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt } });

    } catch (err) {
        console.error('[verify-token]', err.message);
        return serverError();
    }
};
