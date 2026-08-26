import { useState, useEffect } from 'react'
import {
    Modal, View, Text, StyleSheet, TouchableOpacity,
    ScrollView, ActivityIndicator, Keyboard,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import Input from '@/components/ui/Input'
import { apiUpdatePassword } from '@/services/AuthService'

type Props = {
    visible:   boolean
    onClose:   () => void
    onSuccess: () => void
}

export default function ChangePasswordModal({ visible, onClose, onSuccess }: Props) {
    const insets = useSafeAreaInsets()

    const [current,  setCurrent]  = useState('')
    const [next,     setNext]     = useState('')
    const [confirm,  setConfirm]  = useState('')
    const [errors,   setErrors]   = useState<Record<string, string>>({})
    const [apiErr,   setApiErr]   = useState('')
    const [saving,   setSaving]   = useState(false)
    const [kbHeight, setKbHeight] = useState(0)

    useEffect(() => {
        if (visible) {
            setCurrent('')
            setNext('')
            setConfirm('')
            setErrors({})
            setApiErr('')
        }
    }, [visible])

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', (e) =>
            setKbHeight(Math.max(0, e.endCoordinates.height - insets.bottom))
        )
        const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0))
        return () => { show.remove(); hide.remove() }
    }, [insets.bottom])

    const validate = () => {
        const e: Record<string, string> = {}
        if (!current.trim())  e.current = 'Current password is required'
        if (next.length < 8)  e.next    = 'Must be at least 8 characters'
        if (next !== confirm)  e.confirm = 'Passwords do not match'
        return e
    }

    const handleUpdate = async () => {
        const e = validate()
        if (Object.keys(e).length) { setErrors(e); return }
        setErrors({})
        setApiErr('')
        setSaving(true)
        try {
            await apiUpdatePassword({
                current_password:      current,
                password:              next,
                password_confirmation: confirm,
            })
            onSuccess()
        } catch (err: any) {
            const msg = err.response?.data?.message
                ?? err.response?.data?.error
                ?? 'Could not update password. Check your current password.'
            setApiErr(msg)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal visible={visible} animationType="slide" statusBarTranslucent>
            <SafeAreaView style={s.safe} edges={['top']}>

                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={onClose} style={s.headerBtn} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color="#111" />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Change Password</Text>
                    <View style={s.headerBtn} />
                </View>

                {/* kbHeight shrinks this container so keyboard never overlaps the ScrollView */}
                <View style={{ flex: 1, paddingBottom: kbHeight }}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.body}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={s.card}>
                            <Input
                                label="Current Password"
                                value={current}
                                onChangeText={setCurrent}
                                placeholder="Your current password"
                                password
                                error={errors.current}
                            />
                            <Input
                                label="New Password"
                                value={next}
                                onChangeText={setNext}
                                placeholder="Min. 8 characters"
                                password
                                error={errors.next}
                            />
                            <Input
                                label="Confirm New Password"
                                value={confirm}
                                onChangeText={setConfirm}
                                placeholder="Repeat new password"
                                password
                                error={errors.confirm}
                            />
                        </View>

                        {apiErr ? <Text style={s.apiErr}>{apiErr}</Text> : null}

                        <TouchableOpacity
                            style={[s.saveBtn, saving && { opacity: 0.6 }]}
                            onPress={handleUpdate}
                            disabled={saving}
                            activeOpacity={0.85}
                        >
                            {saving
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={s.saveBtnText}>Update Password</Text>
                            }
                        </TouchableOpacity>

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
        marginBottom:    20,
        shadowColor:     '#000',
        shadowOffset:    { width: 0, height: 1 },
        shadowOpacity:   0.04,
        shadowRadius:    4,
        elevation:       2,
    },

    apiErr: {
        color:        Colors.error,
        fontSize:     13,
        marginBottom: 12,
        textAlign:    'center',
    },
    saveBtn: {
        height:          52,
        backgroundColor: '#111',
        borderRadius:    14,
        alignItems:      'center',
        justifyContent:  'center',
    },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
