import { useState } from 'react'
import { View, TextInput, Text, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'

type Props = TextInputProps & {
    label?: string
    error?: string
    leftIcon?: React.ReactNode
    password?: boolean
}

export default function Input({ label, error, leftIcon, password, style, ...props }: Props) {
    const [show, setShow] = useState(false)
    const [focused, setFocused] = useState(false)

    return (
        <View style={styles.wrapper}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[
                styles.container,
                focused && styles.focused,
                !!error && styles.errored,
            ]}>
                {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
                <TextInput
                    style={[styles.input, leftIcon ? { paddingLeft: 0 } : {}, style as object]}
                    placeholderTextColor={Colors.gray400}
                    secureTextEntry={password && !show}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    {...props}
                />
                {password && (
                    <TouchableOpacity style={styles.iconRight} onPress={() => setShow((v) => !v)}>
                        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.gray400} />
                    </TouchableOpacity>
                )}
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    )
}

const styles = StyleSheet.create({
    wrapper: { marginBottom: 16 },
    label: {
        fontSize:     13,
        fontWeight:   '600',
        color:        Colors.gray700,
        marginBottom: 6,
    },
    container: {
        flexDirection:   'row',
        alignItems:      'center',
        backgroundColor: Colors.gray50,
        borderWidth:     1.5,
        borderColor:     Colors.gray200,
        borderRadius:    10,
        paddingHorizontal: 14,
    },
    focused: { borderColor: Colors.primary, backgroundColor: Colors.white },
    errored: { borderColor: Colors.error },
    input: {
        flex:       1,
        fontSize:   14,
        color:      Colors.gray900,
        paddingVertical: 13,
    },
    iconLeft:  { marginRight: 8 },
    iconRight: { marginLeft:  8 },
    error: {
        fontSize:  12,
        color:     Colors.error,
        marginTop: 4,
    },
})
