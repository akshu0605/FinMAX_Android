import { HTMLAttributes, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility to intelligently merge Tailwind classes */
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: ReactNode;
    /**
     * If true, applies a subtle cyan border and inner cyan background tint.
     * Useful for active states or highlighted callouts.
     */
    active?: boolean;
    /**
     * Adjusts the padding of the card.
     * @default "md" (24px)
     */
    spacing?: 'none' | 'sm' | 'md' | 'lg';
    /**
     * If true, applies an interactive hover scale and glow effect.
     */
    interactive?: boolean;
    /**
     * Corner rounding level.
     * @default "lg" (24px)
     */
    rounded?: 'md' | 'lg' | 'apple';
}

export function GlassCard({
    children,
    className,
    active = false,
    spacing = 'md',
    interactive = false,
    rounded = 'lg',
    ...props
}: GlassCardProps) {
    // Map spacing prop to structural classes
    const paddingMap = {
        none: 'p-0',
        sm: 'p-3 md:p-4',
        md: 'p-4 md:p-5 lg:p-6',
        lg: 'p-6 md:p-8',
    };

    const roundedMap = {
        md: 'rounded-lg',
        lg: 'rounded-xl md:rounded-2xl',
        apple: 'rounded-2xl md:rounded-3xl',
    };

    return (
        <motion.div
            className={cn(
                // Base structure
                'relative overflow-hidden',
                roundedMap[rounded],
                paddingMap[spacing],
                // Glassmorphism tokens (spec-aligned)
                active ? 'ns-glass-active' : 'ns-glass',
                // Interactive state transitions
                interactive && 'cursor-pointer transition-shadow duration-300',
                className
            )}
            // Optional interactive properties
            whileHover={interactive ? { scale: 1.015, y: -2 } : undefined}
            whileTap={interactive ? { scale: 0.98 } : undefined}
            // Animation overrides for standard scroll enter
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ ease: [0.25, 0.1, 0.25, 1], duration: 0.6 }}
            {...props}
        >
            {/* Subtle top sheen reflection for glass realism */}
            <div
                className="absolute inset-x-0 top-0 h-px pointer-events-none opacity-60"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), rgba(0,242,234,0.15), transparent)' }}
            />
            {/* Soft inner glow */}
            <div className="absolute inset-0 pointer-events-none rounded-[inherit]"
                style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08)' }} />

            {/* Content wrapper relative to clip behind effects */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </motion.div>
    );
}
