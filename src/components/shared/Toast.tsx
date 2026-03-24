import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import clsx from 'clsx'

const icons = {
  success: <CheckCircle size={16} className="text-emerald-400 shrink-0" />,
  error: <AlertCircle size={16} className="text-red-400 shrink-0" />,
  info: <Info size={16} className="text-blue-400 shrink-0" />,
}

export default function ToastContainer() {
  const { toasts, removeToast } = useAppStore()

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={clsx(
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border pointer-events-auto animate-slide-up',
            'bg-[#1c1c1c] border-[#2a2a2a] min-w-[220px] max-w-[320px]'
          )}
        >
          {icons[t.type]}
          <span className="text-sm flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="text-[#555] hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
