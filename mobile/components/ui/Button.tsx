import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { Colors } from '@/constants/colors'

type Variant = 'solid' | 'outline' | 'plain'
type Size    = 'sm' | 'md' | 'lg'

type Props = {
    children: string
    onPress?: () => void
    variant?: Variant
    size?: Size
    loading?: boolean
    disabled?: boolean
    color?: string
    style?: ViewStyle
    textStyle?: TextStyle
    block?: boolean
}

export default function Button({
    children,
    onPress,
    variant = 'solid',
    size = 'md',
    loading = false,
    disabled = false,
    color = Colors.primary,
    style,
    textStyle,
    block = false,
}: Props) {
    const isDisabled = disabled || loading

    const containerStyle: ViewStyle = {
        ...styles.base,
        ...sizeStyles[size].container,
        ...(block ? { width: '100%' } : {}),
        ...(variant === 'solid'   ? { backgroundColor: color, borderColor: color } : {}),
        ...(variant === 'outline' ? { backgroundColor: 'transparent', borderColor: color, borderWidth: 1.5 } : {}),
        ...(variant === 'plain'   ? { backgroundColor: 'transparent', borderColor: 'transparent' } : {}),
        ...(isDisabled ? { opacity: 0.5 } : {}),
        ...style,
    }

    const labelStyle: TextStyle = {
        ...styles.label,
        ...sizeStyles[size].text,
        color: variant === 'solid' ? '#fff' : color,
        ...textStyle,
    }

    return (
        <TouchableOpacity
            style={containerStyle}
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.75}
        >
            {loading
                ? <ActivityIndicator size="small" color={variant === 'solid' ? '#fff' : color} />
                : <Text style={labelStyle}>{children}</Text>
            }
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    base: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'center',
        borderRadius:   10,
        borderWidth:    0,
    },
    label: {
        fontWeight: '600',
    },
})

const sizeStyles = {
    sm: { container: { paddingHorizontal: 12, paddingVertical: 7  }, text: { fontSize: 13 } },
    md: { container: { paddingHorizontal: 18, paddingVertical: 11 }, text: { fontSize: 14 } },
    lg: { container: { paddingHorizontal: 24, paddingVertical: 14 }, text: { fontSize: 16 } },
}
