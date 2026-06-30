import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAuthStore } from '@/store/authStore'

type Module = {
    key:        string
    icon:       string
    label:      string
    sublabel:   string
    color:      string
    permission: string | null
    route:      string
    built:      boolean
}

const MODULES: Module[] = [
    {
        key: 'work-orders', icon: 'clipboard-outline', label: 'Work Orders',
        sublabel: 'Tasks & repairs', color: '#111',
        permission: 'work_orders.read', route: '/app/work-orders', built: true,
    },
    {
        key: 'pm-plans', icon: 'calendar-outline', label: 'PM Plans',
        sublabel: 'Preventive maintenance', color: '#a855f7',
        permission: 'pm_plans.read', route: '/app/pm-plans', built: true,
    },
    {
        key: 'assets', icon: 'hardware-chip-outline', label: 'Assets',
        sublabel: 'Equipment & machines', color: '#2a85ff',
        permission: 'assets.read', route: '/app/assets', built: true,
    },
    {
        key: 'inventory', icon: 'cube-outline', label: 'Inventory',
        sublabel: 'Parts & stock', color: '#10b981',
        permission: 'inventory.read', route: '/app/inventory', built: true,
    },
    {
        key: 'files', icon: 'folder-open-outline', label: 'File Manager',
        sublabel: 'Documents & files', color: '#06b6d4',
        permission: 'files.read', route: '/app/files', built: true,
    },
    {
        key: 'purchasing', icon: 'cart-outline', label: 'Purchasing',
        sublabel: 'Orders & suppliers', color: '#ef4444',
        permission: 'purchasing.read', route: '/app/purchasing', built: true,
    },
    {
        key: 'chat', icon: 'chatbubble-ellipses-outline', label: 'Chat',
        sublabel: 'Team messaging', color: '#8b5cf6',
        permission: 'chat.read', route: '/app/chat', built: true,
    },
    {
        key: 'notifications', icon: 'notifications-outline', label: 'Notifications',
        sublabel: 'Alerts & updates', color: '#f59e0b',
        permission: 'notifications.read', route: '/app/notifications', built: true,
    },
    {
        key: 'calendar', icon: 'calendar-number-outline', label: 'Calendar',
        sublabel: 'Schedule & events', color: '#0ea5e9',
        permission: null, route: '/app/calendar', built: true,
    },
    {
        key: 'maintenance-requests', icon: 'construct-outline', label: 'Requests',
        sublabel: 'Maintenance requests', color: '#f97316',
        permission: null, route: '/app/maintenance-requests', built: true,
    },
]

export default function ModulesScreen() {
    const user        = useAuthStore(s => s.user)
    const permissions = user?.permissions ?? []

    const available = MODULES.filter(m =>
        m.permission === null || permissions.includes(m.permission)
    )

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <Text style={s.headerTitle}>Modules</Text>
                <Text style={s.headerSub}>All features available to your role</Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scroll}
            >
                {available.length === 0 ? (
                    <View style={s.emptyWrap}>
                        <View style={s.emptyIcon}>
                            <Ionicons name="lock-closed-outline" size={32} color="#ccc" />
                        </View>
                        <Text style={s.emptyTitle}>No modules available</Text>
                        <Text style={s.emptySub}>
                            Your administrator has not granted access to any additional modules.
                        </Text>
                    </View>
                ) : (
                    <View style={s.grid}>
                        {available.map(m => (
                            <TouchableOpacity
                                key={m.key}
                                style={[s.card, !m.built && s.cardDisabled]}
                                activeOpacity={m.built ? 0.75 : 0.5}
                                onPress={() => {
                                    if (m.built) router.push(m.route as never)
                                }}
                            >
                                <View style={[s.iconBox, { backgroundColor: m.color + '18' }]}>
                                    <Ionicons name={m.icon as never} size={26} color={m.color} />
                                </View>
                                <Text style={s.cardLabel}>{m.label}</Text>
                                <Text style={s.cardSub}>{m.sublabel}</Text>
                                {!m.built && (
                                    <View style={s.comingSoonBadge}>
                                        <Text style={s.comingSoonText}>Soon</Text>
                                    </View>
                                )}
                                {m.built && (
                                    <View style={s.arrowWrap}>
                                        <Ionicons name="arrow-forward" size={14} color={m.color} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f5f5f5' },

    header: {
        backgroundColor:   '#fff',
        paddingHorizontal: 20,
        paddingTop:        16,
        paddingBottom:     16,
        borderBottomWidth: 1,
        borderBottomColor: '#ebebeb',
    },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#111' },
    headerSub:   { fontSize: 13, color: '#aaa', marginTop: 2 },

    scroll: { padding: 16, gap: 12 },

    grid: {
        flexDirection: 'row',
        flexWrap:      'wrap',
        gap:           12,
    },

    card: {
        width:           '47%',
        backgroundColor: '#fff',
        borderRadius:    18,
        padding:         16,
        borderWidth:     1,
        borderColor:     '#ebebeb',
        shadowColor:     '#000',
        shadowOffset:    { width: 0, height: 2 },
        shadowOpacity:   0.05,
        shadowRadius:    8,
        elevation:       3,
        position:        'relative',
        minHeight:       130,
    },
    cardDisabled: { opacity: 0.6 },

    iconBox: {
        width:         52,
        height:        52,
        borderRadius:  14,
        alignItems:    'center',
        justifyContent:'center',
        marginBottom:  12,
    },
    cardLabel: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 3 },
    cardSub:   { fontSize: 11, color: '#aaa', lineHeight: 15 },

    arrowWrap: {
        position: 'absolute',
        bottom:   12,
        right:    12,
    },

    comingSoonBadge: {
        position:          'absolute',
        top:               10,
        right:             10,
        backgroundColor:   '#f5f5f5',
        borderRadius:      20,
        paddingHorizontal: 7,
        paddingVertical:   3,
    },
    comingSoonText: { fontSize: 10, fontWeight: '700', color: '#aaa' },

    emptyWrap:  { alignItems: 'center', paddingTop: 80, gap: 14, paddingHorizontal: 32 },
    emptyIcon:  { width: 72, height: 72, borderRadius: 20, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: '#555', textAlign: 'center' },
    emptySub:   { fontSize: 13, color: '#bbb', textAlign: 'center', lineHeight: 20 },
})
