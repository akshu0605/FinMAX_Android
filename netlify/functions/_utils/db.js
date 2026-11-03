const mongoose = require('mongoose');

// ─── Connection cache (reused across warm Lambda invocations) ─────
let cachedConnection = null;

const connectDB = async () => {
    if (cachedConnection && mongoose.connection.readyState === 1) {
        return cachedConnection;
    }

    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not set');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 10000,
    });

    cachedConnection = conn;
    return conn;
};

// ─── Schemas & Models ────────────────────────────────────────────

// User
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    createdAt: { type: Date, default: Date.now },
});

// Income
const incomeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    source: { type: String, trim: true, default: 'Salary' },
    createdAt: { type: Date, default: Date.now },
});

// Budget
const budgetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true, trim: true },
    allocatedAmount: { type: Number, required: true, min: 0 },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
});

// Expense
const expenseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
});

// Reminder
const reminderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    amount: { type: Number, min: 0 },            // optional
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
});

// ─── Register models (guard against OverwriteModelError on hot reload) ────
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Income = mongoose.models.Income || mongoose.model('Income', incomeSchema);
const Budget = mongoose.models.Budget || mongoose.model('Budget', budgetSchema);
const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
const Reminder = mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);

module.exports = { connectDB, User, Income, Budget, Expense, Reminder };
