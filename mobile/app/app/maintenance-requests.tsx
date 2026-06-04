import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

export default function MaintenanceRequestsScreen() {
    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <Text style={s.headerTitle}>Requests</Text>
            </View>
            <View style={s.wrap}>
                <View style={s.iconBox}>
                    <Ionicons name="construct-outline" size={36} color="#f97316" />
                </View>
                <Text style={s.title}>Maintenance Requests — Coming Soon</Text>
                <Text style={s.body}>
                    Submit and track maintenance requests from the field.
                    This feature is currently available on the web app and is coming
                    to mobile in the next update.
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
        backgroundColor: '#fff7ed',
        alignItems:      'center',
        justifyContent:  'center',
    },
    title: { fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' },
    body:  { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 },
})
