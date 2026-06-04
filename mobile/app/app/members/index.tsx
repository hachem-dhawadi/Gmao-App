import { useState, useMemo, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import { apiGetMembers, type Member } from '@/services/MembersService'
import { Linking } from 'react-native'

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
    manager:    { bg: '#2a85ff1a', text: '#2a85ff' },
    technician: { bg: '#05eb7624', text: '#10b981' },
    admin:      { bg: '#ffd40045', text: '#f59e0b' },
    hr:         { bg: '#8b5cf622', text: '#8b5cf6' },
}

function MemberCard({ item }: { item: Member }) {
    const name     = item.user?.name ?? '—'
    const email    = item.user?.email ?? '—'
    const phone    = item.user?.phone ?? null
    const roleCode = item.roles[0]?.code ?? ''
    const roleLabel= item.roles[0]?.label ?? 'Member'
    const isActive = item.status === 'active'
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const rc       = ROLE_COLORS[roleCode] ?? { bg: Colors.gray100, text: Colors.gray600 }

    return (
        <View style={styles.card}>
            <View style={[styles.avatar, !isActive && styles.avatarInactive]}>
                <Text style={styles.avatarText}>{initials}</Text>
            </View>

            <View style={styles.body}>
                <View style={styles.topRow}>
                    <Text style={[styles.name, !isActive && styles.nameInactive]} numberOfLines={1}>{name}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: rc.bg }]}>
                        <Text style={[styles.roleText, { color: rc.text }]}>{roleLabel}</Text>
                    </View>
                </View>
                <Text style={styles.email} numberOfLines={1}>{email}</Text>
                {phone && <Text style={styles.phone}>{phone}</Text>}
                {item.job_title && <Text style={styles.jobTitle}>{item.job_title}</Text>}
                <View style={styles.statusRow}>
                    <View style={[styles.statusPill, isActive ? styles.statusActive : styles.statusInactive]}>
                        <View style={[styles.statusDot, { backgroundColor: isActive ? '#10b981' : '#a3a3a3' }]} />
                        <Text style={[styles.statusText, { color: isActive ? '#10b981' : '#737373' }]}>
                            {isActive ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.actions}>
                {phone && (
                    <TouchableOpacity style={styles.actionIcon} onPress={() => Linking.openURL(`tel:${phone}`)}>
                        <Ionicons name="call-outline" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionIcon} onPress={() => Linking.openURL(`mailto:${email}`)}>
                    <Ionicons name="mail-outline" size={18} color={Colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    )
}

export default function MembersScreen() {
    const [members,    setMembers]    = useState<Member[]>([])
    const [loading,    setLoading]    = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search,     setSearch]     = useState('')
    const [roleFilter, setRoleFilter] = useState<'all' | 'technician' | 'manager'>('all')

    const load = useCallback(async () => {
        try {
            const res = await apiGetMembers({ per_page: 100 })
            setMembers(res.data.data?.members ?? [])
        } catch {
            // silent
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const onRefresh = () => { setRefreshing(true); load() }

    const filtered = useMemo(() => {
        let list = members
        if (roleFilter !== 'all') list = list.filter(m => m.roles.some(r => r.code === roleFilter))
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(m =>
                (m.user?.name  ?? '').toLowerCase().includes(q) ||
                (m.user?.email ?? '').toLowerCase().includes(q)
            )
        }
        return list
    }, [members, search, roleFilter])

    const activeCount     = members.filter(m => m.status === 'active').length
    const techCount       = members.filter(m => m.roles.some(r => r.code === 'technician')).length
    const managerCount    = members.filter(m => m.roles.some(r => r.code === 'manager' || r.code === 'admin')).length

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={Colors.gray700} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Team Members</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* Summary chips */}
            <View style={styles.summaryRow}>
                <View style={styles.summaryChip}>
                    <Text style={styles.summaryNum}>{activeCount}</Text>
                    <Text style={styles.summaryLabel}>Active</Text>
                </View>
                <View style={[styles.summaryChip, styles.summaryDivider]}>
                    <Text style={styles.summaryNum}>{techCount}</Text>
                    <Text style={styles.summaryLabel}>Technicians</Text>
                </View>
                <View style={styles.summaryChip}>
                    <Text style={styles.summaryNum}>{managerCount}</Text>
                    <Text style={styles.summaryLabel}>Managers</Text>
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={17} color={Colors.gray400} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search members…"
                    placeholderTextColor={Colors.gray400}
                    value={search}
                    onChangeText={setSearch}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                />
            </View>

            {/* Role filter */}
            <View style={styles.filterRow}>
                {(['all', 'technician', 'manager'] as const).map(r => (
                    <TouchableOpacity
                        key={r}
                        style={[styles.filterBtn, roleFilter === r && styles.filterBtnActive]}
                        onPress={() => setRoleFilter(r)}
                    >
                        <Text style={[styles.filterText, roleFilter === r && styles.filterTextActive]}>
                            {r === 'all' ? 'All' : r === 'technician' ? 'Technicians' : 'Managers'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => String(item.id)}
                    renderItem={({ item }) => <MemberCard item={item} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Ionicons name="people-outline" size={40} color={Colors.gray300} />
                            <Text style={styles.emptyTitle}>No members found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.gray100 },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.gray200,
    },
    backBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.gray900 },

    summaryRow: {
        flexDirection: 'row', backgroundColor: Colors.white,
        borderBottomWidth: 1, borderBottomColor: Colors.gray200,
    },
    summaryChip:    { flex: 1, alignItems: 'center', paddingVertical: 14 },
    summaryDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.gray200 },
    summaryNum:     { fontSize: 22, fontWeight: '800', color: Colors.gray900 },
    summaryLabel:   { fontSize: 11, color: Colors.gray500, fontWeight: '600', marginTop: 2 },

    searchWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 12, marginBottom: 8,
        borderRadius: 12, borderWidth: 1, borderColor: Colors.gray200, paddingHorizontal: 12,
    },
    searchIcon:  { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, color: Colors.gray900, paddingVertical: 11 },

    filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 10 },
    filterBtn: {
        paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
        backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200,
    },
    filterBtnActive:  { backgroundColor: Colors.primary, borderColor: Colors.primary },
    filterText:       { fontSize: 13, fontWeight: '600', color: Colors.gray600 },
    filterTextActive: { color: Colors.white },

    listContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },

    card: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14,
        backgroundColor: Colors.white, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.gray200,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },

    avatar:         { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    avatarInactive: { backgroundColor: Colors.gray300 },
    avatarText:     { fontSize: 16, fontWeight: '700', color: Colors.white },

    body:    { flex: 1 },
    topRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
    name:    { fontSize: 15, fontWeight: '700', color: Colors.gray900, flex: 1, marginRight: 8 },
    nameInactive: { color: Colors.gray400 },
    roleBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    roleText:     { fontSize: 11, fontWeight: '700' },

    email:    { fontSize: 12, color: Colors.gray500, marginBottom: 2 },
    phone:    { fontSize: 12, color: Colors.gray500, marginBottom: 2 },
    jobTitle: { fontSize: 12, color: Colors.gray400, marginBottom: 4 },

    statusRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    statusPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
    statusActive:   { backgroundColor: '#05eb7624' },
    statusInactive: { backgroundColor: '#f5f5f5' },
    statusDot:      { width: 5, height: 5, borderRadius: 3 },
    statusText:     { fontSize: 11, fontWeight: '600' },

    actions:    { gap: 8, alignItems: 'center' },
    actionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },

    emptyWrap:  { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.gray700 },
})
