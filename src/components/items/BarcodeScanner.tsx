import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Camera, Loader2, RotateCcw } from 'lucide-react'
import { BrowserMultiFormatReader } from '@zxing/browser'

interface ScanResult {
  barcode: string
  name?: string
  brand?: string
  type?: string
}

interface Props {
  onResult: (result: ScanResult) => void
  onClose: () => void
}

async function lookupBarcode(barcode: string): Promise<ScanResult> {
  // Try Open Food Facts (UPC/EAN products)
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
    if (res.ok) {
      const data = await res.json()
      if (data.status === 1 && data.product) {
        const p = data.product
        return {
          barcode,
          name: p.product_name || p.product_name_en || '',
          brand: p.brands || '',
          type: p.categories_tags?.[0]?.replace('en:', '').replace(/-/g, ' ') || '',
        }
      }
    }
  } catch { /* ignore */ }

  // Try Open Library for books (ISBN-13 or ISBN-10)
  if (barcode.length === 13 || barcode.length === 10) {
    try {
      const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${barcode}&format=json&jscmd=data`)
      if (res.ok) {
        const data = await res.json()
        const book = data[`ISBN:${barcode}`]
        if (book) {
          return {
            barcode,
            name: book.title || '',
            brand: book.authors?.[0]?.name || '',
            type: 'Book',
          }
        }
      }
    } catch { /* ignore */ }
  }

  return { barcode }
}

export default function BarcodeScanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const [status, setStatus] = useState<'scanning' | 'looking-up' | 'error'>('scanning')
  const [errorMsg, setErrorMsg] = useState('')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceIdx, setDeviceIdx] = useState(0)
  const scanning = useRef(false)

  const stopAll = useCallback(() => {
    scanning.current = false
    controlsRef.current?.stop()
    controlsRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const startScanning = useCallback(async (devIdx: number) => {
    stopAll()
    setStatus('scanning')
    setErrorMsg('')
    scanning.current = true

    try {
      const devs = await BrowserMultiFormatReader.listVideoInputDevices()
      setDevices(devs)

      const reader = new BrowserMultiFormatReader()
      const deviceId = devs[devIdx]?.deviceId

      const controls = await reader.decodeFromVideoDevice(
        deviceId ?? undefined,
        videoRef.current!,
        async (result, err) => {
          if (!scanning.current) return
          if (result) {
            scanning.current = false
            const barcode = result.getText()
            setStatus('looking-up')
            controls.stop()

            const info = await lookupBarcode(barcode)
            onResult(info)
          } else if (err && !String(err).includes('NotFoundException')) {
            // Only surface non-NotFoundException errors (NotFoundException fires every frame when no barcode visible)
            console.warn('Scanner error:', err)
          }
        }
      )
      controlsRef.current = controls
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrorMsg(
        msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('NotFoundError')
          ? 'Camera permission denied. Please allow camera access.'
          : `Camera error: ${msg}`
      )
      setStatus('error')
    }
  }, [stopAll, onResult])

  useEffect(() => {
    startScanning(deviceIdx)
    return stopAll
  }, [deviceIdx])

  const switchCamera = () => setDeviceIdx(i => (i + 1) % Math.max(devices.length, 1))

  const handleClose = () => { stopAll(); onClose() }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/90 backdrop-blur shrink-0">
        <span className="text-sm font-medium text-white">Scan Barcode</span>
        <div className="flex items-center gap-2">
          {devices.length > 1 && (
            <button onClick={switchCamera} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
              <RotateCcw size={16} />
            </button>
          )}
          <button onClick={handleClose} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Video */}
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />

        {/* Scanning frame overlay */}
        {status === 'scanning' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-44 sm:w-80 sm:h-56">
              {(['tl', 'tr', 'bl', 'br'] as const).map(c => (
                <div key={c} className={`absolute w-8 h-8 border-white border-2 ${
                  c === 'tl' ? 'top-0 left-0 border-r-0 border-b-0 rounded-tl-xl' :
                  c === 'tr' ? 'top-0 right-0 border-l-0 border-b-0 rounded-tr-xl' :
                  c === 'bl' ? 'bottom-0 left-0 border-r-0 border-t-0 rounded-bl-xl' :
                              'bottom-0 right-0 border-l-0 border-t-0 rounded-br-xl'
                }`} />
              ))}
              {/* Scan line */}
              <div
                className="absolute left-2 right-2 h-0.5 bg-green-400 shadow-[0_0_10px_#4ade80]"
                style={{ animation: 'scanLine 2s ease-in-out infinite' }}
              />
            </div>
            <p className="absolute bottom-16 text-white/50 text-sm text-center px-8">
              Point camera at a barcode or QR code
            </p>
          </div>
        )}

        {/* Looking up */}
        {status === 'looking-up' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
            <Loader2 size={36} className="animate-spin text-white" />
            <p className="text-white text-sm">Looking up product…</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <Camera size={40} className="text-[#555]" />
            <p className="text-white/70 text-sm">{errorMsg}</p>
            <button onClick={() => startScanning(deviceIdx)}
              className="px-5 py-2.5 bg-white/10 rounded-xl text-sm text-white hover:bg-white/20 transition-colors">
              Try Again
            </button>
          </div>
        )}
      </div>

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
