import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { apiGetItemsList } from '@/services/InventoryService'
import { TbBarcode, TbSearch, TbAlertTriangle, TbX } from 'react-icons/tb'
import { FiPackage } from 'react-icons/fi'
import type { Item, ItemsListResponse } from '@/services/InventoryService'

type Props = {
    isOpen: boolean
    onClose: () => void
}

const BarcodeScanDialog = ({ isOpen, onClose }: Props) => {
    const navigate = useNavigate()
    const inputRef  = useRef<HTMLInputElement>(null)

    const [value,    setValue]    = useState('')
    const [loading,  setLoading]  = useState(false)
    const [results,  setResults]  = useState<Item[] | null>(null)
    const [notFound, setNotFound] = useState(false)

    // Auto-focus input when dialog opens, reset state
    useEffect(() => {
        if (isOpen) {
            setValue('')
            setResults(null)
            setNotFound(false)
            setTimeout(() => inputRef.current?.focus(), 80)
        }
    }, [isOpen])

    const handleSearch = async (barcode: string) => {
        const q = barcode.trim()
        if (!q) return

        setLoading(true)
        setResults(null)
        setNotFound(false)

        try {
            const resp = await apiGetItemsList<ItemsListResponse>({
                search: q,
                per_page: 10,
                page: 1,
            })
            const items = resp.data?.items ?? []

            if (items.length === 0) {
                setNotFound(true)
                return
            }

            // Prefer exact barcode match → navigate directly
            const exact = items.find(
                (i) => i.barcode?.toLowerCase() === q.toLowerCase(),
            )
            if (exact) {
                onClose()
                navigate(`/concepts/inventory/items/item-details/${exact.id}`)
                return
            }

            // Single result → navigate directly
            if (items.length === 1) {
                onClose()
                navigate(`/concepts/inventory/items/item-details/${items[0].id}`)
                return
            }

            // Multiple — let user pick
            setResults(items)
        } catch {
            toast.push(
                <Notification type="danger">Search failed.</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch(value)
    }

    const handlePick = (item: Item) => {
        onClose()
        navigate(`/concepts/inventory/items/item-details/${item.id}`)
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            onRequestClose={onClose}
            width={480}
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary text-2xl shrink-0">
                    <TbBarcode />
                </div>
                <div>
                    <h5 className="font-bold">Barcode Scan</h5>
                    <p className="text-xs text-gray-400">
                        Scan with a barcode reader or type manually
                    </p>
                </div>
            </div>

            {/* Input row */}
            <div className="flex gap-2 mb-5">
                <div className="relative flex-1">
                    <TbBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value)
                            setResults(null)
                            setNotFound(false)
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Scan or type barcode…"
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
                <Button
                    variant="solid"
                    icon={<TbSearch />}
                    loading={loading}
                    disabled={!value.trim()}
                    onClick={() => handleSearch(value)}
                >
                    Search
                </Button>
            </div>

            {/* Hint */}
            {!results && !notFound && !loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-gray-400">
                    <TbBarcode className="text-5xl opacity-30" />
                    <p className="text-sm text-center">
                        Point your barcode scanner at the item label<br />
                        or type the barcode and press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-mono">Enter</kbd>
                    </p>
                </div>
            )}

            {/* Not found */}
            {notFound && (
                <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
                    <TbAlertTriangle className="text-4xl text-amber-400" />
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                        No item found for barcode:
                    </p>
                    <code className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg font-mono text-gray-600 dark:text-gray-300">
                        {value}
                    </code>
                </div>
            )}

            {/* Multiple results */}
            {results && results.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        {results.length} items found — select one
                    </p>
                    <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                        {results.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handlePick(item)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left transition-colors w-full"
                            >
                                <Avatar
                                    shape="round"
                                    size={36}
                                    {...(item.images?.[0]
                                        ? { src: item.images[0] }
                                        : { icon: <FiPackage /> })}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm heading-text truncate">
                                        {item.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Tag className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0 text-xs font-mono">
                                            {item.code}
                                        </Tag>
                                        {item.barcode && (
                                            <span className="text-xs text-gray-400 font-mono">
                                                {item.barcode}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                                    {item.total_stock > 0 ? `${item.total_stock} in stock` : 'out of stock'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </Dialog>
    )
}

export default BarcodeScanDialog
