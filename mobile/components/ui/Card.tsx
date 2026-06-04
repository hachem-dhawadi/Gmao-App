import { View, StyleSheet, ViewStyle } from 'react-native'
import { Colors } from '@/constants/colors'

type Props = {
    children: React.ReactNode
    style?: ViewStyle
    padding?: number
}

export default function Card({ children, style, padding = 16 }: Props) {
    return (
        <View style={[styles.card, { padding }, style]}>
            {children}
        </View>
    )
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.white,
        borderRadius:    16,
        borderWidth:     1,
        borderColor:     Colors.gray200,
        shadowColor:     '#000',
        shadowOffset:    { width: 0, height: 1 },
        shadowOpacity:   0.04,
        shadowRadius:    4,
        elevation:       2,
    },
})
