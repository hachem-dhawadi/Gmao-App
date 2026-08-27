import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import {
    apiGetNotifications, apiMarkNotificationRead,
    apiMarkAllNotificationsRead, type AppNotification,
} from '@/services/NotificationService'
import { useNotifStore } from '@/store/notifStore'

function resolveRoute(n: AppNotification): string | null {
    const d = n.data ?? {}
    if (d.conversation_id) return `/app/chat?open=${d.conversation_id}`
    if (d.wo_id)           return `/app/work-orders/${d.wo_id}`
    if (d.pm_id)           return `/app/pm-plans/${d.pm_id}`
    if (d.request_id)      return `/app/maintenance-requests`
    if (d.item_id)         return `/app/inventory`
    if (d.po_id)           return `/app/purchasing`
    return null
}

function relativeTime(dateStr: string | null): string {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1)   return 'just now'
    if (mins < 60)  return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
}

function iconForType(type: string): { name: string; bg: string; color: string } {
    if (type === 'chat_message')                      return { name: 'chatbubbles-outline',       bg: '#2a85ff15', color: '#2a85ff' }
    if (type === 'wo_assigned')                       return { name: 'person-add-outline',        bg: '#6366f115', color: '#6366f1' }
    if (type === 'wo_status_changed')                 return { name: 'swap-horizontal-outline',   bg: '#2a85ff15', color: '#2a85ff' }
    if (type === 'wo_pending_approval')               return { name: 'time-outline',              bg: '#f59e0b20', color: '#f59e0b' }
    if (type === 'wo_approved')                       return { name: 'checkmark-circle-outline',  bg: '#10b98120', color: '#10b981' }
    if (type === 'wo_rejected')                       return { name: 'close-circle-outline',      bg: '#ff6a5520', color: '#ff6a55' }
    if (type === 'wo_due_soon')                       return { name: 'alarm-outline',             bg: '#f59e0b20', color: '#f59e0b' }
    if (type === 'wo_overdue')                        return { name: 'alert-circle-outline',      bg: '#ff6a5515', color: '#ff6a55' }
    if (type === 'comment_mention')                   return { name: 'at-outline',                bg: '#a855f715', color: '#a855f7' }
    if (type === 'pm_assigned')                       return { name: 'person-add-outline',        bg: '#8b5cf615', color: '#8b5cf6' }
    if (type === 'pm_overdue')                        return { name: 'alert-circle-outline',      bg: '#ff6a5515', color: '#ff6a55' }
    if (type === 'pm_wo_generated')                   return { name: 'flash-outline',             bg: '#8b5cf615', color: '#8b5cf6' }
    if (type === 'low_stock')                         return { name: 'cube-outline',              bg: '#f59e0b20', color: '#f59e0b' }
    if (type === 'po_ordered')                        return { name: 'cart-outline',              bg: '#10b98115', color: '#10b981' }
    if (type === 'new_request')                       return { name: 'construct-outline',         bg: '#6366f115', color: '#6366f1' }
    if (type === 'request_converted')                 return { name: 'checkmark-done-outline',    bg: '#10b98115', color: '#10b981' }
    if (type === 'request_rejected')                  return { name: 'close-circle-outline',      bg: '#ff6a5520', color: '#ff6a55' }
    if (type === 'new_member')                        return { name: 'people-outline',            bg: '#2a85ff15', color: '#2a85ff' }
    return                                            { name: 'notifications-outline',            bg: '#f5f5f5',   color: '#999'   }
}

function moduleForType(type: string): string {
    if (type === 'chat_message')        return 'Chat'
    if (type.startsWith('wo_') || type === 'comment_mention') return 'Work Orders'
    if (type.startsWith('pm_'))         return 'PM Plans'
    if (type === 'low_stock')           return 'Inventory'
    if (type === 'po_ordered')          return 'Purchasing'
    if (type.startsWith('request_') || type === 'new_request') return 'Requests'
    if (type === 'new_member')          return 'Team'
    return ''
}

const MODULE_COLORS: Record<string, { bg: string; color: string }> = {
    'Chat':        { bg: '#2a85ff15', color: '#2a85ff' },
    'Work Orders': { bg: '#6366f115', color: '#6366f1' },
    'PM Plans':    { bg: '#8b5cf615', color: '#8b5cf6' },
    'Inventory':   { bg: '#f59e0b20', color: '#f59e0b' },
    'Purchasing':  { bg: '#10b98115', color: '#10b981' },
    'Requests':    { bg: '#6366f115', color: '#6366f1' },
    'Team':        { bg: '#2a85ff15', color: '#2a85ff' },
}

function NotifItem({ item, onRead }: { item: AppNotification; onRead: (id: number) => void }) {
    const ic     = iconForType(item.type)
    const route  = resolveRoute(item)
    const module = moduleForType(item.type)
    const mc     = MODULE_COLORS[module]
    return (
        <TouchableOpacity
            style={[styles.item, !item.read && styles.itemUnread]}
            activeOpacity={0.75}
            onPress={() => {
                onRead(item.id)
                if (route) router.push(route as never)
            }}
        >
            <View style={[styles.iconWrap, { backgroundColor: ic.bg }]}>
                <Ionicons name={ic.name as never} size={20} color={ic.color} />
            </View>
            <View style={styles.textWrap}>
                <View style={styles.titleRow}>
                    <Text style={[styles.notifTitle, !item.read && styles.notifTitleBold]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    {!item.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                <View style={styles.footerRow}>
                    {module ? (
                        <View style={[styles.moduleTag, mc && { backgroundColor: mc.bg }]}>
                            <Text style={[styles.moduleTagText, mc && { color: mc.color }]}>{module}</Text>
                        </View>
                    ) : null}
                    <Text style={styles.notifTime}>{relativeTime(item.created_at)}</Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#ddd" />
        </TouchableOpacity>
    )
}

export default function NotificationsScreen() {
    const [notifs,     setNotifs]     = useState<AppNotification[]>([])
    const [loading,    setLoading]    = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [filter,     setFilter]     = useState<'all' | 'unread'>('all')
    const setUnreadNotifCount = useNotifStore(s => s.setUnreadNotifCount)

    const load = useCallback(async () => {
        try {
            const res = await apiGetNotifications()
            setNotifs(res.data.data ?? [])
        } catch {
            // silent — keep previous list
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        load()
        // Clear the badge when the notifications screen is opened
        setUnreadNotifCount(0)
    }, [])

    const onRefresh = () => { setRefreshing(true); load() }

    const markRead = async (id: number) => {
        const target = notifs.find(n => n.id === id)
        if (!target || target.read) return
        setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        try { await apiMarkNotificationRead(id) } catch {}
    }

    const markAllRead = async () => {
        setNotifs(prev => prev.map(n => ({ ...n, read: true })))
        try { await apiMarkAllNotificationsRead() } catch {}
    }

    const unreadCount = notifs.filter(n => !n.read).length
    const displayed   = filter === 'unread' ? notifs.filter(n => !n.read) : notifs

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={styles.headerRight}>
                    {unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                        </View>
                    )}
                    {unreadCount > 0 && (
                        <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead} activeOpacity={0.8}>
                            <Text style={styles.markAllText}>Mark all read</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter tabs */}
            <View style={styles.filterRow}>
                {(['all', 'unread'] as const).map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                        onPress={() => setFilter(f)}
                        activeOpacity={0.75}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#111" style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={displayed}
                    keyExtractor={item => String(item.id)}
                    renderItem={({ item }) => <NotifItem item={item} onRead={markRead} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111" />}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <View style={styles.emptyIconWrap}>
                                <Ionicons name="notifications-off-outline" size={32} color="#ccc" />
                            </View>
                            <Text style={styles.emptyTitle}>You're all caught up</Text>
                            <Text style={styles.emptySub}>No {filter === 'unread' ? 'unread ' : ''}notifications</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f5f5f5' },

    header: {
        flexDirection:     'row',
        justifyContent:    'space-between',
        alignItems:        'center',
        paddingHorizontal: 20,
        paddingVertical:   14,
        backgroundColor:   '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

    unreadBadge: {
        backgroundColor:  '#ff6a55',
        borderRadius:     10,
        paddingHorizontal: 7,
        paddingVertical:  2,
        minWidth:         22,
        alignItems:       'center',
    },
    unreadBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },

    markAllBtn:  { backgroundColor: '#f5f5f5', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#ebebeb' },
    markAllText: { fontSize: 12, fontWeight: '700', color: '#555' },

    filterRow: {
        flexDirection:     'row',
        paddingHorizontal: 16,
        paddingVertical:   10,
        gap:               8,
        backgroundColor:   '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    filterBtn: {
        paddingHorizontal: 16,
        paddingVertical:   7,
        borderRadius:      20,
        backgroundColor:   '#f5f5f5',
        borderWidth:       1,
        borderColor:       '#ebebeb',
    },
    filterBtnActive:  { backgroundColor: '#111', borderColor: '#111' },
    filterText:       { fontSize: 13, fontWeight: '600', color: '#666' },
    filterTextActive: { color: '#fff' },

    listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },

    item: {
        flexDirection:   'row',
        alignItems:      'center',
        gap:             12,
        padding:         14,
        backgroundColor: '#fff',
        borderRadius:    16,
        borderWidth:     1,
        borderColor:     '#f0f0f0',
        shadowColor:     '#000',
        shadowOffset:    { width: 0, height: 1 },
        shadowOpacity:   0.04,
        shadowRadius:    4,
        elevation:       2,
    },
    itemUnread: { borderLeftWidth: 3, borderLeftColor: '#111' },

    iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

    textWrap:       { flex: 1 },
    titleRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
    notifTitle:     { fontSize: 14, fontWeight: '500', color: '#555', flex: 1 },
    notifTitleBold: { fontWeight: '700', color: '#111' },
    unreadDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: '#111', marginLeft: 8, flexShrink: 0 },
    notifBody:      { fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 6 },
    footerRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
    moduleTag:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: '#f0f0f0' },
    moduleTagText:  { fontSize: 10, fontWeight: '700', color: '#999', letterSpacing: 0.3 },
    notifTime:      { fontSize: 11, color: '#bbb', fontWeight: '500' },

    emptyWrap:    { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyIconWrap:{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
    emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#555' },
    emptySub:     { fontSize: 13, color: '#bbb' },
})
