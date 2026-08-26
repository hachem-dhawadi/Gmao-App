import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

type Props = {
    visible: boolean
    onClose: () => void
}

const FAQ = [
    {
        q: 'How do I create a Work Order?',
        a: 'Go to Work Orders → tap the + button in the top-right corner, fill in the details, and submit.',
    },
    {
        q: 'How do I update a WO status?',
        a: 'Open the Work Order, tap the status badge at the top, and select the new status.',
    },
    {
        q: 'How do I add parts to a Work Order?',
        a: 'Open the WO detail page, scroll to the Parts section, and tap "Add Part".',
    },
    {
        q: 'What does PM Plan mean?',
        a: 'PM (Preventive Maintenance) Plans are scheduled recurring maintenance tasks assigned to assets.',
    },
]

export default function HelpCenterModal({ visible, onClose }: Props) {
    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={s.overlay}>
                <View style={s.card}>
                    {/* Header */}
                    <View style={s.header}>
                        <View style={s.iconWrap}>
                            <Ionicons name="help-circle" size={28} color="#2a85ff" />
                        </View>
                        <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
                            <Ionicons name="close" size={18} color="#555" />
                        </TouchableOpacity>
                    </View>
                    <Text style={s.title}>Help Center</Text>
                    <Text style={s.subtitle}>Frequently asked questions</Text>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        style={s.faqList}
                        contentContainerStyle={{ paddingBottom: 4 }}
                    >
                        {FAQ.map((item, i) => (
                            <View key={i} style={[s.faqItem, i > 0 && s.faqBorder]}>
                                <Text style={s.faqQ}>{item.q}</Text>
                                <Text style={s.faqA}>{item.a}</Text>
                            </View>
                        ))}
                    </ScrollView>

                    {/* Contact */}
                    <View style={s.contactRow}>
                        <Text style={s.contactLabel}>Still need help?</Text>
                        <TouchableOpacity
                            onPress={() => Linking.openURL('mailto:support@tac-tic.com')}
                            activeOpacity={0.7}
                        >
                            <Text style={s.contactLink}>support@tac-tic.com</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={s.closeFullBtn} onPress={onClose} activeOpacity={0.85}>
                        <Text style={s.closeFullBtnText}>Close</Text>
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
        width:             '100%',
        backgroundColor:   '#fff',
        borderRadius:      24,
        padding:           24,
        maxHeight:         '82%',
    },
    header: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   12,
    },
    iconWrap: {
        width:           48,
        height:          48,
        borderRadius:    14,
        backgroundColor: '#2a85ff18',
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
    subtitle: { fontSize: 13, color: '#999', marginBottom: 16 },

    faqList: { maxHeight: 260 },
    faqItem: { paddingVertical: 12 },
    faqBorder: { borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    faqQ: { fontSize: 13, fontWeight: '700', color: '#222', marginBottom: 4 },
    faqA: { fontSize: 13, color: '#777', lineHeight: 19 },

    contactRow: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            6,
        marginTop:      16,
        marginBottom:   16,
    },
    contactLabel: { fontSize: 13, color: '#999' },
    contactLink:  { fontSize: 13, fontWeight: '700', color: '#2a85ff' },

    closeFullBtn: {
        height:          48,
        backgroundColor: '#111',
        borderRadius:    14,
        alignItems:      'center',
        justifyContent:  'center',
    },
    closeFullBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
