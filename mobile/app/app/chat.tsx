import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '@/store/authStore'

export default function ChatScreen() {
    const hasChatRead = useAuthStore(s => s.user?.permissions?.includes('chat.read') ?? false)

    if (!hasChatRead) {
        return (
            <SafeAreaView style={s.safe} edges={['top']}>
                <View style={s.wrap}>
                    <View style={s.iconBox}>
                        <Ionicons name="lock-closed-outline" size={32} color="#aaa" />
                    </View>
                    <Text style={s.title}>Access Restricted</Text>
                    <Text style={s.body}>
                        Your role does not have permission to access Chat.
                        Contact your company administrator to request access.
                    </Text>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <Text style={s.headerTitle}>Chat</Text>
            </View>
            <View style={s.wrap}>
                <View style={s.iconBox}>
                    <Ionicons name="chatbubbles-outline" size={36} color="#8b5cf6" />
                </View>
                <Text style={s.title}>Chat — Coming Soon</Text>
                <Text style={s.body}>
                    Real-time team messaging is currently available on the web app.
                    Mobile chat is coming in the next update.
                </Text>
            </View>
        </SafeAreaView>
    )
}

const s = StyleSheet.create({
    safe:   { flex: 1, backgroundColor: '#f5f5f5' },
    header: {
        backgroundColor:   '#fff',
        paddingHorizontal: 20,
        paddingVertical:   16,
        borderBottomWidth: 1,
        borderBottomColor: '#ebebeb',
    },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#111' },
    wrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
    iconBox: {
        width:          72,
        height:         72,
        borderRadius:   20,
        backgroundColor:'#f5f5f5',
        alignItems:     'center',
        justifyContent: 'center',
    },
    title: { fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' },
    body:  { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 },
})
