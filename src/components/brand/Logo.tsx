import React from 'react';

interface LogoProps {
  variant?: 'dark' | 'light' | 'white' | 'icon-only';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

const sizes = {
  xs: { mark: 24, title: 'text-xs', tagline: 'text-[8px]' },
  sm: { mark: 32, title: 'text-sm', tagline: 'text-[9px]' },
  md: { mark: 40, title: 'text-lg', tagline: 'text-[10px]' },
  lg: { mark: 52, title: 'text-2xl', tagline: 'text-xs' },
  xl: { mark: 68, title: 'text-3xl', tagline: 'text-sm' },
} as const;

/**
 * Header-safe Moonbox Salon lockup. The square official artwork is a brand
 * poster, not a header logo, so navigation uses the compact mark with a
 * controlled text lockup to prevent oversized rendering.
 */
export const Logo: React.FC<LogoProps> = ({
  variant = 'light',
  size = 'md',
  showTagline = false,
  className = '',
}) => {
  const dimensions = sizes[size];
  const compact = variant === 'icon-only';
  const textTone = variant === 'dark' || variant === 'white' ? 'text-white' : 'text-foreground';

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 select-none ${className}`}
      title="Moonbox Salon"
      aria-label="Moonbox Salon — Building a smarter salon."
    >
      <img
        src="/brand/moonbox-salon-mark.jpg"
        alt="Moonbox Salon mark"
        width={dimensions.mark}
        height={dimensions.mark}
        className="block shrink-0 rounded-xl object-cover"
        style={{ width: dimensions.mark, height: dimensions.mark }}
        draggable={false}
      />
      {!compact && (
        <span className={`min-w-0 leading-none ${textTone}`}>
          <span className={`block whitespace-nowrap font-display font-extrabold tracking-tight ${dimensions.title}`}>
            Moonbox<span className="font-medium text-muted-foreground">Salon</span>
          </span>
          {showTagline && <span className={`mt-1 block whitespace-nowrap font-medium tracking-[0.14em] text-muted-foreground ${dimensions.tagline}`}>Building a smarter salon.</span>}
        </span>
      )}
    </span>
  );
};
