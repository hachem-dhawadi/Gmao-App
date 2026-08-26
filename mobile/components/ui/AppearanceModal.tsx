import { useState } from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'

type Props = {
    visible: boolean
    onClose: () => void
}

const THEMES = [
    {
        key:   'system',
        label: 'System Default',
        sub:   'Follows your device theme setting',
        icon:  'phone-portrait-outline',
    },
    {
        key:   'light',
        label: 'Light',
        sub:   'Always use light theme',
        icon:  'sunny-outline',
    },
    {
        key:   'dark',
        label: 'Dark',
        sub:   'Always use dark theme',
        icon:  'moon-outline',
    },
]

export default function AppearanceModal({ visible, onClose }: Props) {
    const [selected, setSelected] = useState('system')

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={s.overlay}>
                <View style={s.card}>
                    {/* Header */}
                    <View style={s.header}>
                        <View style={s.iconWrap}>
                            <Ionicons name="color-palette" size={24} color="#7c3aed" />
                        </View>
                        <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
                            <Ionicons name="close" size={18} color="#555" />
                        </TouchableOpacity>
                    </View>

                    <Text style={s.title}>Appearance</Text>
                    <Text style={s.subtitle}>Choose how the app looks</Text>

                    <View style={s.list}>
                        {THEMES.map((theme, i) => {
                            const active = selected === theme.key
                            return (
                                <TouchableOpacity
                                    key={theme.key}
                                    style={[s.row, i > 0 && s.rowBorder, active && s.rowActive]}
                                    onPress={() => setSelected(theme.key)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[s.themeIcon, active && s.themeIconActive]}>
                                        <Ionicons
                                            name={theme.icon as never}
                                            size={18}
                                            color={active ? '#7c3aed' : '#aaa'}
                                        />
                                    </View>
                                    <View style={s.rowText}>
                                        <Text style={[s.rowLabel, active && s.rowLabelActive]}>
                                            {theme.label}
                                        </Text>
                                        <Text style={s.rowSub}>{theme.sub}</Text>
                                    </View>
                                    {active && (
                                        <Ionicons name="checkmark-circle" size={22} color="#7c3aed" />
                                    )}
                                </TouchableOpacity>
                            )
                        })}
                    </View>

                    <View style={s.notice}>
                        <Ionicons name="information-circle-outline" size={15} color="#aaa" />
                        <Text style={s.noticeText}>Dark mode coming soon. Currently light only.</Text>
                    </View>

                    <TouchableOpacity style={s.applyBtn} onPress={onClose} activeOpacity={0.85}>
                        <Text style={s.applyBtnText}>Apply</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    )
}

const s = StyleSheet.create({
    overlay: {
        flex:              1,
        backgroundColor:   'rgba(0,0,0,0.45)',
        alignItems:        'center',
        justifyContent:    'center',
        paddingHorizontal: 24,
    },
    card: {
        width:           '100%',
        backgroundColor: '#fff',
        borderRadius:    24,
        padding:         24,
    },
    header: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   14,
    },
    iconWrap: {
        width:           46,
        height:          46,
        borderRadius:    13,
        backgroundColor: '#7c3aed18',
        alignItems:      'center',
        justifyContent:  'center',
    },
    closeBtn: {
        width:           32,
        height:          32,
        borderRadius:    16,
        backgroundColor: '#f2f2f2',
        alignItems:      'center',
        justifyContent:  'center',
    },
    title:    { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#999', marginBottom: 18 },

    list: {
        borderWidth:  1,
        borderColor:  '#ebebeb',
        borderRadius: 14,
        overflow:     'hidden',
        marginBottom: 14,
    },
    row: {
        flexDirection:     'row',
        alignItems:        'center',
        paddingHorizontal: 16,
        paddingVertical:   14,
        gap:               12,
        backgroundColor:   '#fff',
    },
    rowBorder:      { borderTopWidth: 1, borderTopColor: '#f5f5f5' },
    rowActive:      { backgroundColor: '#7c3aed08' },
    themeIcon: {
        width:           36,
        height:          36,
        borderRadius:    10,
        backgroundColor: '#f2f2f2',
        alignItems:      'center',
        justifyContent:  'center',
    },
    themeIconActive: { backgroundColor: '#7c3aed18' },
    rowText:         { flex: 1 },
    rowLabel:        { fontSize: 14, fontWeight: '600', color: '#333' },
    rowLabelActive:  { color: '#7c3aed' },
    rowSub:          { fontSize: 12, color: '#aaa', marginTop: 1 },

    notice: {
        flexDirection: 'row',
        alignItems:    'center',
        gap:           6,
        marginBottom:  18,
    },
    noticeText: { fontSize: 12, color: '#aaa', flex: 1, lineHeight: 17 },

    applyBtn: {
        height:          50,
        backgroundColor: '#111',
        borderRadius:    14,
        alignItems:      'center',
        justifyContent:  'center',
    },
    applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
