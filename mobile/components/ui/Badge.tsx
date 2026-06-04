import { View, Text, StyleSheet } from 'react-native'
import { StatusColors, PriorityColors } from '@/constants/colors'

type Props = {
    label: string
    type?: 'status' | 'priority' | 'custom'
    value?: string
    bg?: string
    color?: string
}

export default function Badge({ label, type, value, bg, color }: Props) {
    let bgColor  = bg    ?? '#f5f5f5'
    let txtColor = color ?? '#737373'

    if (type === 'status' && value && StatusColors[value]) {
        bgColor  = StatusColors[value].bg
        txtColor = StatusColors[value].text
    } else if (type === 'priority' && value && PriorityColors[value]) {
        bgColor  = PriorityColors[value].bg
        txtColor = PriorityColors[value].text
    }

    return (
        <View style={[styles.badge, { backgroundColor: bgColor }]}>
            <Text style={[styles.text, { color: txtColor }]}>{label}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 8,
        paddingVertical:   3,
        borderRadius:      20,
        alignSelf:         'flex-start',
    },
    text: {
        fontSize:   12,
        fontWeight: '600',
    },
})
