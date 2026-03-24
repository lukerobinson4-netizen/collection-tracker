import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  open: boolean
  onClose: () => void
  title?: string | React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }

export default function Modal({ open, onClose, title, children, footer, size = 'md', className }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className={clsx(
        'relative bg-[#141414] border border-[#2a2a2a] w-full rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up flex flex-col',
        'max-h-[92dvh] sm:max-h-[85vh]',
        sizes[size], className
      )}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a] shrink-0">
            <h3 className="font-semibold text-base">{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#666] hover:text-white hover:bg-white/10 transition-colors touch-target">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-[#2a2a2a] flex items-center justify-between shrink-0">{footer}</div>
        )}
      </div>
    </div>
  )
}
