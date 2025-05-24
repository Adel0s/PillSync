import React, { useEffect, useState } from 'react'
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'

export default function ConfirmChangeEmail() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Aici nu mai ai nevoie de niciun apel la supabase.auth.verifyOtp()
        // Link-ul din mail deja a validat totul server-side.
        // Așteaptă câteva zeci de milisecunde să preia sesiunea (autoRefreshToken)
        setTimeout(() => {
            setLoading(false)
        }, 500)
    }, [])

    const handleOk = () => {
        router.replace('/(profile)')
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.message}>
                Email-ul tău a fost confirmat cu succes!
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleOk}>
                <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        backgroundColor: '#f9f9f9',
    },
    message: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 30,
        color: '#03045e',
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignSelf: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
})
