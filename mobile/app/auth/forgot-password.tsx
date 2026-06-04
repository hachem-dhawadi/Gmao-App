import { useState } from 'react'
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { apiForgotPassword } from '@/services/AuthService'
import AlertModal from '@/components/ui/AlertModal'

export default function ForgotPasswordScreen() {
    const [email,   setEmail]   = useState('')
    const [loading, setLoading] = useState(false)
    const [sent,    setSent]    = useState(false)
    const [focused, setFocused] = useState(false)
    const [err,     setErr]     = useState('')
    const [modal,   setModal]   = useState<{ title: string; message: string; type: 'error' | 'success' | 'info' } | null>(null)

    const handleSubmit = async () => {
        if (!email.trim()) { setErr('Email is required'); return }
        setErr('')
        setLoading(true)
        try {
            await apiForgotPassword(email.trim())
            setSent(true)
        } catch {
            setModal({ title: 'Error', message: 'Could not send reset email. Please check the address and try again.', type: 'error' })
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

                        {sent ? (
                            /* ── Success state ── */
                            <View style={s.successWrap}>
                                <Text style={[s.title, { textAlign: 'center' }]}>Check your email</Text>
                                <Text style={s.subtitle}>
                                    We sent a password reset link to{'\n'}
                                    <Text style={s.emailBold}>{email}</Text>
                                </Text>
                                <Text style={s.hint}>
                                    Click the link in the email to reset your password.{'\n'}The link expires in 60 minutes.
                                </Text>

                                <TouchableOpacity
                                    style={s.btnPrimary}
                                    onPress={() => router.back()}
                                    activeOpacity={0.85}
                                >
                                    <Text style={s.btnPrimaryText}>Back to Sign In</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={s.textBtn}
                                    onPress={() => { setSent(false); setEmail('') }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={s.textBtnText}>Try a different email</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            /* ── Form state ── */
                            <>
                                <Text style={[s.title, { textAlign: 'center' }]}>Forgot password?</Text>
                                <Text style={s.subtitle}>
                                    Enter the email linked to your account and we'll send you a reset link.
                                </Text>

                                <View style={s.fieldGroup}>
                                    <Text style={s.label}>Email</Text>
                                    <TextInput
                                        style={[s.input, focused && s.inputFocused, err ? s.inputError : null]}
                                        placeholder="Enter your email"
                                        placeholderTextColor="#c8c8c8"
                                        value={email}
                                        onChangeText={t => { setEmail(t); setErr('') }}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        returnKeyType="done"
                                        onFocus={() => setFocused(true)}
                                        onBlur={() => setFocused(false)}
                                        onSubmitEditing={handleSubmit}
                                    />
                                    {err ? <Text style={s.errText}>{err}</Text> : null}
                                </View>

                                <TouchableOpacity
                                    style={[s.btnPrimary, loading && s.btnDisabled]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                >
                                    <Text style={s.btnPrimaryText}>{loading ? 'Sending…' : 'Send Reset Link'}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={s.textBtn}
                                    onPress={() => router.back()}
                                    activeOpacity={0.7}
                                >
                                    <Text style={s.textBtnText}>Back to Sign In</Text>
                                </TouchableOpacity>
                            </>
                        )}

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
        marginBottom: 10,
    },
    subtitle: {
        fontSize:     14,
        color:        '#888',
        lineHeight:   22,
        marginBottom: 28,
        textAlign:    'center',
    },

    /* Fields */
    fieldGroup: { marginBottom: 28 },
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
        marginBottom:    16,
    },
    btnDisabled:    { opacity: 0.5 },
    btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    /* Text link */
    textBtn:     { alignItems: 'center', paddingVertical: 4 },
    textBtnText: { fontSize: 15, fontWeight: '700', color: '#111' },

    /* Success state */
    successWrap: {},
    emailBold:   { color: '#111', fontWeight: '700' },
    hint: {
        fontSize:     13,
        color:        '#aaa',
        textAlign:    'center',
        lineHeight:   20,
        marginBottom: 32,
    },
})
