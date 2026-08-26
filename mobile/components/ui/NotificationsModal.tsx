import { useState } from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'

type Props = {
    visible: boolean
    onClose: () => void
}

type Notif = { key: string; icon: string; label: string; sub: string }

const SECTIONS: { title: string; items: Notif[] }[] = [
    {
        title: 'Work Orders',
        items: [
            { key: 'wo_new',      icon: 'construct-outline',       label: 'New Assignment',   sub: 'When a WO is assigned to you'         },
            { key: 'wo_status',   icon: 'refresh-circle-outline',  label: 'Status Changes',   sub: 'When a WO status is updated'          },
            { key: 'wo_comment',  icon: 'chatbubble-outline',      label: 'New Comments',     sub: 'Comments added to your work orders'   },
        ],
    },
    {
        title: 'Preventive Maintenance',
        items: [
            { key: 'pm_due',      icon: 'calendar-outline',        label: 'PM Due Soon',      sub: '24 hours before a PM task is due'     },
            { key: 'pm_overdue',  icon: 'alert-circle-outline',    label: 'PM Overdue',       sub: 'When a PM task passes its due date'   },
        ],
    },
    {
        title: 'Chat & Mentions',
        items: [
            { key: 'chat_msg',    icon: 'chatbubbles-outline',     label: 'New Messages',     sub: 'When you receive a chat message'      },
            { key: 'chat_group',  icon: 'people-outline',          label: 'Group Activity',   sub: 'New messages in group conversations'  },
        ],
    },
]

export default function NotificationsModal({ visible, onClose }: Props) {
    const insets = useSafeAreaInsets()
    const [notifs, setNotifs] = useState<Record<string, boolean>>({
        wo_new:     true,
        wo_status:  true,
        wo_comment: false,
        pm_due:     true,
        pm_overdue: true,
        chat_msg:   true,
        chat_group: false,
    })

    const toggle = (key: string) => setNotifs((n) => ({ ...n, [key]: !n[key] }))

    return (
        <Modal visible={visible} animationType="slide" statusBarTranslucent>
            <SafeAreaView style={s.safe} edges={['top']}>

                <View style={s.header}>
                    <TouchableOpacity onPress={onClose} style={s.headerBtn} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color="#111" />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Notifications</Text>
                    <View style={s.headerBtn} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 32 }]}
                >
                    <Text style={s.hint}>
                        Control which push notifications you receive on this device.
                    </Text>

                    {SECTIONS.map((section) => (
                        <View key={section.title} style={s.section}>
                            <Text style={s.sectionTitle}>{section.title.toUpperCase()}</Text>
                            <View style={s.card}>
                                {section.items.map((item, i) => (
                                    <View key={item.key} style={[s.row, i > 0 && s.rowBorder]}>
                                        <View style={[s.iconWrap, notifs[item.key] && s.iconWrapActive]}>
                                            <Ionicons
                                                name={item.icon as never}
                                                size={17}
                                                color={notifs[item.key] ? Colors.primary : '#aaa'}
                                            />
                                        </View>
                                        <View style={s.rowText}>
                                            <Text style={s.rowLabel}>{item.label}</Text>
                                            <Text style={s.rowSub}>{item.sub}</Text>
                                        </View>
                                        <Switch
                                            value={notifs[item.key]}
                                            onValueChange={() => toggle(item.key)}
                                            trackColor={{ false: '#e0e0e0', true: Colors.primary + '55' }}
                                            thumbColor={notifs[item.key] ? Colors.primary : '#f0f0f0'}
                                        />
                                    </View>
                                ))}
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity style={s.saveBtn} onPress={onClose} activeOpacity={0.85}>
                        <Text style={s.saveBtnText}>Save Settings</Text>
                    </TouchableOpacity>
                </ScrollView>

            </SafeAreaView>
        </Modal>
    )
}

const s = StyleSheet.create({
    safe:   { flex: 1, backgroundColor: '#f5f5f5' },
    header: {
        flexDirection:     'row',
        alignItems:        'center',
        backgroundColor:   '#fff',
        paddingHorizontal: 12,
        paddingVertical:   14,
        borderBottomWidth: 1,
        borderBottomColor: '#ebebeb',
    },
    headerBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#111', textAlign: 'center' },

    body:         { padding: 20 },
    hint:         { fontSize: 13, color: '#999', marginBottom: 20, lineHeight: 19 },
    section:      { marginBottom: 20 },
    sectionTitle: {
        fontSize:      11,
        fontWeight:    '700',
        color:         '#aaa',
        letterSpacing: 0.8,
        marginBottom:  8,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius:    16,
        borderWidth:     1,
        borderColor:     '#ebebeb',
        overflow:        'hidden',
        shadowColor:     '#000',
        shadowOffset:    { width: 0, height: 1 },
        shadowOpacity:   0.04,
        shadowRadius:    4,
        elevation:       2,
    },
    row: {
        flexDirection:     'row',
        alignItems:        'center',
        paddingHorizontal: 16,
        paddingVertical:   13,
        gap:               12,
    },
    rowBorder:     { borderTopWidth: 1, borderTopColor: '#f5f5f5' },
    iconWrap: {
        width:           34,
        height:          34,
        borderRadius:    9,
        backgroundColor: '#f2f2f2',
        alignItems:      'center',
        justifyContent:  'center',
    },
    iconWrapActive: { backgroundColor: Colors.primary + '18' },
    rowText:  { flex: 1 },
    rowLabel: { fontSize: 14, fontWeight: '600', color: '#222', marginBottom: 2 },
    rowSub:   { fontSize: 12, color: '#aaa' },

    saveBtn: {
        height:          52,
        backgroundColor: '#111',
        borderRadius:    14,
        alignItems:      'center',
        justifyContent:  'center',
    },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
