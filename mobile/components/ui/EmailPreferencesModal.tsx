import { useState } from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'

type Props = {
    visible: boolean
    onClose: () => void
}

type Pref = { key: string; label: string; sub: string }

const PREFS: Pref[] = [
    { key: 'wo_assigned',    label: 'Work Order Assigned',   sub: 'When a new WO is assigned to you'          },
    { key: 'wo_updated',     label: 'Work Order Updates',    sub: 'Status changes on your work orders'         },
    { key: 'pm_reminder',    label: 'PM Plan Reminders',     sub: 'Upcoming preventive maintenance tasks'      },
    { key: 'request_update', label: 'Maintenance Requests',  sub: 'Updates on requests you submitted'          },
    { key: 'weekly_digest',  label: 'Weekly Digest',         sub: 'Summary of activity every Monday morning'   },
    { key: 'chat_mentions',  label: 'Chat Mentions',         sub: 'When someone mentions you in a chat'        },
]

export default function EmailPreferencesModal({ visible, onClose }: Props) {
    const insets = useSafeAreaInsets()
    const [prefs, setPrefs] = useState<Record<string, boolean>>({
        wo_assigned:    true,
        wo_updated:     true,
        pm_reminder:    true,
        request_update: false,
        weekly_digest:  true,
        chat_mentions:  false,
    })

    const toggle = (key: string) => setPrefs((p) => ({ ...p, [key]: !p[key] }))

    return (
        <Modal visible={visible} animationType="slide" statusBarTranslucent>
            <SafeAreaView style={s.safe} edges={['top']}>

                <View style={s.header}>
                    <TouchableOpacity onPress={onClose} style={s.headerBtn} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color="#111" />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Email Preferences</Text>
                    <View style={s.headerBtn} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 32 }]}
                >
                    <Text style={s.sectionHint}>
                        Choose which emails you'd like to receive. You can change these at any time.
                    </Text>

                    <View style={s.card}>
                        {PREFS.map((pref, i) => (
                            <View key={pref.key} style={[s.row, i > 0 && s.rowBorder]}>
                                <View style={s.rowText}>
                                    <Text style={s.rowLabel}>{pref.label}</Text>
                                    <Text style={s.rowSub}>{pref.sub}</Text>
                                </View>
                                <Switch
                                    value={prefs[pref.key]}
                                    onValueChange={() => toggle(pref.key)}
                                    trackColor={{ false: '#e0e0e0', true: Colors.primary + '55' }}
                                    thumbColor={prefs[pref.key] ? Colors.primary : '#f0f0f0'}
                                />
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity style={s.saveBtn} onPress={onClose} activeOpacity={0.85}>
                        <Text style={s.saveBtnText}>Save Preferences</Text>
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

    body:        { padding: 20 },
    sectionHint: { fontSize: 13, color: '#999', marginBottom: 16, lineHeight: 19 },

    card: {
        backgroundColor: '#fff',
        borderRadius:    16,
        borderWidth:     1,
        borderColor:     '#ebebeb',
        overflow:        'hidden',
        marginBottom:    20,
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
        paddingVertical:   14,
        gap:               12,
    },
    rowBorder: { borderTopWidth: 1, borderTopColor: '#f5f5f5' },
    rowText:   { flex: 1 },
    rowLabel:  { fontSize: 14, fontWeight: '600', color: '#222', marginBottom: 2 },
    rowSub:    { fontSize: 12, color: '#aaa' },

    saveBtn: {
        height:          52,
        backgroundColor: '#111',
        borderRadius:    14,
        alignItems:      'center',
        justifyContent:  'center',
    },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
