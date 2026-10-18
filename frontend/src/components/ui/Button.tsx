'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'relative inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white font-semibold hover:shadow-[0_0_20px_rgba(59,130,246,0.45)] hover:brightness-110 active:scale-[0.98]',
    secondary:
      'bg-[#071B25] text-[#60a5fa] border border-[#3b82f6]/30 hover:border-[#3b82f6] hover:bg-[#09232F] hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]',
    outline:
      'bg-transparent text-[#91A9B7] border border-[#3b82f6]/20 hover:text-[#F1F8FC] hover:border-[#3b82f6]/50 hover:bg-[#3b82f6]/10',
    ghost:
      'bg-transparent text-[#91A9B7] hover:text-[#60a5fa] hover:bg-[#3b82f6]/10',
    danger:
      'bg-[#FB7185]/10 text-[#FB7185] border border-[#FB7185]/30 hover:bg-[#FB7185]/20 hover:border-[#FB7185]/60',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};
