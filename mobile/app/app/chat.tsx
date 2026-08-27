import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react'
import {
    View, Text, StyleSheet, FlatList, TextInput,
    RefreshControl, ActivityIndicator, Pressable,
    Animated, ScrollView, Alert,
    Image, Modal, Dimensions, Keyboard,
} from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'
import { useAuthStore } from '@/store/authStore'
import { useNotifStore } from '@/store/notifStore'
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

const { height: SH } = Dimensions.get('window')

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ChatScreen() {
    const insets = useSafeAreaInsets()
    const { open } = useLocalSearchParams<{ open?: string }>()
    const hasChatRead = useAuthStore(s => s.user?.permissions?.includes('chat.read') ?? false)
    const hasChatWrite = useAuthStore(s => s.user?.permissions?.includes('chat.write') ?? false)
    const myMemberId = useAuthStore(s => s.user?.memberId)
    const setUnreadChatCount = useNotifStore(s => s.setUnreadChatCount)

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
    const [kbHeight,        setKbHeight]        = useState(0)
    const listRef = useRef<FlatList>(null)

    // Track keyboard height precisely so we can lift content above keyboard
    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', (e) => {
            setKbHeight(e.endCoordinates.height)
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
        })
        const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0))
        return () => { show.remove(); hide.remove() }
    }, [])

    // Poll for new messages every 8s while a conversation is open
    const pollMsgRef = useRef<ReturnType<typeof setInterval> | null>(null)
    useEffect(() => {
        if (!activeConv) {
            if (pollMsgRef.current) clearInterval(pollMsgRef.current)
            return
        }
        pollMsgRef.current = setInterval(async () => {
            try {
                const res = await apiGetMessages(activeConv.id)
                const fetched: Message[] = res.data?.data?.messages ?? []
                setMessages(prev => {
                    if (!fetched.length) return prev
                    const lastId = prev.length ? prev[prev.length - 1].id : -1
                    const incoming = fetched.filter(m => m.id > lastId)
                    if (!incoming.length) return prev
                    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80)
                    return [...prev, ...incoming]
                })
            } catch {}
        }, 8_000)
        return () => { if (pollMsgRef.current) clearInterval(pollMsgRef.current) }
    }, [activeConv?.id])

    // Poll conversation list every 15s when no thread is open
    const pollConvRef = useRef<ReturnType<typeof setInterval> | null>(null)
    useEffect(() => {
        if (activeConv) {
            if (pollConvRef.current) clearInterval(pollConvRef.current)
            return
        }
        pollConvRef.current = setInterval(() => loadConversations(), 15_000)
        return () => { if (pollConvRef.current) clearInterval(pollConvRef.current) }
    }, [activeConv?.id, loadConversations])

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

    useEffect(() => {
        loadConversations(true)
        setUnreadChatCount(0)
    }, [loadConversations])

    // Auto-open conversation if navigated from a notification
    useEffect(() => {
        if (!open || !conversations.length) return
        const targetId = Number(open)
        const conv = conversations.find(c => c.id === targetId)
        if (conv && !activeConv) openConversation(conv)
    }, [open, conversations])

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
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            Alert.alert('Error', msg ?? 'Failed to send message.')
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
        try {
            const res = await apiGetMembersForChat()
            setMembers(res.data?.data?.members ?? [])
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            Alert.alert('Could not load members', msg ?? 'Check your connection and try again.')
        }
    }, [])

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
            if (!conv) {
                Alert.alert('Error', 'Server returned an unexpected response. Please try again.')
                return
            }
            closeNewChat()
            setConversations(prev => {
                const exists = prev.find(c => c.id === conv.id)
                if (exists) return prev
                return [conv, ...prev]
            })
            openConversation(conv)
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

                            <ScrollView style={s.memberScroll} keyboardShouldPersistTaps="handled">
                                {filteredMembers.length === 0 && (
                                    <Text style={s.memberEmpty}>
                                        {members.length === 0 ? 'Loading members…' : 'No members found'}
                                    </Text>
                                )}
                                {filteredMembers.map(m => {
                                    const sel = selectedMembers.includes(m.id)
                                    return (
                                        <Pressable
                                            key={m.id}
                                            style={({ pressed }) => [s.memberRow, sel && s.memberRowSel, pressed && { opacity: 0.65 }]}
                                            onPress={() => toggleMember(m.id)}
                                        >
                                            <Avatar name={m.name} avatar={m.avatar_url ?? m.avatar} size={38} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.memberName}>{m.name}</Text>
                                                {m.role_name && <Text style={s.memberRole}>{m.role_name}</Text>}
                                            </View>
                                            <View style={[s.checkCircle, sel && s.checkCircleSel]}>
                                                {sel && <Ionicons name="checkmark" size={13} color="#fff" />}
                                            </View>
                                        </Pressable>
                                    )
                                })}
                            </ScrollView>

                            <Pressable
                                style={({ pressed }) => [
                                    s.submitBtn,
                                    (creating || selectedMembers.length === 0) && { opacity: 0.5 },
                                    pressed && { opacity: 0.8 },
                                ]}
                                onPress={handleStartChat}
                                disabled={creating || selectedMembers.length === 0}
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
                            </Pressable>
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
                <Pressable
                    style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.5 }]}
                    onPress={closeConversation}
                >
                    <Ionicons name="arrow-back" size={22} color="#111" />
                </Pressable>
                <Avatar name={activeConv.name} avatar={activeConv.avatar} size={38} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.threadName} numberOfLines={1}>{activeConv.name}</Text>
                    <Text style={s.threadSub}>
                        {activeConv.type === 'group'
                            ? `${activeConv.members.length} members`
                            : 'Direct message'}
                    </Text>
                </View>
            </View>

            {/* lift content above keyboard; subtract insets.bottom because kbHeight includes nav bar */}
            <View style={{ flex: 1, paddingBottom: kbHeight > 0 ? Math.max(0, kbHeight - insets.bottom - 24) : 0 }}>
                {msgLoading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color="#8b5cf6" />
                    </View>
                ) : (
                    <FlatList
                        ref={listRef}
                        data={messages}
                        keyExtractor={item => String(item.id)}
                        renderItem={renderMsg}
                        contentContainerStyle={s.msgList}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
                        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
                        ListEmptyComponent={
                            <View style={s.emptyWrap}>
                                <View style={s.emptyIconWrap}>
                                    <Ionicons name="chatbubbles-outline" size={32} color="#ccc" />
                                </View>
                                <Text style={s.emptyTitle}>No messages yet</Text>
                                <Text style={s.emptySubtitle}>Say hello! 👋</Text>
                            </View>
                        }
                    />
                )}

                {/* Input bar */}
                {hasChatWrite && (
                    <View style={[s.inputBar, { paddingBottom: kbHeight > 0 ? 2 : Math.max(insets.bottom, 10) }]}>
                        <TextInput
                            style={s.msgInput}
                            placeholder="Type a message…"
                            placeholderTextColor="#c0c0c0"
                            value={draft}
                            onChangeText={setDraft}
                            multiline
                            maxLength={5000}
                            returnKeyType="default"
                            blurOnSubmit={false}
                            textAlignVertical="top"
                        />
                        <Pressable
                            style={({ pressed }) => [
                                s.sendBtn,
                                (!draft.trim() || sending) && s.sendBtnOff,
                                pressed && draft.trim() && { opacity: 0.75 },
                            ]}
                            onPress={sendMessage}
                            disabled={!draft.trim() || sending}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            {sending
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Ionicons name="send" size={18} color="#fff" />
                            }
                        </Pressable>
                    </View>
                )}
            </View>
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
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 12, paddingVertical: 10,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
        minHeight: 56,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    threadName: { fontSize: 16, fontWeight: '700', color: '#111' },
    threadSub:  { fontSize: 12, color: '#999', marginTop: 1 },

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
    msgList: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 8 },
    msgWrap:     { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 6 },
    msgWrapMine: { flexDirection: 'row-reverse' },
    msgAvatar:   { width: 32, alignItems: 'center' },
    bubble: {
        maxWidth: '78%', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
    },
    bubbleOther:    { backgroundColor: '#f0f0f0', borderBottomLeftRadius: 4 },
    bubbleMine:     { backgroundColor: '#8b5cf6', borderBottomRightRadius: 4 },
    senderName:     { fontSize: 11, fontWeight: '700', color: '#7c3aed', marginBottom: 3 },
    bubbleText:     { fontSize: 15, color: '#111', lineHeight: 21 },
    bubbleTextMine: { color: '#fff' },
    bubbleTime:     { fontSize: 10, color: '#999', marginTop: 4, textAlign: 'right' },
    bubbleTimeMine: { color: '#ffffff70' },
    attachWrap:  { gap: 4, marginTop: 4 },
    attachItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
    attachName:  { fontSize: 12, color: '#555', flex: 1 },

    /* Input bar */
    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end', gap: 8,
        paddingHorizontal: 12, paddingTop: 8,
        backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#ececec',
    },
    msgInput: {
        flex: 1, backgroundColor: '#f5f5f5', borderRadius: 22,
        paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11,
        fontSize: 15, color: '#111',
        maxHeight: 130, minHeight: 44,
        textAlignVertical: 'top',
    },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center', marginBottom: 0 },
    sendBtnOff: { backgroundColor: '#c4b5fd' },

    /* Empty */
    emptyWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
    emptyIconWrap:{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
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
    memberScroll: { maxHeight: SH * 0.38, marginTop: 10 },
    memberEmpty:  { textAlign: 'center', color: '#aaa', fontSize: 14, paddingVertical: 24 },
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
