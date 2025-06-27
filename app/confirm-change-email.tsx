import React, { useEffect, useState } from 'react'
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '../lib/supabase'

type Params = { token?: string }

export default function ConfirmChangeEmail() {
    const router = useRouter()
    const { token } = useLocalSearchParams<Params>()
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        (async () => {
            try {
                if (!token) throw new Error('Confirmation token is missing.')
                // on click server-side, the email is updated in the database. 
                // This will update the session with the new token and the new email in the payload.
                const { data, error } = await supabase.auth.refreshSession()
                if (error) throw error
                // can also check the updated email from data.session.user.email
            } catch (err: any) {
                setErrorMsg(err.message)
            } finally {
                setLoading(false)
            }
        })()
    }, [token])

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

    if (errorMsg) {
        Alert.alert('Confirmation error', errorMsg)
        router.replace('/(profile)')
        return null
    }

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.message}>Your email has been successfully confirmed!</Text>
            <TouchableOpacity style={styles.button} onPress={handleOk}>
                <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: {
        flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#f9f9f9',
    },
    message: {
        fontSize: 18, textAlign: 'center', marginBottom: 30, color: '#03045e',
    },
    button: {
        backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 24,
        borderRadius: 8, alignSelf: 'center',
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
