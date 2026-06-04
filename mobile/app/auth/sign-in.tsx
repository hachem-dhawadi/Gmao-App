import { useState, useRef } from 'react'
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as SecureStore from 'expo-secure-store'
import { apiLogin, apiMe } from '@/services/AuthService'
import { useAuthStore } from '@/store/authStore'
import AlertModal from '@/components/ui/AlertModal'

export default function SignInScreen() {
    const { setAuth } = useAuthStore()

    const [email,        setEmail]      = useState('')
    const [password,     setPassword]   = useState('')
    const [showPass,     setShowPass]   = useState(false)
    const [rememberMe,   setRememberMe] = useState(false)
    const [loading,      setLoading]    = useState(false)
    const [emailErr,     setEmailErr]   = useState('')
    const [passErr,      setPassErr]    = useState('')
    const [focusedField, setFocused]    = useState<string | null>(null)
    const [modal,        setModal]      = useState<{ title: string; message: string; type: 'error' | 'success' | 'info' } | null>(null)

    const passRef = useRef<TextInput>(null)

    const validate = () => {
        let ok = true
        if (!email.trim())    { setEmailErr('Email is required');   ok = false } else setEmailErr('')
        if (!password.trim()) { setPassErr('Password is required'); ok = false } else setPassErr('')
        return ok
    }

    const handleLogin = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            const res   = await apiLogin({ email: email.trim(), password })
            const token = res.data.data.token
            await SecureStore.setItemAsync('auth_token', token)
            const me    = await apiMe()
            const { user, memberships, default_company_id } = me.data.data
            const membership = memberships.find((m: { company_id: number }) => m.company_id === default_company_id) ?? memberships[0]
            await setAuth(token, {
                id:          user.id,
                name:        user.name,
                email:       user.email,
                avatar:      user.avatar_url,
                memberId:    membership?.member_id ?? null,
                companyId:   default_company_id,
                roles:       membership?.roles.map((r: { code: string }) => r.code) ?? [],
                permissions: membership?.roles.flatMap((r: { permissions: string[] }) => r.permissions ?? []) ?? [],
            })
            router.replace('/app')
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ?? 'Check your credentials and try again.'
            setModal({ title: 'Sign In Failed', message: msg, type: 'error' })
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

            {/* Loading overlay */}
            <Modal visible={loading} transparent animationType="fade" statusBarTranslucent>
                <View style={s.overlay}>
                    <View style={s.overlayCard}>
                        <View style={s.overlaySpinner}>
                            <ActivityIndicator size="large" color="#111" />
                        </View>
                        <Text style={s.overlayText}>Signing in…</Text>
                    </View>
                </View>
            </Modal>

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
                        <Text style={s.title}>Sign in</Text>

                        {/* ── Email ── */}
                        <View style={s.fieldGroup}>
                            <Text style={s.label}>Email</Text>
                            <TextInput
                                style={[s.input, focusedField === 'email' && s.inputFocused, emailErr && s.inputError]}
                                placeholder="Enter your email"
                                placeholderTextColor="#c8c8c8"
                                value={email}
                                onChangeText={t => { setEmail(t); setEmailErr('') }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="next"
                                onFocus={() => setFocused('email')}
                                onBlur={() => setFocused(null)}
                                onSubmitEditing={() => passRef.current?.focus()}
                            />
                            {emailErr ? <Text style={s.errText}>{emailErr}</Text> : null}
                        </View>

                        {/* ── Password ── */}
                        <View style={s.fieldGroup}>
                            <Text style={s.label}>Password</Text>
                            <View style={[s.inputWrap, focusedField === 'password' && s.inputFocused, passErr && s.inputError]}>
                                <TextInput
                                    ref={passRef}
                                    style={s.inputFlex}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#c8c8c8"
                                    value={password}
                                    onChangeText={t => { setPassword(t); setPassErr('') }}
                                    secureTextEntry={!showPass}
                                    returnKeyType="done"
                                    onFocus={() => setFocused('password')}
                                    onBlur={() => setFocused(null)}
                                    onSubmitEditing={handleLogin}
                                />
                                <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn}>
                                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#c8c8c8" />
                                </TouchableOpacity>
                            </View>
                            {passErr ? <Text style={s.errText}>{passErr}</Text> : null}
                        </View>

                        {/* ── Remember me + Forgot ── */}
                        <View style={s.rememberRow}>
                            <TouchableOpacity style={s.checkRow} onPress={() => setRememberMe(v => !v)} activeOpacity={0.7}>
                                <View style={[s.checkbox, rememberMe && s.checkboxActive]}>
                                    {rememberMe && <Ionicons name="checkmark" size={10} color="#fff" />}
                                </View>
                                <Text style={s.rememberText}>Remember me</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
                                <Text style={s.forgotText}>Forgot password</Text>
                            </TouchableOpacity>
                        </View>

                        {/* ── Continue ── */}
                        <TouchableOpacity
                            style={[s.btnPrimary, loading && s.btnDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Text style={s.btnPrimaryText}>Continue</Text>
                            }
                        </TouchableOpacity>

                        {/* ── Footer ── */}
                        <TouchableOpacity
                            style={s.switchBtn}
                            onPress={() => { router.back(); setTimeout(() => router.push('/auth/sign-up'), 250) }}
                            activeOpacity={0.7}
                        >
                            <Text style={s.switchText}>Don't have an account?</Text>
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

    /* Centers form vertically — equal top/bottom space */
    scroll: {
        flexGrow:       1,
        justifyContent: 'center',
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

    /* Remember */
    rememberRow: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   28,
    },
    checkRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkbox: {
        width:           16,
        height:          16,
        borderRadius:    4,
        borderWidth:     1.5,
        borderColor:     '#d0d0d0',
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: '#fff',
    },
    checkboxActive: { backgroundColor: '#111', borderColor: '#111' },
    rememberText:   { fontSize: 13, fontWeight: '600', color: '#888' },
    forgotText:     { fontSize: 13, fontWeight: '600', color: '#888' },

    /* Loading overlay — matches AlertModal style */
    overlay: {
        flex:              1,
        backgroundColor:   'rgba(0,0,0,0.45)',
        alignItems:        'center',
        justifyContent:    'center',
        paddingHorizontal: 32,
    },
    overlayCard: {
        width:             '100%',
        backgroundColor:   '#fff',
        borderRadius:      24,
        paddingHorizontal: 28,
        paddingVertical:   32,
        alignItems:        'center',
    },
    overlaySpinner: {
        width:           64,
        height:          64,
        borderRadius:    20,
        backgroundColor: '#11111118',
        alignItems:      'center',
        justifyContent:  'center',
        marginBottom:    20,
    },
    overlayText: { fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' },

    /* Primary button — same as welcome page */
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
