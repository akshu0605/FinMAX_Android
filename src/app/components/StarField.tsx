import { useEffect, useRef } from 'react';

interface StarFieldProps {
    /** Number of stars to draw (default 160) */
    count?: number;
}

/**
 * Canvas-based animated star field for the cyber-noir background.
 * Stars twinkle randomly and drift very slowly.
 */
export function StarField({ count = 160 }: StarFieldProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;

        // Resize canvas to full window
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Generate stars
        const stars = Array.from({ length: count }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: Math.random() * 1.4 + 0.2,          // radius 0.2–1.6
            alpha: Math.random(),                    // current opacity
            alphaDir: Math.random() > 0.5 ? 1 : -1, // twinkle direction
            alphaSpeed: Math.random() * 0.004 + 0.001,
            drift: (Math.random() - 0.5) * 0.04,    // tiny horizontal drift
            // ~5% chance to be teal-tinted
            teal: Math.random() < 0.05,
        }));

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            stars.forEach((s) => {
                // Twinkle
                s.alpha += s.alphaSpeed * s.alphaDir;
                if (s.alpha >= 1) { s.alpha = 1; s.alphaDir = -1; }
                if (s.alpha <= 0.05) { s.alpha = 0.05; s.alphaDir = 1; }

                // Drift
                s.x += s.drift;
                if (s.x < 0) s.x = canvas.width;
                if (s.x > canvas.width) s.x = 0;

                ctx.save();
                ctx.globalAlpha = s.alpha;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);

                if (s.teal) {
                    // Teal star with soft glow
                    ctx.fillStyle = '#00F2EA';
                    ctx.shadowColor = '#00F2EA';
                    ctx.shadowBlur = 6;
                } else {
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = '#ffffff';
                    ctx.shadowBlur = 2;
                }
                ctx.fill();
                ctx.restore();
            });

            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, [count]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
        />
    );
}
