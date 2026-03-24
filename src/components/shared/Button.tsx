import clsx from 'clsx'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const variants = {
  primary: 'bg-[var(--accent)] text-black font-semibold hover:opacity-90 active:scale-[0.98]',
  secondary: 'bg-[#222] border border-[#333] text-white hover:bg-[#2a2a2a] active:scale-[0.98]',
  ghost: 'text-[#aaa] hover:text-white hover:bg-white/10 active:scale-[0.98]',
  danger: 'text-red-400 hover:text-red-300 hover:bg-red-500/10 active:scale-[0.98]',
}
const sizes = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-9 px-4 text-sm rounded-lg',
  lg: 'h-11 px-6 text-base rounded-xl',
}

export default function Button({ variant = 'secondary', size = 'md', loading, fullWidth, className, children, disabled, ...props }: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variants[variant], sizes[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}
