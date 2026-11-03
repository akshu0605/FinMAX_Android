import { useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { splitKroApi, SKMember } from '../../utils/splitkro-api';
import { GlassCard } from '../ui/GlassCard';
import { NeonButton } from '../ui/NeonButton';

const INDIGO = '#818CF8';
const INDIGO_DARK = '#6366F1';
const headingFont: React.CSSProperties = { fontFamily: 'Inter, Geist, SF Pro, sans-serif' };
const monoFont: React.CSSProperties = { fontFamily: 'JetBrains Mono, "Courier New", monospace' };

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: '12px', color: '#fff', outline: 'none', ...monoFont,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
};

type SplitType = 'equal' | 'exact' | 'percentage';

interface AddExpenseModalProps {
    groupId: string;
    members: SKMember[];
    userId: string;
    onClose: () => void;
    onAdded: () => void;
}

export function AddExpenseModal({ groupId, members, userId, onClose, onAdded }: AddExpenseModalProps) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidBy, setPaidBy] = useState(userId);
    const [splitType, setSplitType] = useState<SplitType>('equal');
    const [loading, setLoading] = useState(false);

    // Per-member overrides for exact/percentage split
    const [memberInputs, setMemberInputs] = useState<Record<string, string>>(
        Object.fromEntries(members.map(m => [m.user_id, '']))
    );

    const totalAmount = parseFloat(amount) || 0;

    // Compute shares for validation display
    const getSharesPreview = (): { userId: string; name: string; owedAmount: number }[] => {
        return members.map(m => {
            let owedAmount = 0;
            if (splitType === 'equal') {
                owedAmount = members.length > 0 ? totalAmount / members.length : 0;
            } else if (splitType === 'exact') {
                owedAmount = parseFloat(memberInputs[m.user_id]) || 0;
            } else {
                const pct = parseFloat(memberInputs[m.user_id]) || 0;
                owedAmount = (pct / 100) * totalAmount;
            }
            return { userId: m.user_id, name: m.display_name, owedAmount: Math.round(owedAmount * 100) / 100 };
        });
    };

    const sharesPreview = getSharesPreview();
    const sharesSum = sharesPreview.reduce((s, sh) => s + sh.owedAmount, 0);
    const pctSum = splitType === 'percentage' ? members.reduce((s, m) => s + (parseFloat(memberInputs[m.user_id]) || 0), 0) : 100;
    const isValid = totalAmount > 0 && description.trim() &&
        (splitType === 'equal' || (splitType === 'exact' ? Math.abs(sharesSum - totalAmount) < 0.01 : Math.abs(pctSum - 100) < 0.01));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) {
            if (splitType === 'exact') return toast.error(`Exact amounts must sum to ₹${totalAmount}. Current: ₹${sharesSum.toFixed(2)}`);
            if (splitType === 'percentage') return toast.error(`Percentages must sum to 100%. Current: ${pctSum.toFixed(1)}%`);
            return toast.error('Please fill all fields');
        }

        setLoading(true);
        const shares = sharesPreview.map(s => ({ userId: s.userId, owedAmount: s.owedAmount }));
        const { error } = await splitKroApi.addExpense(groupId, paidBy, totalAmount, description.trim(), splitType, shares);
        setLoading(false);
        if (error) return toast.error(error);
        toast.success('Expense added! 💸');
        onAdded();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
            <GlassCard
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-7 relative"
                spacing="none"
                style={{
                    boxShadow: '0 30px 80px rgba(0,0,0,0.9), 0 0 40px rgba(99,102,241,0.08)',
                }}
            >
                <div className="p-7 relative z-10">
                    {/* shimmer line */}
                    <div className="absolute top-0 left-0 right-0 h-px"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.6), transparent)' }} />
                    <div className="absolute inset-0 pointer-events-none rounded-2xl"
                        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, transparent 60%)' }} />

                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h3 className="text-xl font-bold text-white" style={headingFont}>Add Expense 💸</h3>
                        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }}
                            onMouseEnter={e => (e.currentTarget.style.color = INDIGO)}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>✕</button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        {/* Description */}
                        <div>
                            <label className="block text-sm mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Description *</label>
                            <input value={description} onChange={e => setDescription(e.target.value)}
                                placeholder="e.g. Hotel Booking, Dinner, Petrol" style={inputStyle} autoFocus
                                onFocus={e => {
                                    e.currentTarget.style.borderColor = INDIGO;
                                    e.currentTarget.style.boxShadow = '0 0 16px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.08)';
                                }}
                                onBlur={e => {
                                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-sm mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Total Amount (₹) *</label>
                            <input value={amount} onChange={e => setAmount(e.target.value)}
                                placeholder="0.00" type="number" min="0.01" step="0.01" style={inputStyle}
                                onFocus={e => {
                                    e.currentTarget.style.borderColor = INDIGO;
                                    e.currentTarget.style.boxShadow = '0 0 16px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.08)';
                                }}
                                onBlur={e => {
                                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        {/* Paid By */}
                        <div>
                            <label className="block text-sm mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Paid By</label>
                            <select value={paidBy} onChange={e => setPaidBy(e.target.value)}
                                style={{ ...inputStyle, cursor: 'pointer' }}>
                                {members.map(m => (
                                    <option key={m.user_id} value={m.user_id}
                                        style={{ background: '#111' }}>
                                        {m.user_id === userId ? `${m.display_name} (You)` : m.display_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Split Type */}
                        <div>
                            <label className="block text-sm mb-3" style={{ color: '#A1A1A1', ...monoFont }}>Split Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['equal', 'exact', 'percentage'] as SplitType[]).map(type => (
                                    <button key={type} type="button" onClick={() => setSplitType(type)}
                                        className="py-2.5 px-2 rounded-xl text-sm font-medium capitalize transition-all"
                                        style={splitType === type ? {
                                            background: `linear-gradient(135deg, ${INDIGO_DARK}, #8B5CF6)`,
                                            color: '#fff', ...headingFont,
                                            boxShadow: '0 0 14px rgba(99,102,241,0.4)',
                                        } : {
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#A1A1A1', ...headingFont,
                                        }}
                                        onMouseEnter={e => { if (splitType !== type) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                                        onMouseLeave={e => { if (splitType !== type) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                    >
                                        {type === 'equal' ? '⚖️ Equal' : type === 'exact' ? '💵 Exact' : '% Percent'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Split breakdown / inputs */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm" style={{ color: '#A1A1A1', ...monoFont }}>Per-Member Split</label>
                                {splitType !== 'equal' && (
                                    <span className="text-xs px-2 py-1 rounded-lg"
                                        style={{
                                            background: Math.abs((splitType === 'exact' ? sharesSum : (pctSum / 100) * totalAmount) - totalAmount) < 0.01
                                                ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                                            color: Math.abs((splitType === 'exact' ? sharesSum : (pctSum / 100) * totalAmount) - totalAmount) < 0.01
                                                ? '#34D399' : '#F87171',
                                            ...monoFont,
                                        }}>
                                        {splitType === 'exact' ? `₹${sharesSum.toFixed(2)} / ₹${totalAmount}` : `${pctSum.toFixed(1)}%`}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2">
                                {members.map(m => {
                                    const preview = sharesPreview.find(s => s.userId === m.user_id);
                                    return (
                                        <div key={m.user_id} className="flex items-center gap-3 p-3 rounded-xl"
                                            style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                                                style={{ background: m.user_id === userId ? `linear-gradient(135deg, ${INDIGO_DARK}, #8B5CF6)` : 'rgba(255,255,255,0.1)', color: '#fff' }}>
                                                {(m.display_name || 'U')[0].toUpperCase()}
                                            </div>
                                            <span className="flex-1 text-sm text-white" style={headingFont}>
                                                {m.user_id === userId ? `${m.display_name} (You)` : m.display_name}
                                            </span>
                                            {splitType === 'equal' ? (
                                                <span className="text-sm font-semibold" style={{ color: INDIGO, ...monoFont }}>
                                                    ₹{(preview?.owedAmount || 0).toFixed(2)}
                                                </span>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number" min="0" step={splitType === 'percentage' ? '0.1' : '0.01'}
                                                        value={memberInputs[m.user_id]}
                                                        onChange={e => setMemberInputs(prev => ({ ...prev, [m.user_id]: e.target.value }))}
                                                        placeholder={splitType === 'percentage' ? '%' : '₹'}
                                                        style={{
                                                            width: 80, padding: '6px 10px',
                                                            background: 'rgba(255,255,255,0.05)',
                                                            border: '1px solid rgba(99,102,241,0.2)',
                                                            borderRadius: 8, color: '#fff', outline: 'none', ...monoFont, fontSize: 13,
                                                        }} />
                                                    {splitType === 'percentage' && (
                                                        <span className="text-sm" style={{ color: '#A1A1A1', ...monoFont }}>
                                                            = ₹{(preview?.owedAmount || 0).toFixed(0)}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
                            <NeonButton variant="ghost" type="button" onClick={onClose} className="flex-1">
                                Cancel
                            </NeonButton>
                            <NeonButton type="submit" disabled={loading || !isValid} className="flex-1 shadow-[0_0_20px_rgba(99,102,241,0.35)]"
                                style={{ background: isValid ? `linear-gradient(135deg, ${INDIGO_DARK}, #8B5CF6)` : 'rgba(255,255,255,0.05)' }}>
                                {loading ? 'Adding...' : 'Add Expense 💸'}
                            </NeonButton>
                        </div>
                    </form>
                </div>
            </GlassCard>
        </div>
    );
}
