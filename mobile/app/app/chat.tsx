import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react'
import {
    View, Text, StyleSheet, FlatList, TextInput,
    RefreshControl, ActivityIndicator, Pressable,
    Animated, ScrollView, Alert, KeyboardAvoidingView,
    Platform, Image, Modal,
} from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '@/store/authStore'
import {
    apiGetConversations, apiGetMessages, apiSendMessage,
    apiMarkRead, apiCreateConversation, apiGetMembersForChat,
    type Conversation, type Message, type MemberForChat,
} from '@/services/ChatService'

// ── helpers ───────────────────────────────────────────────────────────────────

function formatTime(ts: string | null): string {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7)  return d.toLocaleDateString('en-US', { weekday: 'short' })
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function initials(name: string | null): string {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ name, avatar, size = 44 }: { name: string | null; avatar?: string | null; size?: number }) {
    if (avatar) {
        return <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    }
    const hue = Math.abs((name ?? '').split('').reduce((h, c) => h + c.charCodeAt(0), 0)) % 360
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue},60%,72%)`, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: size * 0.34, fontWeight: '800', color: '#fff' }}>{initials(name)}</Text>
        </View>
    )
}

// ── Conversation Card ─────────────────────────────────────────────────────────

const ConvCard = memo(function ConvCard({
    item,
    onPress,
}: {
    item: Conversation
    onPress: (item: Conversation) => void
}) {
    const lastMsg = item.last_message
    const preview = lastMsg?.body ?? (lastMsg?.type === 'image' ? '📷 Image' : lastMsg?.type === 'file' ? '📎 File' : '')

    return (
        <TouchableOpacity style={s.convCard} activeOpacity={0.72} onPress={() => onPress(item)}>
            <Avatar name={item.name} avatar={item.avatar} size={48} />
            <View style={s.convInfo}>
                <View style={s.convTop}>
                    <Text style={s.convName} numberOfLines={1}>{item.name}</Text>
                    {lastMsg?.created_at && (
                        <Text style={s.convTime}>{formatTime(lastMsg.created_at)}</Text>
                    )}
                </View>
                <View style={s.convBottom}>
                    <Text style={[s.convPreview, item.unread_count > 0 && s.convPreviewUnread]} numberOfLines={1}>
                        {preview || 'No messages yet'}
                    </Text>
                    {item.unread_count > 0 && (
                        <View style={s.unreadBadge}>
                            <Text style={s.unreadText}>
                                {item.unread_count > 99 ? '99+' : item.unread_count}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    )
})

// ── Message Bubble ────────────────────────────────────────────────────────────

const MessageBubble = memo(function MessageBubble({ msg, prevMsg }: { msg: Message; prevMsg?: Message }) {
    const showSender = !msg.is_mine && (!prevMsg || prevMsg.sender?.id !== msg.sender?.id || prevMsg.is_mine)

    return (
        <View style={[s.msgWrap, msg.is_mine && s.msgWrapMine]}>
            {!msg.is_mine && (
                <View style={s.msgAvatar}>
                    {showSender
                        ? <Avatar name={msg.sender?.name ?? null} avatar={msg.sender?.avatar} size={30} />
                        : <View style={{ width: 30 }} />
                    }
                </View>
            )}
            <View style={[s.bubble, msg.is_mine ? s.bubbleMine : s.bubbleOther]}>
                {showSender && (
                    <Text style={s.senderName}>{msg.sender?.name ?? 'Unknown'}</Text>
                )}
                {msg.body ? (
                    <Text style={[s.bubbleText, msg.is_mine && s.bubbleTextMine]}>{msg.body}</Text>
                ) : null}
                {msg.attachments?.length > 0 && (
                    <View style={s.attachWrap}>
                        {msg.attachments.map(a => (
                            <View key={a.id} style={s.attachItem}>
                                <Ionicons name="attach-outline" size={13} color={msg.is_mine ? '#ffffffaa' : '#666'} />
                                <Text style={[s.attachName, msg.is_mine && { color: '#ffffffcc' }]} numberOfLines={1}>
                                    {a.original_name}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
                <Text style={[s.bubbleTime, msg.is_mine && s.bubbleTimeMine]}>
                    {formatTime(msg.created_at)}
                </Text>
            </View>
        </View>
    )
})

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ChatScreen() {
    const insets = useSafeAreaInsets()
    const hasChatRead = useAuthStore(s => s.user?.permissions?.includes('chat.read') ?? false)
    const hasChatWrite = useAuthStore(s => s.user?.permissions?.includes('chat.write') ?? false)
    const myMemberId = useAuthStore(s => s.user?.memberId)

    if (!hasChatRead) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }} edges={['top']}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 }}>
                    <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="lock-closed-outline" size={32} color="#8b5cf6" />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' }}>Access Restricted</Text>
                    <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 }}>
                        Your role does not have permission to access Chat.
                    </Text>
                </View>
            </SafeAreaView>
        )
    }

    // ── state ─────────────────────────────────────────────────────────────────
    const [conversations,   setConversations]   = useState<Conversation[]>([])
    const [loading,         setLoading]         = useState(true)
    const [refreshing,      setRefreshing]      = useState(false)

    // Active thread
    const [activeConv,      setActiveConv]      = useState<Conversation | null>(null)
    const [messages,        setMessages]        = useState<Message[]>([])
    const [msgLoading,      setMsgLoading]      = useState(false)
    const [sending,         setSending]         = useState(false)
    const [draft,           setDraft]           = useState('')
    const listRef = useRef<FlatList>(null)

    // New chat sheet
    const [newChatOpen,     setNewChatOpen]     = useState(false)
    const [members,         setMembers]         = useState<MemberForChat[]>([])
    const [memberSearch,    setMemberSearch]    = useState('')
    const [selectedMembers, setSelectedMembers] = useState<number[]>([])
    const [groupName,       setGroupName]       = useState('')
    const [creating,        setCreating]        = useState(false)
    const newChatSlide    = useRef(new Animated.Value(900)).current
    const newChatBackdrop = useRef(new Animated.Value(0)).current

    // ── load conversations ────────────────────────────────────────────────────
    const loadConversations = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true)
        try {
            const res = await apiGetConversations()
            setConversations(res.data?.data?.conversations ?? [])
        } catch {
            setConversations([])
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { loadConversations(true) }, [loadConversations])

    const onRefresh = useCallback(() => { setRefreshing(true); loadConversations() }, [loadConversations])

    // ── open conversation ─────────────────────────────────────────────────────
    const openConversation = useCallback(async (conv: Conversation) => {
        setActiveConv(conv)
        setMessages([])
        setMsgLoading(true)
        try {
            const res = await apiGetMessages(conv.id)
            setMessages(res.data?.data?.messages ?? [])
        } catch {
            setMessages([])
        } finally {
            setMsgLoading(false)
        }
        // mark read
        apiMarkRead(conv.id).catch(() => {})
        // update unread_count locally
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c))
    }, [])

    const closeConversation = useCallback(() => {
        setActiveConv(null)
        setMessages([])
        setDraft('')
        loadConversations()
    }, [loadConversations])

    // ── send message ──────────────────────────────────────────────────────────
    const sendMessage = useCallback(async () => {
        if (!activeConv || !draft.trim() || sending) return
        const body = draft.trim()
        setDraft('')
        setSending(true)
        try {
            const res = await apiSendMessage(activeConv.id, body)
            const msg = res.data?.data?.message
            if (msg) setMessages(prev => [...prev, msg])
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
        } catch {
            Alert.alert('Error', 'Failed to send message.')
            setDraft(body)
        } finally {
            setSending(false)
        }
    }, [activeConv, draft, sending])

    // ── new chat sheet ────────────────────────────────────────────────────────
    const openNewChat = useCallback(async () => {
        newChatSlide.setValue(900)
        newChatBackdrop.setValue(0)
        setNewChatOpen(true)
        setSelectedMembers([])
        setGroupName('')
        setMemberSearch('')
        if (members.length === 0) {
            try {
                const res = await apiGetMembersForChat()
                setMembers(res.data?.data?.members ?? [])
            } catch { /* silent */ }
        }
    }, [members.length])

    const closeNewChat = useCallback(() => {
        Animated.parallel([
            Animated.timing(newChatSlide,    { toValue: 900, duration: 220, useNativeDriver: true }),
            Animated.timing(newChatBackdrop, { toValue: 0,   duration: 180, useNativeDriver: true }),
        ]).start(() => setNewChatOpen(false))
    }, [])

    const handleStartChat = useCallback(async () => {
        if (selectedMembers.length === 0) {
            Alert.alert('Select at least one member')
            return
        }
        const type = selectedMembers.length === 1 ? 'direct' : 'group'
        if (type === 'group' && !groupName.trim()) {
            Alert.alert('Enter a group name')
            return
        }
        setCreating(true)
        try {
            const res = await apiCreateConversation({
                type,
                member_ids: selectedMembers,
                name: type === 'group' ? groupName.trim() : undefined,
            })
            const conv = res.data?.data?.conversation
            if (conv) {
                closeNewChat()
                setConversations(prev => {
                    const exists = prev.find(c => c.id === conv.id)
                    if (exists) return prev
                    return [conv, ...prev]
                })
                openConversation(conv)
            }
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            Alert.alert('Error', msg ?? 'Failed to create conversation.')
        } finally {
            setCreating(false)
        }
    }, [selectedMembers, groupName, closeNewChat, openConversation])

    const filteredMembers = useMemo(() => {
        const q = memberSearch.toLowerCase()
        const list = members.filter(m => m.id !== myMemberId)
        if (!q) return list
        return list.filter(m => (m.name ?? '').toLowerCase().includes(q))
    }, [members, memberSearch, myMemberId])

    const toggleMember = useCallback((id: number) => {
        setSelectedMembers(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }, [])

    const renderConv = useCallback(({ item }: { item: Conversation }) => (
        <ConvCard item={item} onPress={openConversation} />
    ), [openConversation])

    const renderMsg = useCallback(({ item, index }: { item: Message; index: number }) => (
        <MessageBubble msg={item} prevMsg={messages[index - 1]} />
    ), [messages])

    // ── CONVERSATION LIST VIEW ────────────────────────────────────────────────
    if (!activeConv) {
        return (
            <SafeAreaView style={s.safe} edges={['top']}>
                {/* Header */}
                <View style={s.header}>
                    <Text style={s.headerTitle}>Chat</Text>
                    {hasChatWrite && (
                        <TouchableOpacity style={s.addBtn} onPress={openNewChat} activeOpacity={0.8}>
                            <Ionicons name="create-outline" size={20} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#111" style={{ marginTop: 60 }} />
                ) : (
                    <FlatList
                        data={conversations}
                        keyExtractor={item => String(item.id)}
                        renderItem={renderConv}
                        contentContainerStyle={s.convList}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111" />}
                        ListEmptyComponent={
                            <View style={s.emptyWrap}>
                                <View style={s.emptyIconWrap}>
                                    <Ionicons name="chatbubbles-outline" size={32} color="#ccc" />
                                </View>
                                <Text style={s.emptyTitle}>No conversations yet</Text>
                                <Text style={s.emptySubtitle}>Start a new chat with your team</Text>
                                {hasChatWrite && (
                                    <TouchableOpacity style={s.emptyBtn} onPress={openNewChat} activeOpacity={0.8}>
                                        <Ionicons name="create-outline" size={16} color="#fff" />
                                        <Text style={s.emptyBtnText}>New Chat</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        }
                    />
                )}

                {/* ── NEW CHAT SHEET ── */}
                <Modal
                    visible={newChatOpen}
                    transparent
                    statusBarTranslucent
                    animationType="none"
                    onRequestClose={closeNewChat}
                    onShow={() => {
                        Animated.parallel([
                            Animated.spring(newChatSlide,    { toValue: 0, bounciness: 0, speed: 20, useNativeDriver: true }),
                            Animated.timing(newChatBackdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
                        ]).start()
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Animated.View style={[StyleSheet.absoluteFillObject, s.backdrop, { opacity: newChatBackdrop }]}>
                            <Pressable style={StyleSheet.absoluteFillObject} onPress={closeNewChat} />
                        </Animated.View>

                        <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: newChatSlide }] }]}>
                            <View style={s.handle} />
                            <View style={s.sheetTitleRow}>
                                <Text style={s.sheetTitle}>New Chat</Text>
                                <TouchableOpacity style={s.closeBtn} onPress={closeNewChat} activeOpacity={0.7}>
                                    <Ionicons name="close" size={18} color="#555" />
                                </TouchableOpacity>
                            </View>

                            <View style={{ flex: 1 }}>

                            {/* Group name — shown when >1 selected */}
                            {selectedMembers.length > 1 && (
                                <>
                                    <Text style={s.label}>Group Name <Text style={{ color: '#ef4444' }}>*</Text></Text>
                                    <TextInput
                                        style={[s.textInput, { marginBottom: 14 }]}
                                        placeholder="e.g. Maintenance Team"
                                        placeholderTextColor="#ccc"
                                        value={groupName}
                                        onChangeText={setGroupName}
                                    />
                                </>
                            )}

                            {/* Selected chips */}
                            {selectedMembers.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
                                    {selectedMembers.map(id => {
                                        const m = members.find(x => x.id === id)
                                        return (
                                            <TouchableOpacity
                                                key={id}
                                                style={s.selectedChip}
                                                onPress={() => toggleMember(id)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={s.selectedChipText}>{m?.name ?? `#${id}`}</Text>
                                                <Ionicons name="close-circle" size={14} color="#8b5cf6" />
                                            </TouchableOpacity>
                                        )
                                    })}
                                </ScrollView>
                            )}

                            {/* Member search */}
                            <View style={s.memberSearchWrap}>
                                <Ionicons name="search-outline" size={14} color="#bbb" />
                                <TextInput
                                    style={s.memberSearchInput}
                                    placeholder="Search team members…"
                                    placeholderTextColor="#ccc"
                                    value={memberSearch}
                                    onChangeText={setMemberSearch}
                                />
                            </View>

                            <ScrollView style={{ flex: 1, marginTop: 10 }} keyboardShouldPersistTaps="handled">
                                {filteredMembers.map(m => {
                                    const sel = selectedMembers.includes(m.id)
                                    return (
                                        <TouchableOpacity
                                            key={m.id}
                                            style={[s.memberRow, sel && s.memberRowSel]}
                                            onPress={() => toggleMember(m.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Avatar name={m.name} avatar={m.avatar} size={38} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.memberName}>{m.name}</Text>
                                                {m.role_name && <Text style={s.memberRole}>{m.role_name}</Text>}
                                            </View>
                                            <View style={[s.checkCircle, sel && s.checkCircleSel]}>
                                                {sel && <Ionicons name="checkmark" size={13} color="#fff" />}
                                            </View>
                                        </TouchableOpacity>
                                    )
                                })}
                            </ScrollView>

                            </View>

                            <TouchableOpacity
                                style={[s.submitBtn, (creating || selectedMembers.length === 0) && { opacity: 0.5 }]}
                                onPress={handleStartChat}
                                disabled={creating || selectedMembers.length === 0}
                                activeOpacity={0.85}
                            >
                                {creating
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <>
                                        <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                                        <Text style={s.submitText}>
                                            {selectedMembers.length > 1 ? 'Create Group' : 'Start Chat'}
                                        </Text>
                                    </>
                                }
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </Modal>
            </SafeAreaView>
        )
    }

    // ── MESSAGE THREAD VIEW ───────────────────────────────────────────────────
    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            {/* Thread header */}
            <View style={s.threadHeader}>
                <TouchableOpacity style={s.backBtn} onPress={closeConversation} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={20} color="#111" />
                </TouchableOpacity>
                <Avatar name={activeConv.name} avatar={activeConv.avatar} size={36} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.threadName} numberOfLines={1}>{activeConv.name}</Text>
                    <Text style={s.threadSub}>
                        {activeConv.type === 'group'
                            ? `${activeConv.members.length} members`
                            : 'Direct message'}
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={insets.top + 60}
            >
                {msgLoading ? (
                    <ActivityIndicator size="large" color="#111" style={{ flex: 1, marginTop: 60 }} />
                ) : (
                    <FlatList
                        ref={listRef}
                        data={messages}
                        keyExtractor={item => String(item.id)}
                        renderItem={renderMsg}
                        contentContainerStyle={s.msgList}
                        showsVerticalScrollIndicator={false}
                        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
                        ListEmptyComponent={
                            <View style={s.emptyWrap}>
                                <Text style={s.emptySubtitle}>No messages yet. Say hello!</Text>
                            </View>
                        }
                    />
                )}

                {/* Input */}
                {hasChatWrite && (
                    <View style={[s.inputBar, { paddingBottom: insets.bottom || 12 }]}>
                        <TextInput
                            style={s.msgInput}
                            placeholder="Type a message…"
                            placeholderTextColor="#bbb"
                            value={draft}
                            onChangeText={setDraft}
                            multiline
                            maxLength={5000}
                            returnKeyType="default"
                        />
                        <TouchableOpacity
                            style={[s.sendBtn, (!draft.trim() || sending) && { opacity: 0.4 }]}
                            onPress={sendMessage}
                            disabled={!draft.trim() || sending}
                            activeOpacity={0.8}
                        >
                            {sending
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Ionicons name="send" size={18} color="#fff" />
                            }
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#fff' },

    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
    addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },

    /* Thread header */
    threadHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    backBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    threadName: { fontSize: 16, fontWeight: '700', color: '#111' },
    threadSub:  { fontSize: 12, color: '#aaa', marginTop: 1 },

    /* Conv list */
    convList: { paddingBottom: 20 },
    convCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
    },
    convInfo:   { flex: 1 },
    convTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    convName:   { fontSize: 15, fontWeight: '700', color: '#111', flex: 1, marginRight: 8 },
    convTime:   { fontSize: 11, color: '#bbb' },
    convBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    convPreview:       { fontSize: 13, color: '#bbb', flex: 1 },
    convPreviewUnread: { color: '#555', fontWeight: '600' },
    unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    unreadText:  { fontSize: 10, fontWeight: '800', color: '#fff' },

    /* Messages */
    msgList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 4 },
    msgWrap:     { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 4 },
    msgWrapMine: { flexDirection: 'row-reverse' },
    msgAvatar:   { width: 30 },
    bubble: {
        maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
    },
    bubbleOther:    { backgroundColor: '#f5f5f5', borderBottomLeftRadius: 4 },
    bubbleMine:     { backgroundColor: '#8b5cf6', borderBottomRightRadius: 4 },
    senderName:     { fontSize: 11, fontWeight: '700', color: '#8b5cf6', marginBottom: 4 },
    bubbleText:     { fontSize: 15, color: '#111', lineHeight: 22 },
    bubbleTextMine: { color: '#fff' },
    bubbleTime:     { fontSize: 10, color: '#aaa', marginTop: 4, textAlign: 'right' },
    bubbleTimeMine: { color: '#ffffff80' },
    attachWrap:  { gap: 4, marginTop: 4 },
    attachItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
    attachName:  { fontSize: 12, color: '#555', flex: 1 },

    /* Input bar */
    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end', gap: 10,
        paddingHorizontal: 16, paddingTop: 10,
        backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0',
    },
    msgInput: {
        flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111',
        maxHeight: 120,
    },
    sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },

    /* Empty */
    emptyWrap:    { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyIconWrap:{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
    emptyTitle:   { fontSize: 15, fontWeight: '700', color: '#555' },
    emptySubtitle:{ fontSize: 13, color: '#bbb' },
    emptyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#8b5cf6', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
    emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

    /* Sheet */
    backdrop: { backgroundColor: 'rgba(0,0,0,0.52)' },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingTop: 14,
        maxHeight: '90%',
    },
    handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 16 },
    sheetTitleRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    sheetTitle:   { fontSize: 18, fontWeight: '800', color: '#111' },
    closeBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ebebeb' },
    label:        { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 0.8, marginBottom: 8 },
    textInput:    { borderWidth: 1, borderColor: '#ebebeb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111', backgroundColor: '#fafafa' },

    /* New chat */
    selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ede9fe', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
    selectedChipText: { fontSize: 13, fontWeight: '600', color: '#7c3aed' },
    memberSearchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
    memberSearchInput:{ flex: 1, fontSize: 14, color: '#111', padding: 0 },
    memberRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    memberRowSel: { backgroundColor: '#faf5ff' },
    memberName:   { fontSize: 15, fontWeight: '600', color: '#111' },
    memberRole:   { fontSize: 11, color: '#aaa', marginTop: 2 },
    checkCircle:  { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e4e4e4', alignItems: 'center', justifyContent: 'center' },
    checkCircleSel: { backgroundColor: '#8b5cf6' },

    submitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 54, borderRadius: 14, backgroundColor: '#8b5cf6', marginTop: 16,
    },
    submitText: { fontSize: 15, fontWeight: '800', color: '#fff' },
})
