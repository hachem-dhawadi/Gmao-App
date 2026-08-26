import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useNotifStore } from '@/store/notifStore'

const ACTIVE_COLOR   = '#111'
const INACTIVE_COLOR = '#c0c0c0'

const TABS = [
    { routeName: 'index',   icon: 'grid-outline',        activeIcon: 'grid',        label: 'Home'    },
    { routeName: 'more',    icon: 'apps-outline',        activeIcon: 'apps',        label: 'Modules' },
    { routeName: 'scan',    icon: 'scan-outline',        activeIcon: 'scan',        label: 'Scan'    },
    { routeName: 'chat',    icon: 'chatbubble-outline',  activeIcon: 'chatbubble',  label: 'Chat'    },
    { routeName: 'profile', icon: 'person-outline',      activeIcon: 'person',      label: 'Me'      },
] as const

function BadgeDot({ count }: { count: number }) {
    if (count <= 0) return null
    return (
        <View style={s.badge}>
            <Text style={s.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
    )
}

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets()
    const unreadNotifCount = useNotifStore(s => s.unreadNotifCount)
    const unreadChatCount  = useNotifStore(s => s.unreadChatCount)

    return (
        <View style={[s.container, { paddingBottom: insets.bottom || 10 }]}>
            {TABS.map((tab) => {
                const route = state.routes.find(r => r.name === tab.routeName)
                if (!route) return null

                const isFocused = state.index === state.routes.indexOf(route)
                const isScan    = tab.routeName === 'scan'

                const onPress = () => {
                    if (!isFocused) navigation.navigate(route.name, route.params as never)
                }

                if (isScan) {
                    return (
                        <TouchableOpacity
                            key={tab.routeName}
                            style={s.tabItem}
                            onPress={onPress}
                            activeOpacity={0.85}
                        >
                            {/* Raised scan button */}
                            <View style={[s.scanRing, isFocused && s.scanRingActive]}>
                                <View style={[s.scanBtn, isFocused && s.scanBtnActive]}>
                                    <Ionicons
                                        name={(isFocused ? tab.activeIcon : tab.icon) as never}
                                        size={22}
                                        color="#fff"
                                    />
                                </View>
                            </View>
                            <Text style={[s.label, { color: isFocused ? ACTIVE_COLOR : INACTIVE_COLOR }]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    )
                }

                const badgeCount = tab.routeName === 'more' ? unreadNotifCount
                    : tab.routeName === 'chat' ? unreadChatCount
                    : 0

                return (
                    <TouchableOpacity
                        key={tab.routeName}
                        style={s.tabItem}
                        onPress={onPress}
                        activeOpacity={0.7}
                    >
                        {/* Active indicator dot */}
                        <View style={s.dotRow}>
                            <View style={[s.dot, isFocused && s.dotActive]} />
                        </View>

                        <View style={[s.iconWrap, isFocused && s.iconWrapActive]}>
                            <Ionicons
                                name={(isFocused ? tab.activeIcon : tab.icon) as never}
                                size={22}
                                color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
                            />
                            <BadgeDot count={badgeCount} />
                        </View>

                        <Text style={[s.label, { color: isFocused ? ACTIVE_COLOR : INACTIVE_COLOR, fontWeight: isFocused ? '700' : '500' }]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                )
            })}
        </View>
    )
}

const s = StyleSheet.create({
    container: {
        flexDirection:   'row',
        backgroundColor: '#fff',
        borderTopWidth:  1,
        borderTopColor:  '#f0f0f0',
        paddingTop:      10,
        ...Platform.select({
            ios: {
                shadowColor:   '#000',
                shadowOffset:  { width: 0, height: -4 },
                shadowOpacity: 0.06,
                shadowRadius:  16,
            },
            android: { elevation: 16 },
        }),
    },

    tabItem: {
        flex:           1,
        alignItems:     'center',
        justifyContent: 'flex-end',
        paddingBottom:  2,
        gap:            3,
    },

    /* Active dot above icon */
    dotRow: {
        height:         6,
        alignItems:     'center',
        justifyContent: 'center',
    },
    dot: {
        width:        0,
        height:       4,
        borderRadius: 2,
        backgroundColor: ACTIVE_COLOR,
    },
    dotActive: {
        width: 20,
    },

    /* Icon background on active */
    iconWrap: {
        width:          44,
        height:         36,
        alignItems:     'center',
        justifyContent: 'center',
        borderRadius:   12,
    },

    badge: {
        position:        'absolute',
        top:             -4,
        right:           -2,
        minWidth:        16,
        height:          16,
        borderRadius:    8,
        backgroundColor: '#ff6a55',
        alignItems:      'center',
        justifyContent:  'center',
        paddingHorizontal: 3,
        borderWidth:     1.5,
        borderColor:     '#fff',
    },
    badgeText: { fontSize: 9, fontWeight: '800', color: '#fff', lineHeight: 14 },
    iconWrapActive: {
        backgroundColor: '#f2f2f2',
    },

    label: {
        fontSize:   10,
        fontWeight: '500',
        letterSpacing: 0.2,
    },

    /* Scan button */
    scanRing: {
        width:           56,
        height:          56,
        borderRadius:    28,
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: '#f5f5f5',
        marginBottom:    -6,
        marginTop:       -18,
    },
    scanRingActive: {
        backgroundColor: '#e8e8e8',
    },
    scanBtn: {
        width:           46,
        height:          46,
        borderRadius:    23,
        backgroundColor: '#111',
        alignItems:      'center',
        justifyContent:  'center',
        ...Platform.select({
            ios: {
                shadowColor:   '#111',
                shadowOffset:  { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius:  8,
            },
            android: { elevation: 8 },
        }),
    },
    scanBtnActive: {
        backgroundColor: '#333',
    },
})
