import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'

export default function LandingScreen() {
    return (
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>

            <View style={s.center}>
                {/* Logo */}
                <Image
                    source={require('@/assets/cmms_Logo.png')}
                    style={s.logo}
                    resizeMode="contain"
                />
                <Text style={s.appName}>CMMS</Text>
                <Text style={s.subtitle}>
                    Your maintenance platform{'\n'}for the field and beyond.
                </Text>

                {/* Buttons */}
                <View style={s.actions}>
                    <TouchableOpacity
                        style={s.btnPrimary}
                        activeOpacity={0.85}
                        onPress={() => router.push('/auth/sign-up')}
                    >
                        <Text style={s.btnPrimaryText}>Create an account</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={s.btnOutline}
                        activeOpacity={0.75}
                        onPress={() => router.push('/auth/sign-in')}
                    >
                        <Text style={s.btnOutlineText}>Already a member?</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Footer */}
            <View style={s.footer}>
                <Text style={s.footerVersion}>v1.0.0 · 2026</Text>
                <Text style={s.footerBrand}>Made by Tac-Tic</Text>
            </View>

        </SafeAreaView>
    )
}

const s = StyleSheet.create({
    safe: {
        flex:              1,
        backgroundColor:   '#ffffff',
        paddingHorizontal: 32,
    },

    /* Center */
    center: {
        flex:           1,
        alignItems:     'center',
        justifyContent: 'center',
        width:          '100%',
    },
    logo: {
        width:        100,
        height:       100,
        marginBottom: 24,
    },
    appName: {
        fontSize:      34,
        fontWeight:    '900',
        color:         '#111111',
        letterSpacing: 6,
        marginBottom:  10,
    },
    subtitle: {
        fontSize:     15,
        color:        '#888888',
        textAlign:    'center',
        lineHeight:   22,
        marginBottom: 48,
    },

    /* Buttons */
    actions: {
        width: '100%',
        gap:   12,
    },
    btnPrimary: {
        height:          56,
        backgroundColor: '#111111',
        borderRadius:    16,
        alignItems:      'center',
        justifyContent:  'center',
    },
    btnPrimaryText: {
        color:      '#ffffff',
        fontSize:   16,
        fontWeight: '700',
    },
    btnOutline: {
        height:          56,
        borderRadius:    16,
        borderWidth:     1.5,
        borderColor:     '#e0e0e0',
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: '#ffffff',
    },
    btnOutlineText: {
        color:      '#111111',
        fontSize:   16,
        fontWeight: '600',
    },

    /* Footer */
    footer: {
        alignItems:    'center',
        paddingBottom: 8,
        gap:           2,
    },
    footerVersion: { fontSize: 11, color: '#ccc', fontWeight: '500' },
    footerBrand:   { fontSize: 11, color: '#bbb', fontWeight: '600', letterSpacing: 0.5 },
})
