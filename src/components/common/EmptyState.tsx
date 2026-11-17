import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-[#E2DFF0] dark:border-[#343047] rounded-2xl bg-white dark:bg-[#1C1B31] ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6] dark:text-[#B8A5FF] flex items-center justify-center mb-4 shadow-xs border border-[#8B5CF6]/20">
        <Icon className="w-7 h-7 text-[#8B5CF6] dark:text-[#B8A5FF]" />
      </div>
      <h4 className="text-base font-semibold text-[#101225] dark:text-[#F6F3FB] tracking-tight">{title}</h4>
      <p className="text-xs sm:text-sm text-[#858198] dark:text-[#AAA6BD] max-w-sm mt-1.5 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white hover:opacity-95 transition-all shadow-md shadow-[#8B5CF6]/20 active:scale-95"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
