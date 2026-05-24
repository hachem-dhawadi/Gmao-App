import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

type Props = {
    onScan: (value: string) => void
    active: boolean
}

const SCANNER_ID = 'camera-qr-scanner'

const CameraScanner = ({ onScan, active }: Props) => {
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const runningRef = useRef(false)

    useEffect(() => {
        if (!active) {
            if (runningRef.current && scannerRef.current) {
                scannerRef.current.stop().catch(() => {})
                runningRef.current = false
            }
            return
        }

        const scanner = new Html5Qrcode(SCANNER_ID)
        scannerRef.current = scanner

        scanner
            .start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 240, height: 240 } },
                (decodedText) => {
                    onScan(decodedText)
                },
                () => {},
            )
            .then(() => {
                runningRef.current = true
            })
            .catch(() => {})

        return () => {
            if (runningRef.current) {
                scanner.stop().catch(() => {})
                runningRef.current = false
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active])

    return (
        <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '4/3' }}>
            <div id={SCANNER_ID} className="w-full h-full" />
            {/* Corner guides */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-48 h-48">
                    <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
                    <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
                    <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
                    <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />
                    {/* Scan line animation */}
                    <span className="absolute left-0 right-0 h-0.5 bg-primary/80 animate-scan-line" />
                </div>
            </div>
        </div>
    )
}

export default CameraScanner
