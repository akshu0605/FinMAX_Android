import { useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { splitKroApi, SKMember } from '../../utils/splitkro-api';
import { Transaction } from '../../utils/debtSimplifier';
import { GlassCard } from '../ui/GlassCard';
import { NeonButton } from '../ui/NeonButton';

const INDIGO = '#818CF8';
const INDIGO_DARK = '#6366F1';
const headingFont: React.CSSProperties = { fontFamily: 'Inter, Geist, SF Pro, sans-serif' };
const monoFont: React.CSSProperties = { fontFamily: 'JetBrains Mono, "Courier New", monospace' };

interface SettleUpModalProps {
    groupId: string;
    members: SKMember[];
    userId: string;
    settlements: Transaction[];
    onClose: () => void;
    onSettled: () => void;
}

export function SettleUpModal({ groupId, members, userId, settlements, onClose, onSettled }: SettleUpModalProps) {
    const [selected, setSelected] = useState<Transaction | null>(
        settlements.find(s => s.from === userId) || settlements[0] || null
    );
    const [customAmount, setCustomAmount] = useState(selected ? selected.amount.toString() : '');
    const [loading, setLoading] = useState(false);

    const handleSettle = async () => {
        if (!selected) return toast.error('No settlement selected');
        const amount = parseFloat(customAmount);
        if (!amount || amount <= 0) return toast.error('Enter a valid amount');
        setLoading(true);
        const { error } = await splitKroApi.recordSettlement(groupId, selected.from, selected.to, amount);
        setLoading(false);
        if (error) return toast.error(error);
        toast.success(`✅ Settlement of ₹${amount} recorded!`);
        onSettled();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
            <GlassCard
                className="w-full max-w-md p-7 relative overflow-hidden"
                spacing="none"
                style={{
                    boxShadow: '0 30px 80px rgba(0,0,0,0.9), 0 0 40px rgba(99,102,241,0.08)',
                }}
            >
                <div className="p-7 relative z-10">
                    <div className="absolute top-0 left-0 right-0 h-px"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.6), transparent)' }} />
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, transparent 60%)' }} />

                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h3 className="text-xl font-bold text-white" style={headingFont}>Settle Up ✅</h3>
                        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }}
                            onMouseEnter={e => (e.currentTarget.style.color = INDIGO)}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>✕</button>
                    </div>

                    <div className="space-y-4 relative z-10">
                        {/* Transaction selector */}
                        {settlements.length > 1 && (
                            <div>
                                <label className="block text-sm mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Select Transaction</label>
                                <div className="space-y-2">
                                    {settlements.map((txn, i) => (
                                        <button key={i} type="button" onClick={() => { setSelected(txn); setCustomAmount(txn.amount.toString()); }}
                                            className="w-full p-3 rounded-xl text-left transition-all"
                                            style={selected === txn ? {
                                                background: 'rgba(99,102,241,0.15)',
                                                border: '1px solid rgba(129,140,248,0.35)',
                                                color: '#fff',
                                            } : {
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                color: '#A1A1A1',
                                            }}>
                                            <span className="text-sm" style={headingFont}>
                                                <span style={{ color: '#F87171' }}>{txn.from === userId ? 'You' : txn.fromName}</span>
                                                <span style={{ color: '#A1A1A1' }}> → </span>
                                                <span style={{ color: '#34D399' }}>{txn.to === userId ? 'you' : txn.toName}</span>
                                                <span className="ml-2 font-bold" style={{ color: INDIGO }}>₹{txn.amount}</span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selected && (
                            <>
                                {/* Summary card */}
                                <div className="p-4 rounded-xl text-center"
                                    style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(129,140,248,0.18)' }}>
                                    <div className="text-sm mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Recording payment</div>
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                                            style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                                            {selected.fromName[0].toUpperCase()}
                                        </div>
                                        <div className="text-xl">→</div>
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                                            style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>
                                            {selected.toName[0].toUpperCase()}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-sm" style={headingFont}>
                                        <span style={{ color: '#F87171' }}>{selected.from === userId ? 'You' : selected.fromName}</span>
                                        <span style={{ color: '#A1A1A1' }}> pays </span>
                                        <span style={{ color: '#34D399' }}>{selected.to === userId ? 'you' : selected.toName}</span>
                                    </div>
                                </div>

                                {/* Amount input */}
                                <div>
                                    <label className="block text-sm mb-2" style={{ color: '#A1A1A1', ...monoFont }}>
                                        Amount (₹) — suggested: ₹{selected.amount}
                                    </label>
                                    <input
                                        type="number" min="0.01" step="0.01"
                                        value={customAmount}
                                        onChange={e => setCustomAmount(e.target.value)}
                                        style={{
                                            width: '100%', padding: '12px 14px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(99,102,241,0.25)',
                                            borderRadius: '12px', color: '#fff', outline: 'none',
                                            fontSize: '1.25rem', fontWeight: 'bold',
                                            textAlign: 'center',
                                            ...monoFont,
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        }}
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
                            </>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
                            <NeonButton variant="ghost" type="button" onClick={onClose} className="flex-1">
                                Cancel
                            </NeonButton>
                            <NeonButton type="button" onClick={handleSettle} disabled={loading || !selected} className="flex-1 shadow-[0_0_20px_rgba(99,102,241,0.35)]"
                                style={{ background: `linear-gradient(135deg, ${INDIGO_DARK}, #8B5CF6)` }}>
                                {loading ? 'Recording...' : 'Record Payment ✓'}
                            </NeonButton>
                        </div>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
