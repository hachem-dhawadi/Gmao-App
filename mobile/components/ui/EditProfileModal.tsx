import { useState, useEffect, useRef } from 'react'
import {
    Modal, View, Text, StyleSheet, TouchableOpacity,
    ScrollView, ActivityIndicator, Keyboard, TextInput, Image,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { Colors } from '@/constants/colors'
import Input from '@/components/ui/Input'
import { apiUpdateProfile } from '@/services/AuthService'
import { useAuthStore } from '@/store/authStore'

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.43.163:8000/api/v1').replace('/api/v1', '')

function fullAvatarUrl(avatar: string | null | undefined): string | null {
    if (!avatar) return null
    if (avatar.startsWith('http')) return avatar
    return `${API_BASE}${avatar}`
}

type Props = {
    visible:   boolean
    onClose:   () => void
    onSuccess: () => void
}

function splitPhone(phone?: string | null): { dialCode: string; localNumber: string } {
    const p = (phone ?? '').trim()
    if (p.startsWith('+')) {
        const spaceIdx = p.indexOf(' ')
        if (spaceIdx !== -1) {
            return { dialCode: p.slice(0, spaceIdx), localNumber: p.slice(spaceIdx + 1) }
        }
        return { dialCode: p, localNumber: '' }
    }
    return { dialCode: '', localNumber: p }
}

export default function EditProfileModal({ visible, onClose, onSuccess }: Props) {
    const user    = useAuthStore((s) => s.user)
    const setUser = useAuthStore((s) => s.setUser)
    const insets  = useSafeAreaInsets()

    const [name,        setName]        = useState(user?.name  ?? '')
    const [email,       setEmail]       = useState(user?.email ?? '')
    const [dialCode,    setDialCode]    = useState(() => splitPhone(user?.phone).dialCode)
    const [localNumber, setLocalNumber] = useState(() => splitPhone(user?.phone).localNumber)

    const [avatarUri,     setAvatarUri]     = useState<string | null>(null)
    const [removeAvatar,  setRemoveAvatar]  = useState(false)

    const [nameErr,  setNameErr]  = useState('')
    const [emailErr, setEmailErr] = useState('')
    const [apiErr,   setApiErr]   = useState('')
    const [saving,   setSaving]   = useState(false)
    const [kbHeight, setKbHeight] = useState(0)

    const [dialFocused,   setDialFocused]   = useState(false)
    const [numberFocused, setNumberFocused] = useState(false)
    const numberRef = useRef<TextInput>(null)

    useEffect(() => {
        if (visible) {
            setName(user?.name ?? '')
            setEmail(user?.email ?? '')
            const { dialCode: dc, localNumber: ln } = splitPhone(user?.phone)
            setDialCode(dc)
            setLocalNumber(ln)
            setAvatarUri(null)
            setRemoveAvatar(false)
            setNameErr('')
            setEmailErr('')
            setApiErr('')
        }
    }, [visible])

    const pickAvatar = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        })
        if (!result.canceled && result.assets[0]) {
            setAvatarUri(result.assets[0].uri)
            setRemoveAvatar(false)
        }
    }

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', (e) =>
            setKbHeight(Math.max(0, e.endCoordinates.height - insets.bottom))
        )
        const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0))
        return () => { show.remove(); hide.remove() }
    }, [insets.bottom])

    const handleSave = async () => {
        let valid = true
        if (!name.trim()) { setNameErr('Name is required'); valid = false } else setNameErr('')
        if (!email.trim()) {
            setEmailErr('Email is required'); valid = false
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setEmailErr('Enter a valid email'); valid = false
        } else {
            setEmailErr('')
        }
        if (!valid) return
        setApiErr('')
        setSaving(true)

        const dc  = dialCode.trim()
        const ln  = localNumber.trim()
        const phone = dc && ln ? `${dc} ${ln}` : (ln || dc || '')

        try {
            const res = await apiUpdateProfile({
                name:         name.trim(),
                email:        email.trim(),
                phone,
                avatarUri:    avatarUri,
                removeAvatar: removeAvatar,
            })
            const newAvatar = res.data?.data?.user?.avatar_url ?? (removeAvatar ? null : user?.avatar)
            setUser({ name: name.trim(), email: email.trim(), phone: phone || null, avatar: newAvatar })
            onSuccess()
        } catch (e: any) {
            setApiErr(e.response?.data?.message ?? 'Could not update profile. Try again.')
        } finally {
            setSaving(false)
        }
    }

    const phoneFocused = dialFocused || numberFocused

    return (
        <Modal visible={visible} animationType="slide" statusBarTranslucent>
            <SafeAreaView style={s.safe} edges={['top']}>

                <View style={s.header}>
                    <TouchableOpacity onPress={onClose} style={s.headerBtn} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color="#111" />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Edit Profile</Text>
                    <View style={s.headerBtn} />
                </View>

                <View style={{ flex: 1, paddingBottom: kbHeight }}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.body}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Avatar picker */}
                        <View style={s.avatarSection}>
                            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8} style={s.avatarWrap}>
                                {avatarUri ? (
                                    <Image source={{ uri: avatarUri }} style={s.avatarImg} />
                                ) : !removeAvatar && fullAvatarUrl(user?.avatar) ? (
                                    <Image source={{ uri: fullAvatarUrl(user?.avatar)! }} style={s.avatarImg} />
                                ) : (
                                    <View style={s.avatarInitials}>
                                        <Text style={s.avatarInitialsText}>
                                            {(user?.name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <View style={s.avatarBadge}>
                                    <Ionicons name="camera" size={14} color="#fff" />
                                </View>
                            </TouchableOpacity>
                            <Text style={s.avatarHint}>Tap to change photo</Text>
                            {(avatarUri || (!removeAvatar && user?.avatar)) && (
                                <TouchableOpacity
                                    onPress={() => { setAvatarUri(null); setRemoveAvatar(true) }}
                                    style={s.removeBtn}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="trash-outline" size={14} color={Colors.error} />
                                    <Text style={s.removeText}>Remove photo</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={s.card}>
                            <Input
                                label="Full Name"
                                value={name}
                                onChangeText={setName}
                                placeholder="Your full name"
                                autoCapitalize="words"
                                error={nameErr}
                            />
                            <Input
                                label="Email"
                                value={email}
                                onChangeText={t => { setEmail(t); setEmailErr('') }}
                                placeholder="your@email.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                error={emailErr}
                            />

                            {/* Phone — dial code + local number side by side */}
                            <View style={s.phoneWrapper}>
                                <Text style={s.phoneLabel}>Phone</Text>
                                <View style={[s.phoneRow, phoneFocused && s.phoneRowFocused]}>
                                    {/* Dial code */}
                                    <TextInput
                                        style={s.dialInput}
                                        value={dialCode}
                                        onChangeText={t => {
                                            const clean = t.replace(/[^\d+]/g, '')
                                            const prefixed = clean && !clean.startsWith('+') ? '+' + clean : clean
                                            setDialCode(prefixed)
                                            if (clean.length >= 3) numberRef.current?.focus()
                                        }}
                                        placeholder="+216"
                                        placeholderTextColor={Colors.gray400}
                                        keyboardType="phone-pad"
                                        maxLength={5}
                                        returnKeyType="next"
                                        onSubmitEditing={() => numberRef.current?.focus()}
                                        onFocus={() => setDialFocused(true)}
                                        onBlur={() => setDialFocused(false)}
                                    />
                                    <View style={s.phoneDivider} />
                                    {/* Local number */}
                                    <TextInput
                                        ref={numberRef}
                                        style={s.numberInput}
                                        value={localNumber}
                                        onChangeText={setLocalNumber}
                                        placeholder="55 000 000"
                                        placeholderTextColor={Colors.gray400}
                                        keyboardType="phone-pad"
                                        onFocus={() => setNumberFocused(true)}
                                        onBlur={() => setNumberFocused(false)}
                                    />
                                </View>
                            </View>
                        </View>

                        {apiErr ? <Text style={s.apiErr}>{apiErr}</Text> : null}

                        <TouchableOpacity
                            style={[s.saveBtn, saving && { opacity: 0.6 }]}
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.85}
                        >
                            {saving
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={s.saveBtnText}>Save Changes</Text>
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

    avatarSection: { alignItems: 'center', marginBottom: 20 },
    avatarWrap: { position: 'relative', width: 88, height: 88, marginBottom: 8 },
    avatarImg: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#ebebeb' },
    avatarInitials: {
        width: 88, height: 88, borderRadius: 44,
        backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
    },
    avatarInitialsText: { fontSize: 30, fontWeight: '800', color: '#fff' },
    avatarBadge: {
        position: 'absolute', bottom: 0, right: 0,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#f5f5f5',
    },
    avatarHint: { fontSize: 12, color: '#aaa', marginBottom: 6 },
    removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
    removeText: { fontSize: 12, color: Colors.error, fontWeight: '600' },

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

    /* Phone row */
    phoneWrapper: { marginBottom: 16 },
    phoneLabel: {
        fontSize:     13,
        fontWeight:   '600',
        color:        Colors.gray700,
        marginBottom: 6,
    },
    phoneRow: {
        flexDirection:   'row',
        alignItems:      'center',
        backgroundColor: Colors.gray50,
        borderWidth:     1.5,
        borderColor:     Colors.gray200,
        borderRadius:    10,
        overflow:        'hidden',
    },
    phoneRowFocused: { borderColor: Colors.primary, backgroundColor: Colors.white },

    dialInput: {
        width:             72,
        fontSize:          14,
        color:             Colors.gray900,
        paddingVertical:   13,
        paddingHorizontal: 14,
        fontWeight:        '700',
        textAlign:         'center',
    },
    phoneDivider: {
        width:           1.5,
        height:          24,
        backgroundColor: Colors.gray200,
    },
    numberInput: {
        flex:              1,
        fontSize:          14,
        color:             Colors.gray900,
        paddingVertical:   13,
        paddingHorizontal: 14,
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
