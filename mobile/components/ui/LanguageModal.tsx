import { useState } from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'

type Props = {
    visible: boolean
    onClose: () => void
}

const LANGUAGES = [
    { code: 'en', label: 'English',  native: 'English',  flag: '🇺🇸' },
    { code: 'fr', label: 'French',   native: 'Français', flag: '🇫🇷' },
    { code: 'ar', label: 'Arabic',   native: 'العربية',  flag: '🇹🇳' },
]

export default function LanguageModal({ visible, onClose }: Props) {
    const [selected, setSelected] = useState('en')

    const handleSelect = (code: string) => {
        setSelected(code)
    }

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={s.overlay}>
                <View style={s.card}>
                    {/* Header */}
                    <View style={s.header}>
                        <View style={s.iconWrap}>
                            <Ionicons name="language" size={24} color={Colors.primary} />
                        </View>
                        <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
                            <Ionicons name="close" size={18} color="#555" />
                        </TouchableOpacity>
                    </View>

                    <Text style={s.title}>Language</Text>
                    <Text style={s.subtitle}>Select your preferred language</Text>

                    <View style={s.list}>
                        {LANGUAGES.map((lang, i) => {
                            const active = selected === lang.code
                            return (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={[s.langRow, i > 0 && s.langBorder, active && s.langRowActive]}
                                    onPress={() => handleSelect(lang.code)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={s.flag}>{lang.flag}</Text>
                                    <View style={s.langText}>
                                        <Text style={[s.langLabel, active && s.langLabelActive]}>
                                            {lang.label}
                                        </Text>
                                        <Text style={s.langNative}>{lang.native}</Text>
                                    </View>
                                    {active && (
                                        <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )
                        })}
                    </View>

                    <View style={s.notice}>
                        <Ionicons name="information-circle-outline" size={15} color="#aaa" />
                        <Text style={s.noticeText}>Full translation coming soon. Currently English only.</Text>
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
        backgroundColor: Colors.primary + '18',
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
    langRow: {
        flexDirection:     'row',
        alignItems:        'center',
        paddingHorizontal: 16,
        paddingVertical:   14,
        gap:               12,
        backgroundColor:   '#fff',
    },
    langBorder:      { borderTopWidth: 1, borderTopColor: '#f5f5f5' },
    langRowActive:   { backgroundColor: Colors.primary + '08' },
    flag:            { fontSize: 24 },
    langText:        { flex: 1 },
    langLabel:       { fontSize: 14, fontWeight: '600', color: '#333' },
    langLabelActive: { color: Colors.primary },
    langNative:      { fontSize: 12, color: '#aaa', marginTop: 1 },

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
