import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Trash2, ChevronRight, UsersRound, Plane, Home, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { splitKroApi, SKGroup } from '../../utils/splitkro-api';
import { GroupDetail } from './GroupDetail.tsx';
import { GlassCard } from '../ui/GlassCard';
import { NeonButton } from '../ui/NeonButton';

// Design tokens
const INDIGO = '#818CF8';
const INDIGO_DARK = '#6366F1';
const headingFont: React.CSSProperties = { fontFamily: 'Inter, Geist, SF Pro, sans-serif' };
const monoFont: React.CSSProperties = { fontFamily: 'JetBrains Mono, "Courier New", monospace' };

const glass = (): React.CSSProperties => ({
    background: 'rgba(255,255,255,0.045)',
    backdropFilter: 'blur(24px) saturate(200%) brightness(1.08)',
    WebkitBackdropFilter: 'blur(24px) saturate(200%) brightness(1.08)',
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.65), inset 0 1.5px 0 rgba(255,255,255,0.13)',
});

const indigoGlass = (): React.CSSProperties => ({
    background: 'rgba(99,102,241,0.07)',
    backdropFilter: 'blur(24px) saturate(200%)',
    WebkitBackdropFilter: 'blur(24px) saturate(200%)',
    border: '1px solid rgba(99,102,241,0.2)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.65), inset 0 1.5px 0 rgba(129,140,248,0.15)',
});

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px',
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: '12px', color: '#fff', outline: 'none', ...monoFont,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
};

const GROUP_TYPES = [
    { label: 'Trip', icon: Plane },
    { label: 'Flatmates', icon: Home },
    { label: 'Friends', icon: Heart },
    { label: 'Other', icon: Users },
];

function getGroupIcon(type: string) {
    const found = GROUP_TYPES.find(t => t.label === type);
    return found ? found.icon : Users;
}

function getGroupEmoji(type: string) {
    const map: Record<string, string> = { Trip: '✈️', Flatmates: '🏠', Friends: '💜', Other: '👥' };
    return map[type] || '👥';
}

// Create Group Modal Component
function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [name, setName] = useState('');
    const [type, setType] = useState('Trip');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return toast.error('Group name is required');
        setLoading(true);
        const { error } = await splitKroApi.createGroup(name.trim(), type);
        setLoading(false);
        if (error) return toast.error(error);
        toast.success(`Group "${name}" created! 🎉`);
        onCreated();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}>
            <GlassCard
                className="w-full max-w-md p-7 relative overflow-hidden"
                spacing="none"
                style={{
                    boxShadow: '0 30px 80px rgba(0,0,0,0.85), 0 0 40px rgba(99,102,241,0.08)',
                }}
            >
                <div className="p-7 relative z-10">
                    {/* top shimmer */}
                    <div className="absolute top-0 left-0 right-0 h-px"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.6), transparent)' }} />
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.07) 0%, transparent 60%)' }} />

                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h3 className="text-xl font-bold text-white" style={headingFont}>Create New Group</h3>
                        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }}
                            onMouseEnter={e => (e.currentTarget.style.color = INDIGO)}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>✕</button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        <div>
                            <label className="block text-sm mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Group Name</label>
                            <input value={name} onChange={e => setName(e.target.value)}
                                placeholder="e.g. Goa Trip 2025"
                                style={inputStyle} autoFocus
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

                        <div>
                            <label className="block text-sm mb-3" style={{ color: '#A1A1A1', ...monoFont }}>Group Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {GROUP_TYPES.map(({ label, icon: Icon }) => (
                                    <button key={label} type="button" onClick={() => setType(label)}
                                        className="flex items-center gap-2 p-3 rounded-xl transition-all"
                                        style={type === label ? {
                                            background: 'rgba(99,102,241,0.15)',
                                            border: '1px solid rgba(129,140,248,0.4)',
                                            color: INDIGO,
                                            ...monoFont,
                                            boxShadow: '0 0 16px rgba(99,102,241,0.15)',
                                        } : {
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#A1A1A1',
                                            ...monoFont,
                                        }}>
                                        <Icon className="size-4" />
                                        <span className="text-sm font-medium">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <NeonButton variant="ghost" type="button" onClick={onClose} className="flex-1">
                                Cancel
                            </NeonButton>
                            <NeonButton type="submit" disabled={loading} className="flex-1 shadow-[0_0_20px_rgba(99,102,241,0.35)]"
                                style={{ background: `linear-gradient(135deg, ${INDIGO_DARK}, #8B5CF6)` }}>
                                {loading ? 'Creating...' : 'Create Group ✨'}
                            </NeonButton>
                        </div>
                    </form>
                </div>
            </GlassCard>
        </div>
    );
}

// Group Card Component
function GroupCard({ group, onSelect, onDelete }: {
    group: SKGroup; onSelect: () => void; onDelete: () => void;
}) {
    const GroupIcon = getGroupIcon(group.type);
    return (
        <GlassCard
            interactive
            active={true}
            className="p-5 cursor-pointer flex flex-col"
            onClick={onSelect}
            style={{
                border: '1px solid rgba(99,102,241,0.2)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.65), inset 0 1.5px 0 rgba(129,140,248,0.15)',
            }}
        >
            {/* sheen */}
            <div className="absolute inset-0 pointer-events-none rounded-[inherit]"
                style={{ background: 'linear-gradient(135deg, rgba(129,140,248,0.08) 0%, transparent 60%)' }} />

            <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(129,140,248,0.25)' }}>
                        {getGroupEmoji(group.type)}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg leading-tight" style={headingFont}>{group.name}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                            <GroupIcon className="size-3.5" style={{ color: '#A1A1A1' }} />
                            <span className="text-xs" style={{ color: '#A1A1A1', ...monoFont }}>{group.type}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); onDelete(); }}
                        className="opacity-0 group-hover:opacity-100 transition-all p-2 rounded-lg text-red-400 hover:bg-red-400/10">
                        <Trash2 className="size-4" />
                    </button>
                    <ChevronRight className="size-5" style={{ color: INDIGO }} />
                </div>
            </div>

            <div className="flex items-center gap-1.5 mt-3 relative z-10">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: INDIGO }} />
                <span className="text-xs" style={{ color: '#A1A1A1', ...monoFont }}>
                    {new Date(group.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
            </div>
        </GlassCard>
    );
}

// Main SplitKro Page Component
interface SplitKroProps { userId: string; userName: string; }

export function SplitKro({ userId, userName }: SplitKroProps) {
    const [groups, setGroups] = useState<SKGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<SKGroup | null>(null);

    const loadGroups = async () => {
        setLoading(true);
        const { data, error } = await splitKroApi.getGroups();
        if (error) toast.error('Failed to load groups: ' + error);
        else setGroups(data || []);
        setLoading(false);
    };

    useEffect(() => { loadGroups(); }, []);

    const handleDelete = async (group: SKGroup) => {
        if (!confirm(`Delete group "${group.name}"? This is permanent.`)) return;
        const { error } = await splitKroApi.deleteGroup(group.id);
        if (error) return toast.error(error);
        toast.success('Group deleted');
        loadGroups();
    };

    if (selectedGroup) {
        return (
            <GroupDetail
                group={selectedGroup}
                userId={userId}
                userName={userName}
                onBack={() => { setSelectedGroup(null); loadGroups(); }}
            />
        );
    }

    return (
        <div className="relative">
            {/* Hero Header */}
            <motion.div className="mb-8"
                initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
                                    border: '1px solid rgba(129,140,248,0.3)',
                                    boxShadow: '0 0 24px rgba(99,102,241,0.2)',
                                }}>
                                💸
                            </div>
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-bold text-white" style={headingFont}>Split Kro</h1>
                                <p className="text-sm" style={{ color: '#A1A1A1', ...monoFont }}>Group expense sharing, simplified</p>
                            </div>
                        </div>
                    </div>

                    <NeonButton onClick={() => setShowCreate(true)} className="shadow-[0_0_20px_rgba(99,102,241,0.35)]"
                        style={{ background: `linear-gradient(135deg, ${INDIGO_DARK}, #8B5CF6)` }}>
                        <Plus className="size-4" />
                        New Group
                    </NeonButton>
                </div>
            </motion.div>

            {/* Stats bar */}
            <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                {[
                    { label: 'Total Groups', value: groups.length.toString(), icon: '👥' },
                    { label: 'Active Splits', value: groups.length > 0 ? 'Tap to view' : 'None', icon: '📊' },
                    { label: 'Split Method', value: 'Smart Settle', icon: '⚡' },
                ].map((stat, i) => (
                    <GlassCard key={i} className="flex items-center gap-4" spacing="md">
                        <span className="text-2xl">{stat.icon}</span>
                        <div>
                            <div className="font-bold text-white" style={headingFont}>{stat.value}</div>
                            <div className="text-xs" style={{ color: '#A1A1A1', ...monoFont }}>{stat.label}</div>
                        </div>
                    </GlassCard>
                ))}
            </motion.div>

            {/* Groups Grid */}
            {loading ? (
                <div className="py-20 text-center">
                    <div className="inline-block w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin mb-4" />
                    <p style={{ color: '#A1A1A1', ...monoFont }}>Loading groups...</p>
                </div>
            ) : groups.length === 0 ? (
                <motion.div className="py-24 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl"
                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(129,140,248,0.2)' }}>
                        💸
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2" style={headingFont}>No groups yet</h2>
                    <p className="text-sm mb-6" style={{ color: '#A1A1A1', ...monoFont }}>
                        Create your first group to start splitting expenses
                    </p>
                    <NeonButton onClick={() => setShowCreate(true)} size="lg" className="shadow-[0_0_20px_rgba(99,102,241,0.35)]"
                        style={{ background: `linear-gradient(135deg, ${INDIGO_DARK}, #8B5CF6)` }}>
                        Create First Group
                    </NeonButton>
                </motion.div>
            ) : (
                <div>
                    <h2 className="text-lg font-semibold text-white mb-4" style={headingFont}>Your Groups</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                            {groups.map((group, i) => (
                                <motion.div key={group.id}
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.06 }}>
                                    <GroupCard
                                        group={group}
                                        onSelect={() => setSelectedGroup(group)}
                                        onDelete={() => handleDelete(group)}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {showCreate && (
                    <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={loadGroups} />
                )}
            </AnimatePresence>
        </div>
    );
}
