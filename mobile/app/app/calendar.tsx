import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

export default function CalendarScreen() {
    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <Text style={s.headerTitle}>Calendar</Text>
            </View>
            <View style={s.wrap}>
                <View style={s.iconBox}>
                    <Ionicons name="calendar-number-outline" size={36} color="#0ea5e9" />
                </View>
                <Text style={s.title}>Calendar — Coming Soon</Text>
                <Text style={s.body}>
                    Schedule view, upcoming work orders, and PM due dates are available
                    on the web app. Mobile calendar is coming in the next update.
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
        width:           72,
        height:          72,
        borderRadius:    20,
        backgroundColor: '#f0f9ff',
        alignItems:      'center',
        justifyContent:  'center',
    },
    title: { fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' },
    body:  { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 },
})
