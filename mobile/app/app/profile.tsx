import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import { useAuthStore } from '@/store/authStore'
import { apiLogout } from '@/services/AuthService'
import { router } from 'expo-router'
import AlertModal from '@/components/ui/AlertModal'

type MenuItem = { icon: string; label: string; color?: string; onPress?: () => void }

function Section({ title, items }: { title: string; items: MenuItem[] }) {
    return (
        <View style={s.section}>
            <Text style={s.sectionTitle}>{title}</Text>
            <View style={s.sectionCard}>
                {items.map((item, i) => (
                    <TouchableOpacity
                        key={item.label}
                        style={[s.menuItem, i > 0 && s.menuBorder]}
                        activeOpacity={0.7}
                        onPress={item.onPress}
                    >
                        <View style={[s.menuIconWrap, item.color && { backgroundColor: item.color + '18' }]}>
                            <Ionicons
                                name={item.icon as never}
                                size={18}
                                color={item.color ?? '#555'}
                            />
                        </View>
                        <Text style={[s.menuLabel, item.color && { color: item.color }]}>{item.label}</Text>
                        {!item.color && (
                            <Ionicons name="chevron-forward" size={16} color="#ccc" />
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    )
}

export default function ProfileScreen() {
    const { user, clearAuth } = useAuthStore()
    const [modal,       setModal]      = useState<{ title: string; message: string; type: 'error' | 'success' | 'info'; onClose?: () => void } | null>(null)
    const [signingOut,  setSigningOut] = useState(false)

    const initials = (user?.name ?? '?')
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

    const roleLabel = (user?.roles?.[0] ?? 'user').charAt(0).toUpperCase() + (user?.roles?.[0] ?? 'user').slice(1)

    const handleLogout = () => {
        setModal({
            title:   'Sign Out',
            message: 'Are you sure you want to sign out?',
            type:    'info',
            onClose: async () => {
                setModal(null)
                setSigningOut(true)
                try { await apiLogout() } catch {}
                await clearAuth()
                router.replace('/auth/login')
            },
        })
    }

    return (
        <SafeAreaView style={s.safe} edges={['top']}>

            <AlertModal
                visible={!!modal}
                title={modal?.title ?? ''}
                message={modal?.message ?? ''}
                type={modal?.type ?? 'info'}
                btnLabel={modal?.title === 'Sign Out' ? 'Sign Out' : 'OK'}
                onClose={() => { modal?.onClose ? modal.onClose() : setModal(null) }}
            />

            {/* Sign-out loading overlay */}
            <Modal visible={signingOut} transparent animationType="fade" statusBarTranslucent>
                <View style={s.overlay}>
                    <View style={s.overlayCard}>
                        <View style={s.overlaySpinner}>
                            <ActivityIndicator size="large" color="#111" />
                        </View>
                        <Text style={s.overlayText}>Signing out…</Text>
                    </View>
                </View>
            </Modal>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

                {/* ── Header ── */}
                <View style={s.header}>
                    <Text style={s.headerTitle}>Profile</Text>
                </View>

                {/* ── Hero card ── */}
                <View style={s.heroCard}>
                    <View style={s.avatarOuter}>
                        <View style={s.avatarInner}>
                            <Text style={s.avatarText}>{initials}</Text>
                        </View>
                        <View style={s.onlineDot} />
                    </View>
                    <Text style={s.userName}>{user?.name ?? '—'}</Text>
                    <Text style={s.userEmail}>{user?.email ?? '—'}</Text>
                    <View style={s.roleBadge}>
                        <Ionicons name="shield-checkmark-outline" size={12} color="#111" />
                        <Text style={s.roleText}>{roleLabel}</Text>
                    </View>
                </View>

                {/* ── Account ── */}
                <Section
                    title="Account"
                    items={[
                        { icon: 'person-outline',      label: 'Edit Profile'      },
                        { icon: 'lock-closed-outline', label: 'Change Password'   },
                        { icon: 'mail-outline',        label: 'Email Preferences' },
                    ]}
                />

                {/* ── App Settings ── */}
                <Section
                    title="App Settings"
                    items={[
                        { icon: 'notifications-outline', label: 'Notifications' },
                        { icon: 'language-outline',      label: 'Language'      },
                        { icon: 'moon-outline',          label: 'Appearance'    },
                    ]}
                />

                {/* ── Support ── */}
                <Section
                    title="Support"
                    items={[
                        { icon: 'help-circle-outline', label: 'Help Center'   },
                        { icon: 'chatbubble-outline',  label: 'Send Feedback' },
                    ]}
                />

                {/* ── Sign out ── */}
                <View style={s.section}>
                    <TouchableOpacity style={s.signOutBtn} onPress={handleLogout} activeOpacity={0.85}>
                        <Ionicons name="log-out-outline" size={18} color={Colors.error} />
                        <Text style={s.signOutText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>

                <Text style={s.version}>CMMS Mobile v1.0.0 · Made by Tac-Tic</Text>

            </ScrollView>
        </SafeAreaView>
    )
}

const s = StyleSheet.create({
    safe:   { flex: 1, backgroundColor: '#f5f5f5' },
    scroll: { paddingBottom: 32 },

    /* Header */
    header: {
        backgroundColor:  '#fff',
        paddingHorizontal: 20,
        paddingTop:        16,
        paddingBottom:     16,
        borderBottomWidth: 1,
        borderBottomColor: '#ebebeb',
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' },

    /* Hero card */
    heroCard: {
        backgroundColor:  '#fff',
        alignItems:       'center',
        paddingVertical:   28,
        paddingHorizontal: 20,
        marginHorizontal:  16,
        marginTop:         20,
        marginBottom:      20,
        borderRadius:      20,
        borderWidth:       1,
        borderColor:       '#ebebeb',
        shadowColor:       '#000',
        shadowOffset:      { width: 0, height: 1 },
        shadowOpacity:     0.04,
        shadowRadius:      4,
        elevation:         2,
    },

    avatarOuter: { position: 'relative', marginBottom: 14 },
    avatarInner: {
        width:           88,
        height:          88,
        borderRadius:    44,
        backgroundColor: '#111',
        alignItems:      'center',
        justifyContent:  'center',
    },
    avatarText: { fontSize: 30, fontWeight: '800', color: '#fff' },
    onlineDot: {
        position:        'absolute',
        bottom:          4,
        right:           4,
        width:           14,
        height:          14,
        borderRadius:    7,
        backgroundColor: Colors.success,
        borderWidth:     2,
        borderColor:     '#fff',
    },

    userName:  { fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 4 },
    userEmail: { fontSize: 13, color: '#888', marginBottom: 12 },
    roleBadge: {
        flexDirection:     'row',
        alignItems:        'center',
        gap:               5,
        backgroundColor:   '#f2f2f2',
        paddingHorizontal: 12,
        paddingVertical:   5,
        borderRadius:      20,
    },
    roleText: { fontSize: 12, fontWeight: '700', color: '#111' },

    /* Sections */
    section:      { paddingHorizontal: 16, marginBottom: 16 },
    sectionTitle: {
        fontSize:      12,
        fontWeight:    '700',
        color:         '#aaa',
        letterSpacing: 0.8,
        marginBottom:  8,
        textTransform: 'uppercase',
    },
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius:    14,
        borderWidth:     1,
        borderColor:     '#ebebeb',
        overflow:        'hidden',
        shadowColor:     '#000',
        shadowOffset:    { width: 0, height: 1 },
        shadowOpacity:   0.04,
        shadowRadius:    4,
        elevation:       2,
    },
    menuItem: {
        flexDirection:     'row',
        alignItems:        'center',
        gap:               12,
        paddingHorizontal: 16,
        paddingVertical:   14,
    },
    menuBorder:   { borderTopWidth: 1, borderTopColor: '#f5f5f5' },
    menuIconWrap: {
        width:           36,
        height:          36,
        borderRadius:    10,
        backgroundColor: '#f2f2f2',
        alignItems:      'center',
        justifyContent:  'center',
    },
    menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#222' },

    /* Sign out */
    signOutBtn: {
        flexDirection:   'row',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             10,
        height:          52,
        borderRadius:    14,
        borderWidth:     1.5,
        borderColor:     Colors.error,
        backgroundColor: '#fff',
    },
    signOutText: { fontSize: 15, fontWeight: '700', color: Colors.error },

    version: { textAlign: 'center', fontSize: 11, color: '#ccc', paddingBottom: 8, letterSpacing: 0.3 },

    /* Sign-out overlay — matches AlertModal style */
    overlay: {
        flex:              1,
        backgroundColor:   'rgba(0,0,0,0.45)',
        alignItems:        'center',
        justifyContent:    'center',
        paddingHorizontal: 32,
    },
    overlayCard: {
        width:             '100%',
        backgroundColor:   '#fff',
        borderRadius:      24,
        paddingHorizontal: 28,
        paddingVertical:   32,
        alignItems:        'center',
    },
    overlaySpinner: {
        width:           64,
        height:          64,
        borderRadius:    20,
        backgroundColor: '#11111118',
        alignItems:      'center',
        justifyContent:  'center',
        marginBottom:    20,
    },
    overlayText: { fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' },
})
