import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import CameraScanner from '@/components/shared/CameraScanner'
import { apiGetAssetsList } from '@/services/AssetsService'
import { TbQrcode, TbSearch, TbAlertTriangle, TbX, TbEngine, TbCamera, TbKeyboard } from 'react-icons/tb'
import type { Asset, AssetsListResponse } from '@/services/AssetsService'

type Props = {
    isOpen: boolean
    onClose: () => void
}

const statusClass: Record<Asset['status'], string> = {
    active: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    inactive: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    under_maintenance: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
    decommissioned: 'bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400',
}
const statusLabel: Record<Asset['status'], string> = {
    active: 'Active',
    inactive: 'Inactive',
    under_maintenance: 'Maintenance',
    decommissioned: 'Decommissioned',
}

const QrScanDialog = ({ isOpen, onClose }: Props) => {
    const navigate  = useNavigate()
    const { t } = useTranslation()
    const inputRef  = useRef<HTMLInputElement>(null)

    const [mode,     setMode]     = useState<'keyboard' | 'camera'>('keyboard')
    const [value,    setValue]    = useState('')
    const [loading,  setLoading]  = useState(false)
    const [results,  setResults]  = useState<Asset[] | null>(null)
    const [notFound, setNotFound] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setValue('')
            setResults(null)
            setNotFound(false)
            setMode('keyboard')
            setTimeout(() => inputRef.current?.focus(), 80)
        }
    }, [isOpen])

    const handleSearch = async (raw: string) => {
        const q = raw.trim()
        if (!q) return

        setLoading(true)
        setResults(null)
        setNotFound(false)

        try {
            const resp = await apiGetAssetsList<AssetsListResponse>({ search: q, per_page: 10, page: 1 })
            const assets = resp.data?.assets ?? []

            if (assets.length === 0) {
                setNotFound(true)
                return
            }

            const exact = assets.find(a => a.code.toLowerCase() === q.toLowerCase())
            if (exact) {
                onClose()
                navigate(`/concepts/assets/asset-details/${exact.id}`)
                return
            }

            if (assets.length === 1) {
                onClose()
                navigate(`/concepts/assets/asset-details/${assets[0].id}`)
                return
            }

            setResults(assets)
        } catch {
            toast.push(<Notification type="danger">{t('assets.toast.scanFailed')}</Notification>, { placement: 'top-center' })
        } finally {
            setLoading(false)
        }
    }

    const handleCameraScan = (decoded: string) => {
        setValue(decoded)
        setMode('keyboard')
        handleSearch(decoded)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch(value)
    }

    const handlePick = (asset: Asset) => {
        onClose()
        navigate(`/concepts/assets/asset-details/${asset.id}`)
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} onRequestClose={onClose} width={560}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary text-2xl shrink-0">
                        <TbQrcode />
                    </div>
                    <div>
                        <h5 className="font-bold">Scan Asset QR Code</h5>
                        <p className="text-xs text-gray-400">
                            {mode === 'camera' ? 'Point camera at the asset QR label' : 'Scan with USB reader or type manually'}
                        </p>
                    </div>
                </div>
                {/* Mode toggle */}
                <button
                    onClick={() => setMode(m => m === 'camera' ? 'keyboard' : 'camera')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-600 hover:border-primary hover:text-primary transition-colors mr-14"
                >
                    {mode === 'camera' ? <><TbKeyboard className="text-base" /> Manual</> : <><TbCamera className="text-base" /> Camera</>}
                </button>
            </div>

            {/* Camera mode */}
            {mode === 'camera' && (
                <div className="mb-4">
                    <CameraScanner active={isOpen && mode === 'camera'} onScan={handleCameraScan} />
                    <p className="text-xs text-center text-gray-400 mt-2">
                        Auto-detects QR code — no button needed
                    </p>
                </div>
            )}

            {/* Keyboard mode */}
            {mode === 'keyboard' && (
                <div className="flex gap-2 mb-5">
                    <div className="relative flex-1">
                        <TbQrcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={value}
                            onChange={(e) => { setValue(e.target.value); setResults(null); setNotFound(false) }}
                            onKeyDown={handleKeyDown}
                            placeholder="Scan QR or type asset code…"
                            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal"
                        />
                        {value && (
                            <button
                                onClick={() => { setValue(''); setResults(null); setNotFound(false); inputRef.current?.focus() }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <TbX />
                            </button>
                        )}
                    </div>
                    <Button variant="solid" icon={<TbSearch />} loading={loading} disabled={!value.trim()} onClick={() => handleSearch(value)}>
                        Search
                    </Button>
                </div>
            )}

            {/* Idle hint (keyboard mode only) */}
            {mode === 'keyboard' && !results && !notFound && !loading && (
                <div className="flex flex-col items-center justify-center py-6 gap-3 text-gray-400">
                    <TbQrcode className="text-5xl opacity-30" />
                    <p className="text-sm text-center">
                        Point your QR scanner at the asset label<br />
                        or type the asset code and press{' '}
                        <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-mono">Enter</kbd>
                    </p>
                </div>
            )}

            {/* Not found */}
            {notFound && (
                <div className="flex flex-col items-center gap-2 py-6 text-gray-400">
                    <TbAlertTriangle className="text-4xl text-amber-400" />
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No asset found for:</p>
                    <code className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg font-mono text-gray-600 dark:text-gray-300">
                        {value}
                    </code>
                </div>
            )}

            {/* Multiple results */}
            {results && results.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        {results.length} assets found — select one
                    </p>
                    <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                        {results.map((asset) => (
                            <button
                                key={asset.id}
                                onClick={() => handlePick(asset)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left transition-colors w-full"
                            >
                                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 text-xl shrink-0">
                                    <TbEngine />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm heading-text truncate">{asset.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Tag className="bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-0 text-xs font-mono">
                                            {asset.code}
                                        </Tag>
                                        {asset.location && (
                                            <span className="text-xs text-gray-400 truncate">{asset.location}</span>
                                        )}
                                    </div>
                                </div>
                                <Tag className={`border-0 text-xs shrink-0 ${statusClass[asset.status]}`}>
                                    {statusLabel[asset.status]}
                                </Tag>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </Dialog>
    )
}

export default QrScanDialog
