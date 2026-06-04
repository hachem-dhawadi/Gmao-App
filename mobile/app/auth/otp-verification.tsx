import { useState, useRef, useEffect, useCallback } from 'react'
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { apiVerifyOtp, apiSendOtp } from '@/services/AuthService'
import AlertModal from '@/components/ui/AlertModal'

const OTP_LEN      = 6
const COOLDOWN_SEC = 60

export default function OtpVerificationScreen() {
    const { email } = useLocalSearchParams<{ email: string }>()

    const [otp,       setOtp]      = useState<string[]>(Array(OTP_LEN).fill(''))
    const [loading,   setLoading]  = useState(false)
    const [cooldown,  setCooldown] = useState(COOLDOWN_SEC)
    const [canResend, setCanResend]= useState(false)
    const [focused,   setFocused]  = useState<number | null>(null)
    const [modal,     setModal]    = useState<{ title: string; message: string; type: 'error' | 'success' | 'info'; onClose?: () => void } | null>(null)

    const refs     = useRef<(TextInput | null)[]>(Array(OTP_LEN).fill(null))
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const startCooldown = useCallback(() => {
        setCooldown(COOLDOWN_SEC)
        setCanResend(false)
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!)
                    setCanResend(true)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }, [])

    useEffect(() => {
        startCooldown()
        setTimeout(() => refs.current[0]?.focus(), 300)
        return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }, [startCooldown])

    const handleChange = (value: string, i: number) => {
        if (value.length > 1) {
            const digits = value.replace(/\D/g, '').slice(0, OTP_LEN).split('')
            const next = [...otp]
            digits.forEach((d, j) => { if (i + j < OTP_LEN) next[i + j] = d })
            setOtp(next)
            const jump = Math.min(i + digits.length, OTP_LEN - 1)
            refs.current[jump]?.focus()
            return
        }
        const digit = value.replace(/\D/g, '').slice(-1)
        const next = [...otp]
        next[i] = digit
        setOtp(next)
        if (digit && i < OTP_LEN - 1) refs.current[i + 1]?.focus()
    }

    const handleKey = (key: string, i: number) => {
        if (key === 'Backspace' && !otp[i] && i > 0) {
            const next = [...otp]
            next[i - 1] = ''
            setOtp(next)
            refs.current[i - 1]?.focus()
        }
    }

    const handleVerify = async () => {
        const code = otp.join('')
        if (code.length < OTP_LEN) {
            setModal({ title: 'Incomplete Code', message: 'Please enter all 6 digits.', type: 'info' })
            return
        }
        setLoading(true)
        try {
            await apiVerifyOtp(email ?? '', code)
            setModal({
                title:   'Email Verified',
                message: 'Your account has been verified. Please sign in.',
                type:    'success',
                onClose: () => router.replace('/auth/sign-in'),
            })
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ?? 'Invalid or expired code. Try again.'
            setModal({ title: 'Verification Failed', message: msg, type: 'error' })
            setOtp(Array(OTP_LEN).fill(''))
            refs.current[0]?.focus()
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        if (!canResend) return
        try {
            await apiSendOtp(email ?? '')
            startCooldown()
            setModal({ title: 'Code Sent', message: 'A new verification code has been sent to your email.', type: 'success' })
        } catch {
            setModal({ title: 'Error', message: 'Could not resend code. Try again later.', type: 'error' })
        }
    }

    const isComplete = otp.every(d => d !== '')

    return (
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>

            <AlertModal
                visible={!!modal}
                title={modal?.title ?? ''}
                message={modal?.message ?? ''}
                type={modal?.type ?? 'info'}
                onClose={() => { modal?.onClose?.(); setModal(null) }}
            />

            {/* ── X button — fixed top-right ── */}
            <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
                <Ionicons name="close" size={16} color="#444" />
            </TouchableOpacity>

            <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={s.content}>

                    <Text style={s.title}>Verify your email</Text>
                    <Text style={s.subtitle}>
                        Enter the 6-digit code we sent to{'\n'}
                        <Text style={s.emailBold}>{email}</Text>
                    </Text>

                    {/* ── OTP boxes ── */}
                    <View style={s.otpRow}>
                        {otp.map((digit, i) => (
                            <TextInput
                                key={i}
                                ref={ref => { refs.current[i] = ref }}
                                style={[
                                    s.box,
                                    focused === i && s.boxFocused,
                                    digit         && s.boxFilled,
                                ]}
                                value={digit}
                                onChangeText={v => handleChange(v, i)}
                                onKeyPress={({ nativeEvent }) => handleKey(nativeEvent.key, i)}
                                onFocus={() => setFocused(i)}
                                onBlur={() => setFocused(null)}
                                keyboardType="number-pad"
                                maxLength={OTP_LEN}
                                selectTextOnFocus
                                caretHidden
                                textAlign="center"
                            />
                        ))}
                    </View>

                    {/* ── Verify button ── */}
                    <TouchableOpacity
                        style={[s.btnPrimary, (!isComplete || loading) && s.btnDisabled]}
                        onPress={handleVerify}
                        disabled={!isComplete || loading}
                        activeOpacity={0.85}
                    >
                        <Text style={s.btnPrimaryText}>{loading ? 'Verifying…' : 'Verify Code'}</Text>
                    </TouchableOpacity>

                    {/* ── Resend ── */}
                    <View style={s.resendRow}>
                        <Text style={s.resendLabel}>Didn't receive it? </Text>
                        {canResend
                            ? <TouchableOpacity onPress={handleResend}>
                                <Text style={s.resendLink}>Resend code</Text>
                              </TouchableOpacity>
                            : <Text style={s.resendTimer}>Resend in {cooldown}s</Text>
                        }
                    </View>

                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const BOX = 50

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

    content: {
        flex:              1,
        paddingHorizontal: 28,
        justifyContent:    'center',
        alignItems:        'center',
    },

    title: {
        fontSize:     26,
        fontWeight:   '900',
        color:        '#111',
        marginBottom: 10,
        textAlign:    'center',
    },
    subtitle: {
        fontSize:     14,
        color:        '#888',
        textAlign:    'center',
        lineHeight:   22,
        marginBottom: 36,
    },
    emailBold: { color: '#111', fontWeight: '700' },

    /* OTP boxes */
    otpRow: { flexDirection: 'row', gap: 10, marginBottom: 36 },
    box: {
        width:           BOX,
        height:          BOX + 8,
        borderWidth:     1.5,
        borderColor:     '#e4e4e4',
        borderRadius:    14,
        backgroundColor: '#fff',
        fontSize:        22,
        fontWeight:      '700',
        color:           '#111',
    },
    boxFocused: { borderColor: '#111' },
    boxFilled:  { borderColor: '#111', backgroundColor: '#f2f2f2' },

    /* Primary button */
    btnPrimary: {
        width:           '100%',
        height:          56,
        backgroundColor: '#111111',
        borderRadius:    16,
        alignItems:      'center',
        justifyContent:  'center',
        marginBottom:    20,
    },
    btnDisabled:    { opacity: 0.5 },
    btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    /* Resend */
    resendRow:   { flexDirection: 'row', alignItems: 'center' },
    resendLabel: { fontSize: 14, color: '#888' },
    resendLink:  { fontSize: 14, color: '#111', fontWeight: '700' },
    resendTimer: { fontSize: 14, color: '#aaa', fontWeight: '600' },
})
