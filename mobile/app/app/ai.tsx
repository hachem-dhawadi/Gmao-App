import { useState, useRef, useEffect, useCallback } from 'react'
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
    Keyboard,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Colors } from '@/constants/colors'
import { apiAiChat, type AiMessage, type AiAction } from '@/services/AiService'

// ── Suggestion chips shown on the landing screen ──────────────────────────────

const SUGGESTIONS = [
    { icon: 'construct-outline',      color: '#2a85ff', label: 'My open work orders',      prompt: 'Show me all my open work orders' },
    { icon: 'alert-circle-outline',   color: '#ef4444', label: 'Detect anomalies',          prompt: 'Detect anomalies in the system — overdue work orders, repeated failures' },
    { icon: 'pulse-outline',          color: '#10b981', label: 'Analyze asset health',      prompt: 'Analyze the health of all assets based on their maintenance history' },
    { icon: 'calendar-outline',       color: '#6366f1', label: 'List all PM plans',         prompt: 'Show me all preventive maintenance plans' },
    { icon: 'build-outline',          color: '#f59e0b', label: 'Create a work order',       prompt: 'I need to create a work order for a pump inspection, high priority, due next Monday' },
    { icon: 'warning-outline',        color: '#f97316', label: 'Report a problem',          prompt: 'I want to report a problem with the compressor, it is making unusual noise' },
]

// ── Simple markdown → text lines (bold + bullets) ─────────────────────────────

function renderText(text: string) {
    const lines = text.split('\n')
    return lines.map((line, i) => {
        const isBullet = /^[-*•]\s/.test(line.trim())
        const cleaned  = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^[-*•]\s/, '')
        if (!cleaned.trim()) return <View key={i} style={{ height: 6 }} />
        return (
            <Text key={i} style={[s.msgText, isBullet && s.bulletText]}>
                {isBullet ? '• ' : ''}{cleaned}
            </Text>
        )
    })
}

// ── Action card — shows tool result summary ────────────────────────────────────

function ActionCard({ action }: { action: AiAction }) {
    const labelMap: Record<string, string> = {
        get_work_orders:             'Work Orders',
        get_assets:                  'Assets',
        get_pm_plans:                'PM Plans',
        get_technicians:             'Technicians',
        get_members:                 'Members',
        analyze_asset_health:        'Asset Health',
        detect_anomalies:            'Anomalies',
        suggest_pm_plans:            'PM Suggestions',
        suggest_work_order:          'Work Order Draft',
        suggest_maintenance_request: 'Request Draft',
    }
    const iconMap: Record<string, string> = {
        get_work_orders:             'construct-outline',
        get_assets:                  'hardware-chip-outline',
        get_pm_plans:                'calendar-outline',
        get_technicians:             'people-outline',
        get_members:                 'person-outline',
        analyze_asset_health:        'pulse-outline',
        detect_anomalies:            'alert-circle-outline',
        suggest_pm_plans:            'clipboard-outline',
        suggest_work_order:          'add-circle-outline',
        suggest_maintenance_request: 'warning-outline',
    }

    const label = labelMap[action.type] ?? action.type
    const icon  = iconMap[action.type]  ?? 'information-circle-outline'
    const rows  = Array.isArray(action.data) ? action.data.slice(0, 5) : []

    const fieldLabels: Record<string, string[]> = {
        get_work_orders: ['title', 'status', 'priority', 'asset', 'due_at'],
        get_assets:      ['name', 'code', 'type', 'site'],
        get_pm_plans:    ['name', 'status', 'assigned_to', 'next_run_at'],
        get_technicians: ['name', 'open_wo_count'],
        get_members:     ['name', 'email', 'roles'],
        detect_anomalies:['message', 'severity'],
        analyze_asset_health: ['asset_name', 'risk_level', 'total_wos', 'open_wos'],
    }
    const fields = fieldLabels[action.type] ?? Object.keys(rows[0] ?? {}).slice(0, 3)

    return (
        <View style={s.actionCard}>
            <View style={s.actionHeader}>
                <Ionicons name={icon as never} size={14} color={Colors.primary} />
                <Text style={s.actionLabel}>{label}</Text>
                {rows.length > 0 && <Text style={s.actionCount}>{rows.length} result{rows.length > 1 ? 's' : ''}</Text>}
            </View>
            {rows.map((row, i) => (
                <View key={i} style={[s.actionRow, i > 0 && s.actionRowBorder]}>
                    {fields.map(f => row[f] != null ? (
                        <Text key={f} style={s.actionRowText} numberOfLines={1}>
                            <Text style={s.actionField}>{f.replace(/_/g, ' ')}: </Text>
                            {String(row[f])}
                        </Text>
                    ) : null)}
                </View>
            ))}
        </View>
    )
}

// ── Typing dots ───────────────────────────────────────────────────────────────

function TypingIndicator() {
    return (
        <View style={s.typingRow}>
            <View style={s.aiAvatar}>
                <Ionicons name="sparkles" size={13} color="#fff" />
            </View>
            <View style={s.typingBubble}>
                <Text style={s.typingDots}>•  •  •</Text>
            </View>
        </View>
    )
}

// ── Message bubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: AiMessage }) {
    const isUser = msg.role === 'user'
    return (
        <View style={[s.msgRow, isUser && s.msgRowUser]}>
            {!isUser && (
                <View style={s.aiAvatar}>
                    <Ionicons name="sparkles" size={13} color="#fff" />
                </View>
            )}
            <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAi]}>
                {isUser
                    ? <Text style={s.msgTextUser}>{msg.content}</Text>
                    : renderText(msg.content)
                }
                {msg.action && <ActionCard action={msg.action} />}
            </View>
        </View>
    )
}

// ── Landing view ──────────────────────────────────────────────────────────────

function LandingView({ onSend }: { onSend: (p: string) => void }) {
    return (
        <View style={s.landing}>
            <View style={s.landingHero}>
                <View style={s.landingIcon}>
                    <Ionicons name="sparkles" size={28} color="#fff" />
                </View>
                <Text style={s.landingTitle}>CMMS Copilot</Text>
                <Text style={s.landingSub}>Ask me anything about your maintenance operations</Text>
            </View>
            <View style={s.suggestGrid}>
                {SUGGESTIONS.map(s => (
                    <TouchableOpacity
                        key={s.prompt}
                        style={sug.card}
                        activeOpacity={0.75}
                        onPress={() => onSend(s.prompt)}
                    >
                        <View style={[sug.iconBox, { backgroundColor: s.color + '18' }]}>
                            <Ionicons name={s.icon as never} size={20} color={s.color} />
                        </View>
                        <Text style={sug.label}>{s.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AiScreen() {
    const insets                  = useSafeAreaInsets()
    const [messages, setMessages] = useState<AiMessage[]>([])
    const [input,    setInput]    = useState('')
    const [typing,   setTyping]   = useState(false)
    const scrollRef               = useRef<ScrollView>(null)
    const inputRef                = useRef<TextInput>(null)

    const scrollToBottom = useCallback(() => {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    }, [])

    useEffect(() => { scrollToBottom() }, [messages, typing])

    const handleSend = useCallback(async (text: string) => {
        const prompt = text.trim()
        if (!prompt || typing) return

        Keyboard.dismiss()
        setInput('')

        const userMsg: AiMessage = {
            id:        Date.now().toString(),
            role:      'user',
            content:   prompt,
            createdAt: Date.now(),
        }
        setMessages(prev => [...prev, userMsg])
        setTyping(true)

        try {
            const { content, action } = await apiAiChat(prompt)
            const aiMsg: AiMessage = {
                id:        (Date.now() + 1).toString(),
                role:      'assistant',
                content,
                action,
                createdAt: Date.now(),
            }
            setMessages(prev => [...prev, aiMsg])
        } catch {
            const errMsg: AiMessage = {
                id:        (Date.now() + 1).toString(),
                role:      'assistant',
                content:   'Sorry, I could not reach the AI service. Please try again.',
                createdAt: Date.now(),
            }
            setMessages(prev => [...prev, errMsg])
        } finally {
            setTyping(false)
        }
    }, [typing])

    const handleSubmit = useCallback(() => {
        if (input.trim()) handleSend(input)
    }, [input, handleSend])

    const handleClear = useCallback(() => {
        setMessages([])
        setInput('')
    }, [])

    return (
        <SafeAreaView style={s.safe} edges={['top']}>

            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={22} color="#111" />
                </TouchableOpacity>
                <View style={s.headerCenter}>
                    <Ionicons name="sparkles" size={16} color={Colors.primary} />
                    <Text style={s.headerTitle}>AI Assistant</Text>
                </View>
                {messages.length > 0 ? (
                    <TouchableOpacity onPress={handleClear} style={s.headerBtn} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={20} color="#aaa" />
                    </TouchableOpacity>
                ) : (
                    <View style={s.headerBtn} />
                )}
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                {/* Messages */}
                <ScrollView
                    ref={scrollRef}
                    style={s.scroll}
                    contentContainerStyle={[
                        s.scrollContent,
                        { paddingBottom: insets.bottom + 80 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {messages.length === 0
                        ? <LandingView onSend={handleSend} />
                        : messages.map(m => <MessageBubble key={m.id} msg={m} />)
                    }
                    {typing && <TypingIndicator />}
                </ScrollView>

                {/* Input bar */}
                <View style={[s.inputBar, { paddingBottom: insets.bottom || 12 }]}>
                    <TextInput
                        ref={inputRef}
                        style={s.textInput}
                        value={input}
                        onChangeText={setInput}
                        placeholder="Ask me anything…"
                        placeholderTextColor={Colors.gray400}
                        multiline
                        maxLength={2000}
                        returnKeyType="send"
                        blurOnSubmit={false}
                        onSubmitEditing={handleSubmit}
                    />
                    <TouchableOpacity
                        style={[s.sendBtn, (!input.trim() || typing) && s.sendBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={!input.trim() || typing}
                        activeOpacity={0.8}
                    >
                        {typing
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Ionicons name="send" size={18} color="#fff" />
                        }
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

        </SafeAreaView>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe:   { flex: 1, backgroundColor: '#f5f5f5' },

    header: {
        flexDirection:     'row',
        alignItems:        'center',
        backgroundColor:   '#fff',
        paddingHorizontal: 12,
        paddingVertical:   14,
        borderBottomWidth: 1,
        borderBottomColor: '#ebebeb',
    },
    headerBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    headerTitle:  { fontSize: 16, fontWeight: '800', color: '#111' },

    scroll:        { flex: 1 },
    scrollContent: { padding: 16 },

    /* Landing */
    landing:     { alignItems: 'center', paddingTop: 20 },
    landingHero: { alignItems: 'center', marginBottom: 32 },
    landingIcon: {
        width:           64,
        height:          64,
        borderRadius:    20,
        backgroundColor: Colors.primary,
        alignItems:      'center',
        justifyContent:  'center',
        marginBottom:    16,
        shadowColor:     Colors.primary,
        shadowOffset:    { width: 0, height: 4 },
        shadowOpacity:   0.3,
        shadowRadius:    8,
        elevation:       6,
    },
    landingTitle: { fontSize: 24, fontWeight: '900', color: '#111', marginBottom: 8 },
    landingSub:   { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
    suggestGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' },

    /* Messages */
    msgRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 8 },
    msgRowUser: { flexDirection: 'row-reverse' },

    aiAvatar: {
        width:           30,
        height:          30,
        borderRadius:    9,
        backgroundColor: Colors.primary,
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
        marginTop:       2,
    },

    bubble:     { maxWidth: '80%', borderRadius: 16, padding: 12 },
    bubbleUser: { backgroundColor: '#111', borderBottomRightRadius: 4 },
    bubbleAi:   { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#ebebeb' },

    msgText:     { fontSize: 14, color: '#222', lineHeight: 21 },
    msgTextUser: { fontSize: 14, color: '#fff', lineHeight: 21 },
    bulletText:  { marginTop: 2 },

    /* Typing */
    typingRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 8 },
    typingBubble: { backgroundColor: '#fff', borderRadius: 16, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#ebebeb', paddingHorizontal: 16, paddingVertical: 14 },
    typingDots:   { fontSize: 18, color: Colors.primary, letterSpacing: 4 },

    /* Action card */
    actionCard:      { marginTop: 10, backgroundColor: '#f8f8ff', borderRadius: 10, borderWidth: 1, borderColor: Colors.primary + '30', overflow: 'hidden' },
    actionHeader:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.primary + '10' },
    actionLabel:     { fontSize: 12, fontWeight: '700', color: Colors.primary, flex: 1 },
    actionCount:     { fontSize: 11, color: Colors.primary + 'aa' },
    actionRow:       { paddingHorizontal: 12, paddingVertical: 7 },
    actionRowBorder: { borderTopWidth: 1, borderTopColor: '#ebebeb' },
    actionRowText:   { fontSize: 12, color: '#444', lineHeight: 18 },
    actionField:     { fontWeight: '600', color: '#666' },

    /* Input bar */
    inputBar: {
        flexDirection:     'row',
        alignItems:        'flex-end',
        gap:               10,
        backgroundColor:   '#fff',
        borderTopWidth:    1,
        borderTopColor:    '#ebebeb',
        paddingHorizontal: 16,
        paddingTop:        12,
    },
    textInput: {
        flex:              1,
        maxHeight:         120,
        backgroundColor:   '#f5f5f5',
        borderRadius:      20,
        paddingHorizontal: 16,
        paddingVertical:   10,
        fontSize:          14,
        color:             '#111',
        lineHeight:        20,
    },
    sendBtn: {
        width:           42,
        height:          42,
        borderRadius:    21,
        backgroundColor: Colors.primary,
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
    },
    sendBtnDisabled: { backgroundColor: '#ccc' },
})

const sug = StyleSheet.create({
    card: {
        width:           '47%',
        backgroundColor: '#fff',
        borderRadius:    14,
        padding:         14,
        borderWidth:     1,
        borderColor:     '#ebebeb',
        gap:             10,
        shadowColor:     '#000',
        shadowOffset:    { width: 0, height: 1 },
        shadowOpacity:   0.04,
        shadowRadius:    4,
        elevation:       2,
    },
    iconBox: {
        width:          38,
        height:         38,
        borderRadius:   10,
        alignItems:     'center',
        justifyContent: 'center',
    },
    label: { fontSize: 13, fontWeight: '700', color: '#222', lineHeight: 18 },
})
