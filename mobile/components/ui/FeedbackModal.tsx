import { useState, useEffect } from 'react'
import {
    Modal, View, Text, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, Keyboard, ScrollView,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'

type Props = {
    visible: boolean
    onClose: () => void
}

export default function FeedbackModal({ visible, onClose }: Props) {
    const insets = useSafeAreaInsets()

    const [message,  setMessage]  = useState('')
    const [sending,  setSending]  = useState(false)
    const [sent,     setSent]     = useState(false)
    const [kbHeight, setKbHeight] = useState(0)

    useEffect(() => {
        if (visible) { setMessage(''); setSent(false) }
    }, [visible])

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', (e) =>
            setKbHeight(Math.max(0, e.endCoordinates.height - insets.bottom))
        )
        const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0))
        return () => { show.remove(); hide.remove() }
    }, [insets.bottom])

    const handleSend = async () => {
        if (!message.trim()) return
        setSending(true)
        await new Promise((r) => setTimeout(r, 900))
        setSending(false)
        setSent(true)
    }

    const handleClose = () => {
        Keyboard.dismiss()
        onClose()
    }

    return (
        <Modal visible={visible} animationType="slide" statusBarTranslucent>
            <SafeAreaView style={s.safe} edges={['top']}>

                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={handleClose} style={s.headerBtn} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color="#111" />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Send Feedback</Text>
                    <View style={s.headerBtn} />
                </View>

                <View style={{ flex: 1, paddingBottom: kbHeight }}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.body}
                        keyboardShouldPersistTaps="handled"
                    >
                        {sent ? (
                            /* Success state */
                            <View style={s.successCard}>
                                <View style={s.successIcon}>
                                    <Ionicons name="checkmark-circle" size={52} color="#10b981" />
                                </View>
                                <Text style={s.successTitle}>Thank you!</Text>
                                <Text style={s.successSub}>
                                    Your feedback has been received. We'll review it shortly.
                                </Text>
                                <TouchableOpacity style={s.doneBtn} onPress={handleClose} activeOpacity={0.85}>
                                    <Text style={s.doneBtnText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={s.card}>
                                <View style={s.cardHeader}>
                                    <View style={s.iconWrap}>
                                        <Ionicons name="chatbubble-ellipses" size={24} color="#10b981" />
                                    </View>
                                    <Text style={s.cardTitle}>We'd love to hear from you</Text>
                                    <Text style={s.cardSub}>
                                        Tell us what's working well or what could be improved.
                                    </Text>
                                </View>

                                <TextInput
                                    style={s.textarea}
                                    value={message}
                                    onChangeText={setMessage}
                                    placeholder="Write your feedback here…"
                                    placeholderTextColor="#bbb"
                                    multiline
                                    numberOfLines={6}
                                    textAlignVertical="top"
                                />

                                <TouchableOpacity
                                    style={[s.sendBtn, (!message.trim() || sending) && { opacity: 0.45 }]}
                                    onPress={handleSend}
                                    disabled={!message.trim() || sending}
                                    activeOpacity={0.85}
                                >
                                    {sending ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <View style={s.sendBtnInner}>
                                            <Ionicons name="send" size={16} color="#fff" />
                                            <Text style={s.sendBtnText}>Send Feedback</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={{ height: insets.bottom + 16 }} />
                    </ScrollView>
                </View>

            </SafeAreaView>
        </Modal>
    )
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f5f5f5' },

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

    body: { padding: 20 },

    card: {
        backgroundColor: '#fff',
        borderRadius:    16,
        padding:         20,
        borderWidth:     1,
        borderColor:     '#ebebeb',
        shadowColor:     '#000',
        shadowOffset:    { width: 0, height: 1 },
        shadowOpacity:   0.04,
        shadowRadius:    4,
        elevation:       2,
    },

    cardHeader: { marginBottom: 20 },
    iconWrap: {
        width:           48,
        height:          48,
        borderRadius:    14,
        backgroundColor: '#10b98118',
        alignItems:      'center',
        justifyContent:  'center',
        marginBottom:    14,
    },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 6 },
    cardSub:   { fontSize: 13, color: '#999', lineHeight: 19 },

    textarea: {
        backgroundColor:   '#f8f8f8',
        borderWidth:       1.5,
        borderColor:       '#e8e8e8',
        borderRadius:      12,
        paddingHorizontal: 14,
        paddingVertical:   12,
        fontSize:          14,
        color:             '#111',
        minHeight:         140,
        marginBottom:      16,
    },

    sendBtn: {
        height:          52,
        backgroundColor: '#111',
        borderRadius:    14,
        alignItems:      'center',
        justifyContent:  'center',
    },
    sendBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sendBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700' },

    /* Success */
    successCard: {
        backgroundColor: '#fff',
        borderRadius:    16,
        padding:         32,
        borderWidth:     1,
        borderColor:     '#ebebeb',
        alignItems:      'center',
    },
    successIcon:  { marginBottom: 20 },
    successTitle: { fontSize: 22, fontWeight: '900', color: '#111', marginBottom: 10 },
    successSub: {
        fontSize:   14,
        color:      '#888',
        textAlign:  'center',
        lineHeight: 21,
        marginBottom: 28,
    },
    doneBtn: {
        width:           '100%',
        height:          52,
        backgroundColor: '#111',
        borderRadius:    14,
        alignItems:      'center',
        justifyContent:  'center',
    },
    doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
