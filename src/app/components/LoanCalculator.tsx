import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Calculator, TrendingUp, Zap, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { GlassCard } from './ui/GlassCard';
import { NeonButton } from './ui/NeonButton';

// Design tokens
const TEAL = '#00F2EA';
const headingFont: React.CSSProperties = { fontFamily: 'Inter, Geist, SF Pro, sans-serif' };
const monoFont: React.CSSProperties = { fontFamily: 'JetBrains Mono, "Courier New", monospace' };

// Animated star canvas for modal backdrop
function ModalStars({ count = 120 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let id: number;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      alpha: Math.random(),
      speed: Math.random() * 0.004 + 0.001,
      drift: (Math.random() - 0.5) * 0.08,
      teal: Math.random() < 0.15,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        s.alpha += s.speed * (Math.random() > 0.5 ? 1 : -1);
        s.alpha = Math.max(0.05, Math.min(1, s.alpha));
        s.x += s.drift;
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width) s.x = 0;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.teal
          ? `rgba(0,242,234,${s.alpha * 0.7})`
          : `rgba(255,255,255,${s.alpha * 0.55})`;
        ctx.fill();
      });
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => { ro.disconnect(); cancelAnimationFrame(id); };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// Helper functions and styles
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px',
  background: 'rgba(255,255,255,0.055)',
  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(0,242,234,0.18)',
  borderRadius: '12px', color: '#fff', outline: 'none', ...monoFont,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
};
const focusInput = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = TEAL;
  e.currentTarget.style.boxShadow = `0 0 16px rgba(0,242,234,0.25), inset 0 1px 0 rgba(255,255,255,0.07)`;
};
const blurInput = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = 'rgba(0,242,234,0.18)';
  e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.07)';
};

interface LoanCalculatorProps { isOpen: boolean; onClose: () => void; currencySymbol: string; }
type InterestType = 'simple' | 'compound';
type DurationType = 'months' | 'years';

export function LoanCalculator({ isOpen, onClose, currencySymbol }: LoanCalculatorProps) {
  const [loanAmount, setLoanAmount] = useState('100000');
  const [interestRate, setInterestRate] = useState('10');
  const [duration, setDuration] = useState('12');
  const [durationType, setDurationType] = useState<DurationType>('months');
  const [interestType, setInterestType] = useState<InterestType>('compound');
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState({ totalInterest: 0, totalAmount: 0, monthlyEMI: 0, principal: 0 });

  // Animated counter
  const useCounter = (end: number, dur = 1200) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      if (!showResults) { setCount(0); return; }
      let startTime: number;
      let af: number;
      const animate = (t: number) => {
        if (!startTime) startTime = t;
        const p = Math.min((t - startTime) / dur, 1);
        setCount(Math.floor(p * end));
        if (p < 1) af = requestAnimationFrame(animate);
      };
      af = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(af);
    }, [end, dur, showResults]);
    return count;
  };

  const calculateLoan = () => {
    const principal = parseFloat(loanAmount);
    const rate = parseFloat(interestRate) / 100;
    const time = durationType === 'years' ? parseFloat(duration) : parseFloat(duration) / 12;
    const timeInMonths = durationType === 'months' ? parseFloat(duration) : parseFloat(duration) * 12;
    let totalInterest = 0, totalAmount = 0, monthlyEMI = 0;
    if (interestType === 'simple') {
      totalInterest = principal * rate * time;
      totalAmount = principal + totalInterest;
      monthlyEMI = totalAmount / timeInMonths;
    } else {
      const mr = rate / 12;
      monthlyEMI = mr === 0 ? principal / timeInMonths
        : (principal * mr * Math.pow(1 + mr, timeInMonths)) / (Math.pow(1 + mr, timeInMonths) - 1);
      totalAmount = monthlyEMI * timeInMonths;
      totalInterest = totalAmount - principal;
    }
    setResults({ totalInterest: Math.round(totalInterest), totalAmount: Math.round(totalAmount), monthlyEMI: Math.round(monthlyEMI), principal });
    setShowResults(true);
  };

  const handleReset = () => {
    setShowResults(false);
    setLoanAmount('100000'); setInterestRate('10'); setDuration('12');
    setDurationType('months'); setInterestType('compound');
  };

  const animEMI = useCounter(results.monthlyEMI);
  const animInterest = useCounter(results.totalInterest);
  const animTotal = useCounter(results.totalAmount);

  const chartData = [
    { name: 'Principal', value: results.principal },
    { name: 'Interest', value: results.totalInterest },
  ];
  const CHART_COLORS = [TEAL, '#005d5b'];

  if (!isOpen) return null;

  const toggleBtnOn: React.CSSProperties = {
    background: TEAL, color: '#000', fontWeight: 700, borderRadius: '8px',
    padding: '7px 16px', ...monoFont,
    boxShadow: '0 0 12px rgba(0,242,234,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
  };
  const toggleBtnOff: React.CSSProperties = { color: '#A1A1A1', borderRadius: '8px', padding: '7px 16px', ...monoFont };

  const interestBtnOn: React.CSSProperties = {
    background: TEAL, color: '#000', fontWeight: 700, ...headingFont,
    boxShadow: '0 0 14px rgba(0,242,234,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
    borderRadius: '10px', padding: '10px',
  };
  const interestBtnOff: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', color: '#A1A1A1', ...monoFont,
    border: '1px solid rgba(0,242,234,0.14)', backdropFilter: 'blur(12px)',
    borderRadius: '10px', padding: '10px',
  };

  return (
    <>
      {/* Backdrop with hidden stars */}
      <div className="fixed inset-0 z-50 overflow-hidden">
        <ModalStars count={140} />
        {/* Teal radial glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(0,242,234,0.04) 0%, transparent 70%)' }} />
        {/* Dimmer overlay */}
        <motion.div className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.82)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={onClose}
        />
      </div>

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pointer-events-none">
        <motion.div
          className="relative w-full max-w-5xl my-8 pointer-events-auto"
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        >
          {/* Floating teal orb decorations */}
          <motion.div className="absolute -top-8 -right-8 w-16 h-16 rounded-full flex items-center justify-center z-10"
            style={{
              background: 'rgba(0,242,234,0.12)', border: '1.5px solid rgba(0,242,234,0.45)',
              backdropFilter: 'blur(12px)', boxShadow: '0 0 32px rgba(0,242,234,0.35)',
              color: TEAL, fontWeight: 800, fontSize: '1.25rem', ...monoFont,
            }}
            animate={{ y: [0, -16, 0], rotate: [0, 12, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >{currencySymbol}</motion.div>

          <motion.div className="absolute -bottom-6 -left-6 w-12 h-12 rounded-full flex items-center justify-center z-10"
            style={{
              background: 'rgba(0,242,234,0.08)', border: '1.5px solid rgba(0,242,234,0.35)',
              backdropFilter: 'blur(12px)', boxShadow: '0 0 22px rgba(0,242,234,0.25)',
              color: TEAL, fontWeight: 800, fontSize: '1rem', ...monoFont,
            }}
            animate={{ y: [0, 12, 0], rotate: [0, -12, 0] }}
            transition={{ duration: 5, repeat: Infinity, delay: 1, ease: 'easeInOut' }}
          >{currencySymbol}</motion.div>

          {/* Pulsing corner glow */}
          <motion.div className="absolute -inset-1 rounded-3xl pointer-events-none"
            style={{ background: 'transparent', boxShadow: '0 0 60px rgba(0,242,234,0.08)' }}
            animate={{ boxShadow: ['0 0 40px rgba(0,242,234,0.06)', '0 0 80px rgba(0,242,234,0.13)', '0 0 40px rgba(0,242,234,0.06)'] }}
            transition={{ duration: 4, repeat: Infinity }}
          />

          {/* Main Glass Card */}
          <GlassCard
            className="w-full relative"
            spacing="none"
            style={{
              boxShadow: '0 32px 90px rgba(0,0,0,0.9), 0 0 60px rgba(0,242,234,0.07)',
            }}
          >
            <div className="relative">
              {/* Glass sheen */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(0,242,234,0.03) 40%, transparent 70%)' }} />
              {/* Top teal glow line */}
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(0,242,234,0.7) 50%, transparent 95%)' }} />

              {/* Header */}
              <div className="relative px-8 py-6" style={{ borderBottom: '1px solid rgba(0,242,234,0.1)' }}>
                {/* Subtle scan-line shimmer on header */}
                <motion.div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0,242,234,0.04) 50%, transparent 100%)', backgroundSize: '200% 100%' }}
                  animate={{ backgroundPosition: ['-100% 0', '200% 0'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                />

                <button onClick={onClose} className="absolute top-6 right-6 transition-colors z-10"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = TEAL)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                ><X className="size-6" /></button>

                <div className="flex items-center gap-4 relative z-10">
                  <motion.div className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'rgba(0,242,234,0.1)', border: '1px solid rgba(0,242,234,0.3)',
                      boxShadow: '0 0 28px rgba(0,242,234,0.18), inset 0 1px 0 rgba(0,242,234,0.25)',
                    }}
                    animate={{ boxShadow: ['0 0 18px rgba(0,242,234,0.15)', '0 0 36px rgba(0,242,234,0.3)', '0 0 18px rgba(0,242,234,0.15)'] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Calculator className="size-7" style={{ color: TEAL, filter: 'drop-shadow(0 0 10px #00F2EA)' }} />
                  </motion.div>
                  <div>
                    <div className="text-xs mb-1 tracking-widest uppercase" style={{ color: TEAL, ...monoFont, letterSpacing: '0.15em' }}>Financial Tools</div>
                    <h2 className="text-2xl font-bold text-white" style={headingFont}>Loan Interest Calculator</h2>
                    <p className="text-sm mt-0.5" style={{ color: '#A1A1A1', ...monoFont }}>Calculate your EMI and interest breakdown</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="relative p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                  {/* LEFT: Form */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="size-4" style={{ color: TEAL }} />
                      <h3 className="text-base font-semibold tracking-wide uppercase" style={{ color: '#A1A1A1', ...monoFont, letterSpacing: '0.1em' }}>Loan Details</h3>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Loan Amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-lg" style={{ color: TEAL, ...monoFont }}>{currencySymbol}</span>
                        <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)}
                          style={{ ...inputStyle, paddingLeft: '2.5rem' }} placeholder="100000"
                          onFocus={focusInput} onBlur={blurInput} />
                      </div>
                    </div>

                    {/* Rate */}
                    <div>
                      <label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Interest Rate (% per annum)</label>
                      <div className="relative">
                        <input type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)}
                          style={{ ...inputStyle, paddingRight: '2.5rem' }} placeholder="10"
                          onFocus={focusInput} onBlur={blurInput} />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold" style={{ color: TEAL, ...monoFont }}>%</span>
                      </div>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Loan Duration</label>
                      <div className="flex gap-3">
                        <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
                          style={{ ...inputStyle }} placeholder="12"
                          onFocus={focusInput} onBlur={blurInput} />
                        <div className="flex items-center rounded-xl p-1 shrink-0"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,242,234,0.15)', backdropFilter: 'blur(12px)' }}>
                          <button onClick={() => setDurationType('months')} style={durationType === 'months' ? toggleBtnOn : toggleBtnOff}>Mo</button>
                          <button onClick={() => setDurationType('years')} style={durationType === 'years' ? toggleBtnOn : toggleBtnOff}>Yr</button>
                        </div>
                      </div>
                    </div>

                    {/* Interest Type */}
                    <div>
                      <label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Interest Type</label>
                      <div className="flex gap-3">
                        {(['simple', 'compound'] as InterestType[]).map((t) => (
                          <button key={t} onClick={() => setInterestType(t)}
                            className="flex-1 transition-all"
                            style={interestType === t ? interestBtnOn : interestBtnOff}
                            onMouseEnter={(e) => { if (interestType !== t) e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={(e) => { if (interestType !== t) e.currentTarget.style.color = '#A1A1A1'; }}
                          >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick-pick sliders display */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {[
                        { label: 'Principal', value: `${currencySymbol}${parseFloat(loanAmount || '0').toLocaleString()}` },
                        { label: 'Rate', value: `${interestRate}% p.a.` },
                        { label: 'Period', value: `${duration} ${durationType}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="p-3 rounded-xl text-center relative overflow-hidden"
                          style={{ background: 'rgba(0,242,234,0.05)', border: '1px solid rgba(0,242,234,0.12)', backdropFilter: 'blur(10px)' }}>
                          <div className="text-xs mb-1" style={{ color: '#A1A1A1', ...monoFont }}>{label}</div>
                          <div className="text-sm font-bold" style={{ color: TEAL, ...monoFont }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <NeonButton onClick={calculateLoan} className="flex-1 py-3.5 shadow-[0_0_22px_rgba(0,242,234,0.38)]"
                        style={{ background: TEAL, color: '#000' }}>
                        <Calculator className="size-5" /> Calculate
                      </NeonButton>
                      <NeonButton variant="ghost" onClick={handleReset} className="px-5 py-3.5">
                        <RefreshCw className="size-4" /> Reset
                      </NeonButton>
                    </div>
                  </div>

                  {/* RIGHT: Results */}
                  <div>
                    {!showResults ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-6">
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
                        >
                          <TrendingUp className="size-24" style={{ color: 'rgba(0,242,234,0.18)', filter: 'drop-shadow(0 0 20px rgba(0,242,234,0.15))' }} />
                        </motion.div>
                        {/* Pulse rings */}
                        <div className="relative flex items-center justify-center">
                          {[0, 1, 2].map((i) => (
                            <motion.div key={i} className="absolute rounded-full"
                              style={{ width: 40 + i * 30, height: 40 + i * 30, border: '1px solid rgba(0,242,234,0.15)' }}
                              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.6 }}
                            />
                          ))}
                          <div className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(0,242,234,0.1)', border: '1px solid rgba(0,242,234,0.3)' }}>
                            <Calculator className="size-5" style={{ color: TEAL }} />
                          </div>
                        </div>
                        <p className="text-sm" style={{ color: '#A1A1A1', ...monoFont }}>Enter loan details and click Calculate to see results</p>
                      </div>
                    ) : (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="size-4" style={{ color: TEAL }} />
                          <h3 className="text-base font-semibold tracking-wide uppercase" style={{ color: '#A1A1A1', ...monoFont, letterSpacing: '0.1em' }}>Loan Breakdown</h3>
                        </div>

                        {/* Result cards */}
                        {[
                          { label: 'Monthly EMI', value: animEMI, accent: TEAL, delay: 0.05 },
                          { label: 'Total Interest Payable', value: animInterest, accent: '#F87171', delay: 0.15 },
                          { label: 'Total Amount Payable', value: animTotal, accent: '#34D399', delay: 0.25 },
                        ].map(({ label, value, accent, delay }) => (
                          <motion.div key={label}
                            className="p-5 rounded-xl relative overflow-hidden group"
                            style={{
                              background: `rgba(${accent === TEAL ? '0,242,234' : accent === '#F87171' ? '248,113,113' : '52,211,153'},0.07)`,
                              border: `1px solid ${accent}28`,
                              backdropFilter: 'blur(12px)',
                              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06)`,
                            }}
                            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}
                            whileHover={{ borderColor: `${accent}55`, boxShadow: `0 0 20px ${accent}18, inset 0 1px 0 rgba(255,255,255,0.06)` }}
                          >
                            <div className="absolute inset-0 pointer-events-none rounded-[inherit]"
                              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 60%)' }} />
                            <div className="text-xs mb-1 relative" style={{ color: '#A1A1A1', ...monoFont }}>{label}</div>
                            <div className="text-3xl font-bold relative" style={{ color: accent, ...headingFont, textShadow: `0 0 24px ${accent}55` }}>
                              {currencySymbol}{value.toLocaleString()}
                            </div>
                            {/* Animated progress bar */}
                            <motion.div className="absolute bottom-0 left-0 h-0.5 rounded-full"
                              style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
                              initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 0.8, delay: delay + 0.2 }}
                            />
                          </motion.div>
                        ))}

                        {/* Pie chart */}
                        <motion.div className="p-5 rounded-xl relative overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,242,234,0.1)', backdropFilter: 'blur(12px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}
                        >
                          <div className="absolute inset-0 pointer-events-none"
                            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)' }} />
                          <h4 className="text-xs font-semibold mb-3 uppercase tracking-widest relative" style={{ color: '#A1A1A1', ...monoFont }}>Principal vs Interest</h4>
                          <div className="h-[190px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={chartData} cx="50%" cy="50%" labelLine={false} outerRadius={78} dataKey="value" animationBegin={0} animationDuration={900}>
                                  {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip
                                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,242,234,0.25)', borderRadius: '10px', color: '#fff', ...monoFont }}
                                  formatter={(v: number) => `${currencySymbol}${v.toLocaleString()}`}
                                />
                                <Legend wrapperStyle={{ color: '#A1A1A1', ...monoFont }} iconType="circle" />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </>
  );
}
