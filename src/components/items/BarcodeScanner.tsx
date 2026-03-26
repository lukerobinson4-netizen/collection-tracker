import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Camera, Loader2, RotateCcw, TrendingUp, CheckCircle, RefreshCw } from 'lucide-react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { lookupBarcode, type LookupResult } from '../../lib/lookup'

interface Props {
  onResult: (result: LookupResult) => void
  onClose: () => void
}

type ScanStatus = 'scanning' | 'looking-up' | 'found' | 'not-found' | 'error'

function fmt(n: number | null | undefined, currency = 'USD') {
  if (n == null) return null
  return n.toLocaleString('en-US', { style: 'currency', currency, maximumFractionDigits: 0 })
}

export default function BarcodeScanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const scanning = useRef(false)
  const [status, setStatus] = useState<ScanStatus>('scanning')
  const [errorMsg, setErrorMsg] = useState('')
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  // 'environment' = back camera (default), 'user' = front camera
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [result, setResult] = useState<LookupResult | null>(null)

  const stopCamera = useCallback(() => {
    scanning.current = false
    controlsRef.current?.stop()
    controlsRef.current = null
    // Also stop any lingering media tracks directly
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
  }, [])

  const startScanning = useCallback(async (facing: 'environment' | 'user') => {
    stopCamera()
    setStatus('scanning')
    setErrorMsg('')
    setResult(null)
    scanning.current = true

    try {
      // Check how many cameras are available (to show/hide rotate button)
      const devs = await BrowserMultiFormatReader.listVideoInputDevices()
      setHasMultipleCameras(devs.length > 1)

      // Use facingMode constraint — more reliable on iOS than selecting by deviceId
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })

      const reader = new BrowserMultiFormatReader()
      const controls = await reader.decodeFromStream(
        stream,
        videoRef.current!,
        async (res, err) => {
          if (!scanning.current) return
          if (res) {
            scanning.current = false
            controls.stop()
            setStatus('looking-up')
            const info = await lookupBarcode(res.getText())
            setResult(info)
            setStatus(info.name ? 'found' : 'not-found')
          } else if (err && !String(err).includes('NotFoundException')) {
            console.warn('Scanner error:', err)
          }
        }
      )
      controlsRef.current = controls
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrorMsg(
        msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('NotFoundError')
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : `Camera error: ${msg}`
      )
      setStatus('error')
    }
  }, [stopCamera])

  useEffect(() => {
    startScanning(facingMode)
    return stopCamera
  }, [facingMode])

  const handleFlip = () => setFacingMode(f => f === 'environment' ? 'user' : 'environment')

  const handleConfirm = () => {
    stopCamera()
    onResult(result!)
  }

  const handleRescan = () => startScanning(facingMode)
  const handleClose = () => { stopCamera(); onClose() }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header — padded for iOS notch / Dynamic Island */}
      <div
        className="flex items-center justify-between px-4 bg-black/90 backdrop-blur shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: '12px' }}
      >
        <span className="text-sm font-medium text-white">Scan Barcode</span>
        <div className="flex items-center gap-2">
          {hasMultipleCameras && status === 'scanning' && (
            <button onClick={handleFlip}
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Flip camera">
              <RotateCcw size={16} />
            </button>
          )}
          <button onClick={handleClose}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Video (always mounted so camera warms up) */}
      <div className={`${status === 'scanning' ? 'flex-1' : 'h-0 overflow-hidden'} relative`}>
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
        {status === 'scanning' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="relative w-64 h-44 sm:w-80 sm:h-56">
              {(['tl', 'tr', 'bl', 'br'] as const).map(c => (
                <div key={c} className={`absolute w-8 h-8 border-white border-2 ${
                  c === 'tl' ? 'top-0 left-0 border-r-0 border-b-0 rounded-tl-xl' :
                  c === 'tr' ? 'top-0 right-0 border-l-0 border-b-0 rounded-tr-xl' :
                  c === 'bl' ? 'bottom-0 left-0 border-r-0 border-t-0 rounded-bl-xl' :
                              'bottom-0 right-0 border-l-0 border-t-0 rounded-br-xl'
                }`} />
              ))}
              <div className="absolute left-2 right-2 h-0.5 bg-green-400 shadow-[0_0_10px_#4ade80]"
                style={{ animation: 'scanLine 2s ease-in-out infinite' }} />
            </div>
            <p className="absolute bottom-16 text-white/50 text-sm text-center px-8">
              Point camera at a barcode or QR code
            </p>
          </div>
        )}
      </div>

      {/* Looking up overlay */}
      {status === 'looking-up' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#0a0a0a]">
          <Loader2 size={40} className="animate-spin text-white/50" />
          <p className="text-white/60 text-sm">Looking up product details…</p>
          <p className="text-white/30 text-xs">Checking 4 databases</p>
        </div>
      )}

      {/* Found result card */}
      {(status === 'found' || status === 'not-found') && result && (
        <div className="flex-1 overflow-y-auto bg-[#0a0a0a] px-4 py-5">
          <div className="max-w-md mx-auto space-y-4">

            {/* Product details */}
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden">
              {status === 'found' ? (
                <div className="flex gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center">
                    {result.imageUrl
                      ? <img src={result.imageUrl} className="w-full h-full object-cover" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : <Camera size={24} className="text-[#444]" />
                    }
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" />
                      <span className="text-xs text-green-400 font-medium">Product found</span>
                    </div>
                    <p className="font-semibold text-sm leading-snug line-clamp-2">{result.name}</p>
                    {result.brand && <p className="text-xs text-[#666] mt-0.5">{result.brand}</p>}
                    {result.type && <p className="text-xs text-[#444] mt-0.5">{result.type}</p>}
                    <p className="text-xs text-[#333] mt-1 font-mono">#{result.barcode}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-[#666] mb-1">No details found</p>
                  <p className="text-xs text-[#444] font-mono">{result.barcode}</p>
                  <p className="text-xs text-[#444] mt-2">You can still add it manually</p>
                </div>
              )}
            </div>

            {/* Market prices */}
            {result.prices && (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={14} className="text-[#555]" />
                  <span className="text-xs text-[#555] uppercase tracking-wide font-medium">Market Prices</span>
                  <span className="ml-auto text-xs text-[#444]">via {result.prices.source}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Low', value: result.prices.low, color: '#10b981' },
                    { label: 'Avg', value: result.prices.avg, color: '#f59e0b' },
                    { label: 'High', value: result.prices.high, color: '#ef4444' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center">
                      <p className="text-xs text-[#555] mb-1">{label}</p>
                      <p className="font-mono font-semibold text-sm" style={{ color }}>
                        {value != null ? fmt(value, result.prices!.currency) : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={handleRescan}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444] transition-all text-sm">
                <RefreshCw size={15} /> Scan Again
              </button>
              <button onClick={handleConfirm}
                className="flex-2 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all">
                <CheckCircle size={15} /> Add to Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center bg-[#0a0a0a]">
          <Camera size={40} className="text-[#555]" />
          <p className="text-white/70 text-sm">{errorMsg}</p>
          <button onClick={() => startScanning(facingMode)}
            className="px-5 py-2.5 bg-white/10 rounded-xl text-sm text-white hover:bg-white/20 transition-colors">
            Try Again
          </button>
        </div>
      )}

      <style>{`
        @keyframes scanLine {
          0%   { top: 8%; }
          50%  { top: 88%; }
          100% { top: 8%; }
        }
      `}</style>
    </div>
  )
}
