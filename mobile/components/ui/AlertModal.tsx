import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

type Props = {
    visible:  boolean
    title:    string
    message:  string
    type?:    'error' | 'success' | 'info'
    btnLabel?: string
    onClose:  () => void
}

const icons = {
    error:   { name: 'close-circle',     color: '#ff6a55' },
    success: { name: 'checkmark-circle', color: '#22c55e' },
    info:    { name: 'information-circle', color: '#111'  },
} as const

export default function AlertModal({ visible, title, message, type = 'info', btnLabel = 'OK', onClose }: Props) {
    const icon = icons[type]

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={s.overlay}>
                <View style={s.card}>
                    <View style={[s.iconWrap, { backgroundColor: icon.color + '18' }]}>
                        <Ionicons name={icon.name as never} size={32} color={icon.color} />
                    </View>

                    <Text style={s.title}>{title}</Text>
                    <Text style={s.message}>{message}</Text>

                    <TouchableOpacity style={s.btn} onPress={onClose} activeOpacity={0.85}>
                        <Text style={s.btnText}>{btnLabel}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    )
}

const s = StyleSheet.create({
    overlay: {
        flex:            1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems:      'center',
        justifyContent:  'center',
        paddingHorizontal: 32,
    },
    card: {
        width:           '100%',
        backgroundColor: '#fff',
        borderRadius:    24,
        paddingHorizontal: 28,
        paddingVertical:   32,
        alignItems:      'center',
    },
    iconWrap: {
        width:        64,
        height:       64,
        borderRadius: 20,
        alignItems:   'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize:     18,
        fontWeight:   '800',
        color:        '#111',
        textAlign:    'center',
        marginBottom: 8,
    },
    message: {
        fontSize:     14,
        color:        '#888',
        textAlign:    'center',
        lineHeight:   22,
        marginBottom: 28,
    },
    btn: {
        width:           '100%',
        height:          52,
        backgroundColor: '#111111',
        borderRadius:    14,
        alignItems:      'center',
        justifyContent:  'center',
    },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
