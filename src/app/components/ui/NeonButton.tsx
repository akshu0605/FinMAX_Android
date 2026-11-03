import { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Intersect HTMLButtonElements and HTMLMotionProps safely
type MotionButtonProps = Omit<HTMLMotionProps<"button">, "ref"> &
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof HTMLMotionProps<"button">>;

export interface NeonButtonProps extends MotionButtonProps {
    /**
     * The visual style of the button.
     * @default 'primary'
     */
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    /**
     * The size of the button (padding & text).
     * @default 'md'
     */
    size?: 'sm' | 'md' | 'lg';
    /**
     * If true, applies a solid glow shadow (used for primary actions).
     * @default false for non-primary.
     */
    glow?: boolean;
}

export const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(
    (
        {
            className,
            variant = 'primary',
            size = 'md',
            glow,
            children,
            disabled,
            ...props
        },
        ref
    ) => {
        // Determine glow based on variant if not explicitly set
        const shouldGlow = glow ?? variant === 'primary';

        // Style mappings
        const variants = {
            primary: `bg-[var(--ns-cyan)] text-black border border-transparent font-semibold shadow-[var(--ns-glow-cyan)] hover:shadow-[var(--ns-glow-cyan-strong)]`,
            secondary: `ns-glass text-[var(--ns-text-primary)] hover:border-[var(--ns-cyan)] hover:bg-[rgba(0,242,255,0.05)] hover:shadow-[var(--ns-glow-cyan)]`,
            ghost: `bg-transparent border border-transparent text-[var(--ns-text-secondary)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]`,
            danger: `bg-[oklch(0.396_0.141_25.723)] text-white border border-transparent hover:bg-red-600 shadow-sm shadow-red-900`,
        };

        const sizes = {
            sm: 'px-4 py-2 text-[var(--ns-text-sm)] rounded-lg',
            md: 'px-6 py-3 text-[var(--ns-text-base)] rounded-xl flex items-center justify-center gap-2',
            lg: 'px-8 py-4 text-[var(--ns-text-lg)] rounded-2xl flex items-center justify-center gap-3',
        };

        // Apple-style interactions: smooth, slight spring scale
        const motionTap = disabled ? {} : { scale: 0.96 };
        const motionHover = disabled ? {} : { scale: variant === 'ghost' ? 1 : 1.02 };

        return (
            <motion.button
                ref={ref}
                className={cn(
                    'relative inline-flex items-center justify-center font-medium outline-offset-2',
                    'transition-colors duration-300',
                    variants[variant],
                    sizes[size],
                    disabled && 'opacity-50 cursor-not-allowed pointer-events-none filter grayscale-[50%]',
                    className
                )}
                whileHover={motionHover}
                whileTap={motionTap}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                {...props}
            >
                {/* Shimmer/Reflection overlay for Secondary glass variant */}
                {variant === 'secondary' && !disabled && (
                    <div className="absolute inset-0 rounded-inherit opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{ background: 'linear-gradient(120deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
                )}
                <span className="relative z-10 flex items-center gap-2">{children as React.ReactNode}</span>
            </motion.button>
        );
    }
);
NeonButton.displayName = 'NeonButton';
