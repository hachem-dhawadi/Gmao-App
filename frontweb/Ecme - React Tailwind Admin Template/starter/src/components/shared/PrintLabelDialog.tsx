import { useRef } from 'react'
import QRCode from 'react-qr-code'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { TbPrinter, TbQrcode } from 'react-icons/tb'

type LabelType = 'asset' | 'item' | 'work-order'

type Props = {
    isOpen: boolean
    onClose: () => void
    type: LabelType
    name: string
    code: string
    url: string
}

const typeConfig: Record<LabelType, { label: string; color: string; bg: string }> = {
    asset: {
        label: 'ASSET',
        color: '#2563eb',
        bg: '#eff6ff',
    },
    item: {
        label: 'SPARE PART',
        color: '#7c3aed',
        bg: '#f5f3ff',
    },
    'work-order': {
        label: 'WORK ORDER',
        color: '#d97706',
        bg: '#fffbeb',
    },
}

const PrintLabelDialog = ({ isOpen, onClose, type, name, code, url }: Props) => {
    const labelRef = useRef<HTMLDivElement>(null)
    const cfg = typeConfig[type]

    const handlePrint = () => {
        const svgEl = labelRef.current?.querySelector('svg')
        const svgHtml = svgEl ? svgEl.outerHTML : ''

        const printWindow = window.open('', '_blank', 'width=480,height=640')
        if (!printWindow) return

        printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Label – ${code}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .label {
      background: #ffffff;
      border: 2px dashed #d1d5db;
      border-radius: 16px;
      padding: 28px 24px 20px;
      width: 320px;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .badge {
      display: inline-block;
      background: ${cfg.bg};
      color: ${cfg.color};
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 4px 12px;
      border-radius: 999px;
      margin-bottom: 20px;
      border: 1px solid ${cfg.color}33;
    }
    .qr-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 12px;
    }
    .qr-wrap svg { display: block; }
    .name {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 6px;
      line-height: 1.3;
    }
    .code {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      font-weight: 600;
      color: ${cfg.color};
      background: ${cfg.bg};
      padding: 4px 10px;
      border-radius: 6px;
      display: inline-block;
      margin-bottom: 16px;
    }
    .divider {
      border: none;
      border-top: 1px dashed #e5e7eb;
      margin: 14px 0;
    }
    .hint {
      font-size: 11px;
      color: #9ca3af;
      letter-spacing: 0.03em;
    }
    @media print {
      body { background: white; padding: 0; }
      .label { box-shadow: none; border: 1.5px dashed #d1d5db; }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="badge">${cfg.label}</div>
    <div class="qr-wrap">${svgHtml}</div>
    <div class="name">${name}</div>
    <div class="code">${code}</div>
    <hr class="divider" />
    <div class="hint">Scan with your phone to open in CMMS</div>
  </div>
  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`)
        printWindow.document.close()
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            onRequestClose={onClose}
            width={400}
        >
            <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <TbQrcode className="text-2xl text-primary" />
                    <h5 className="heading-text">Print Label</h5>
                </div>
                <p className="text-xs text-gray-400 mb-6">
                    Print and attach to the physical {type.replace('-', ' ')}
                </p>

                {/* Label preview */}
                <div
                    ref={labelRef}
                    className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-2xl p-6 bg-gray-50 dark:bg-gray-800 mx-auto"
                    style={{ maxWidth: 280 }}
                >
                    {/* Type badge */}
                    <div className="flex justify-center mb-4">
                        <span
                            className="text-xs font-bold tracking-widest px-3 py-1 rounded-full"
                            style={{ color: cfg.color, background: cfg.bg }}
                        >
                            {cfg.label}
                        </span>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center mb-4 bg-white dark:bg-gray-700 rounded-xl p-3">
                        <QRCode
                            value={url}
                            size={160}
                            level="M"
                            bgColor="transparent"
                            fgColor="currentColor"
                            style={{ color: '#111827' }}
                        />
                    </div>

                    {/* Name */}
                    <p className="font-bold text-sm heading-text text-center mb-1 leading-snug">
                        {name}
                    </p>

                    {/* Code */}
                    <div className="flex justify-center mb-3">
                        <span
                            className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
                            style={{ color: cfg.color, background: cfg.bg }}
                        >
                            {code}
                        </span>
                    </div>

                    <hr className="border-dashed border-gray-200 dark:border-gray-600 mb-2" />

                    <p className="text-xs text-gray-400 text-center">
                        Scan to open in CMMS
                    </p>
                </div>

                {/* URL hint */}
                <p className="text-xs text-gray-400 mt-3 px-4 break-all">
                    {url}
                </p>

                {/* Actions */}
                <div className="flex justify-center gap-3 mt-6">
                    <Button variant="plain" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="solid"
                        icon={<TbPrinter />}
                        onClick={handlePrint}
                    >
                        Print Label
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

export default PrintLabelDialog
