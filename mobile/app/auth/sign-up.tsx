import { useState, useRef } from 'react'
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { apiRegister } from '@/services/AuthService'
import AlertModal from '@/components/ui/AlertModal'

export default function SignUpScreen() {
    const [name,        setName]        = useState('')
    const [email,       setEmail]       = useState('')
    const [password,    setPassword]    = useState('')
    const [confirmPass, setConfirmPass] = useState('')
    const [showPass,    setShowPass]    = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading,     setLoading]     = useState(false)
    const [focused,     setFocused]     = useState<string | null>(null)
    const [errors,      setErrors]      = useState<Record<string, string>>({})
    const [modal,       setModal]       = useState<{ title: string; message: string; type: 'error' | 'success' | 'info' } | null>(null)

    const emailRef   = useRef<TextInput>(null)
    const passRef    = useRef<TextInput>(null)
    const confirmRef = useRef<TextInput>(null)

    const clear = (key: string) => setErrors(p => ({ ...p, [key]: '' }))

    const validate = () => {
        const e: Record<string, string> = {}
        if (!name.trim())                  e.name        = 'Name is required'
        if (!email.trim())                 e.email       = 'Email is required'
        if (!password)                     e.password    = 'Password is required'
        else if (password.length < 8)      e.password    = 'Minimum 8 characters'
        if (!confirmPass)                  e.confirmPass = 'Please confirm your password'
        else if (confirmPass !== password) e.confirmPass = 'Passwords do not match'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleRegister = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            const res = await apiRegister({
                name:                  name.trim(),
                email:                 email.trim(),
                password,
                password_confirmation: confirmPass,
            })
            const { requires_otp, email: resEmail } = res.data.data
            if (requires_otp) {
                router.replace(`/auth/otp-verification?email=${encodeURIComponent(resEmail || email.trim())}` as never)
            } else {
                router.replace('/auth/sign-in')
            }
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ?? 'Registration failed. Please try again.'
            setModal({ title: 'Registration Failed', message: msg, type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>

            <AlertModal
                visible={!!modal}
                title={modal?.title ?? ''}
                message={modal?.message ?? ''}
                type={modal?.type ?? 'info'}
                onClose={() => setModal(null)}
            />

            {/* ── X button — fixed top-right ── */}
            <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
                <Ionicons name="close" size={16} color="#444" />
            </TouchableOpacity>

            <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView
                    contentContainerStyle={s.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <View style={s.form}>

                        {/* ── Title ── */}
                        <Text style={s.title}>Create account</Text>

                        {/* ── Full Name ── */}
                        <View style={s.fieldGroup}>
                            <Text style={s.label}>Full Name</Text>
                            <TextInput
                                style={[s.input, focused === 'name' && s.inputFocused, errors.name && s.inputError]}
                                placeholder="Your full name"
                                placeholderTextColor="#c8c8c8"
                                value={name}
                                onChangeText={t => { setName(t); clear('name') }}
                                autoCapitalize="words"
                                returnKeyType="next"
                                onFocus={() => setFocused('name')}
                                onBlur={() => setFocused(null)}
                                onSubmitEditing={() => emailRef.current?.focus()}
                            />
                            {errors.name ? <Text style={s.errText}>{errors.name}</Text> : null}
                        </View>

                        {/* ── Email ── */}
                        <View style={s.fieldGroup}>
                            <Text style={s.label}>Email</Text>
                            <TextInput
                                ref={emailRef}
                                style={[s.input, focused === 'email' && s.inputFocused, errors.email && s.inputError]}
                                placeholder="Enter your email"
                                placeholderTextColor="#c8c8c8"
                                value={email}
                                onChangeText={t => { setEmail(t); clear('email') }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="next"
                                onFocus={() => setFocused('email')}
                                onBlur={() => setFocused(null)}
                                onSubmitEditing={() => passRef.current?.focus()}
                            />
                            {errors.email ? <Text style={s.errText}>{errors.email}</Text> : null}
                        </View>

                        {/* ── Password ── */}
                        <View style={s.fieldGroup}>
                            <Text style={s.label}>Password</Text>
                            <View style={[s.inputWrap, focused === 'password' && s.inputFocused, errors.password && s.inputError]}>
                                <TextInput
                                    ref={passRef}
                                    style={s.inputFlex}
                                    placeholder="Min. 8 characters"
                                    placeholderTextColor="#c8c8c8"
                                    value={password}
                                    onChangeText={t => { setPassword(t); clear('password') }}
                                    secureTextEntry={!showPass}
                                    returnKeyType="next"
                                    onFocus={() => setFocused('password')}
                                    onBlur={() => setFocused(null)}
                                    onSubmitEditing={() => confirmRef.current?.focus()}
                                />
                                <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn}>
                                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#c8c8c8" />
                                </TouchableOpacity>
                            </View>
                            {errors.password ? <Text style={s.errText}>{errors.password}</Text> : null}
                        </View>

                        {/* ── Confirm Password ── */}
                        <View style={s.fieldGroup}>
                            <Text style={s.label}>Confirm Password</Text>
                            <View style={[s.inputWrap, focused === 'confirmPass' && s.inputFocused, errors.confirmPass && s.inputError]}>
                                <TextInput
                                    ref={confirmRef}
                                    style={s.inputFlex}
                                    placeholder="Repeat your password"
                                    placeholderTextColor="#c8c8c8"
                                    value={confirmPass}
                                    onChangeText={t => { setConfirmPass(t); clear('confirmPass') }}
                                    secureTextEntry={!showConfirm}
                                    returnKeyType="done"
                                    onFocus={() => setFocused('confirmPass')}
                                    onBlur={() => setFocused(null)}
                                    onSubmitEditing={handleRegister}
                                />
                                <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={s.eyeBtn}>
                                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color="#c8c8c8" />
                                </TouchableOpacity>
                            </View>
                            {errors.confirmPass ? <Text style={s.errText}>{errors.confirmPass}</Text> : null}
                        </View>

                        {/* ── Create Account ── */}
                        <TouchableOpacity
                            style={[s.btnPrimary, loading && s.btnDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            <Text style={s.btnPrimaryText}>{loading ? 'Creating account…' : 'Create Account'}</Text>
                        </TouchableOpacity>

                        {/* ── Footer ── */}
                        <TouchableOpacity
                            style={s.switchBtn}
                            onPress={() => { router.back(); setTimeout(() => router.push('/auth/sign-in'), 250) }}
                            activeOpacity={0.7}
                        >
                            <Text style={s.switchText}>Already have an account?</Text>
                        </TouchableOpacity>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#fff' },
    flex: { flex: 1 },

    /* X button — absolute top-right */
    closeBtn: {
        position:        'absolute',
        top:             40,
        right:           20,
        zIndex:          10,
        width:           34,
        height:          34,
        borderRadius:    10,
        backgroundColor: '#f2f2f2',
        alignItems:      'center',
        justifyContent:  'center',
    },

    /* Centers form vertically */
    scroll: {
        flexGrow:        1,
        justifyContent:  'center',
        paddingVertical: 32,
    },
    form: { paddingHorizontal: 28 },

    title: {
        fontSize:     26,
        fontWeight:   '900',
        color:        '#111',
        marginBottom: 28,
    },

    /* Fields */
    fieldGroup: { marginBottom: 16 },
    label: {
        fontSize:     14,
        fontWeight:   '700',
        color:        '#111',
        marginBottom: 8,
    },
    input: {
        height:            54,
        backgroundColor:   '#fff',
        borderRadius:      14,
        paddingHorizontal: 16,
        fontSize:          15,
        fontWeight:        '600',
        color:             '#111',
        borderWidth:       1.5,
        borderColor:       '#e4e4e4',
    },
    inputWrap: {
        height:            54,
        flexDirection:     'row',
        alignItems:        'center',
        backgroundColor:   '#fff',
        borderRadius:      14,
        paddingHorizontal: 16,
        borderWidth:       1.5,
        borderColor:       '#e4e4e4',
    },
    inputFlex:    { flex: 1, fontSize: 15, fontWeight: '600', color: '#111' },
    eyeBtn:       { padding: 4 },
    inputFocused: { borderColor: '#111' },
    inputError:   { borderColor: '#ff6a55', backgroundColor: '#fff5f5' },
    errText:      { fontSize: 12, color: '#ff6a55', marginTop: 5, fontWeight: '600' },

    /* Primary button */
    btnPrimary: {
        height:          56,
        backgroundColor: '#111111',
        borderRadius:    16,
        alignItems:      'center',
        justifyContent:  'center',
        marginBottom:    28,
    },
    btnDisabled:    { opacity: 0.5 },
    btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    /* Footer */
    switchBtn:  { alignItems: 'center', paddingVertical: 4 },
    switchText: { fontSize: 15, fontWeight: '700', color: '#111' },
})
