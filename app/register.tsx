import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import {
    View,
    Text,
    TextInput,
    Button,
    Alert,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

const Register = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [dob, setDob] = useState<Date | null>(null);
    const [phone, setPhone] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async () => {
        setLoading(true);
        setError(null);

        if (!dob) {
            setError("Please select your date of birth.");
            setLoading(false);
            return;
        }

        const formattedDob = `${dob.getFullYear()}-${(dob.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${dob.getDate().toString().padStart(2, "0")}`;

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    date_of_birth: formattedDob,
                    phone_number: phone,
                },
            },
        });

        if (error) {
            setError(error.message);
            console.log("Error registering:", error);
        } else {
            Alert.alert("Registration successful!", "Please check your email to confirm your account.");
            router.push("/home");
        }

        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Register</Text>

            <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
            />

            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
            />

            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateInput}>
                <Text style={[styles.dateText, !dob && styles.placeholderText]}>
                    {dob ? dob.toLocaleDateString() : "Select Date of Birth"}
                </Text>
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker
                    value={dob || new Date(2000, 0, 1)}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                            const localDate = new Date(selectedDate);
                            setDob(localDate);
                        }
                    }}
                />
            )}

            <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
            />

            <View style={styles.passwordContainer}>
                <TextInput
                    style={styles.passwordInput}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.icon}>
                    <Ionicons name={showPassword ? "eye" : "eye-off"} size={24} color="gray" />
                </TouchableOpacity>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}
            <Button title={loading ? "Registering..." : "Register"} onPress={handleRegister} disabled={loading} />
            {loading && <ActivityIndicator size="small" color="#0000ff" />}

            <Text style={styles.link}>
                Already have an account?{" "}
                <Text onPress={() => router.push("/login")} style={styles.linkText}>
                    Login here
                </Text>
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 16,
    },
    title: {
        fontSize: 24,
        marginBottom: 16,
        textAlign: "center",
    },
    input: {
        height: 40,
        borderColor: "gray",
        borderWidth: 1,
        marginBottom: 12,
        paddingHorizontal: 8,
        borderRadius: 5,
    },
    dateInput: {
        height: 40,
        borderColor: "gray",
        borderWidth: 1,
        marginBottom: 12,
        paddingHorizontal: 8,
        borderRadius: 5,
        justifyContent: "center",
    },
    dateText: {
        fontSize: 16,
        color: "black",
    },
    placeholderText: {
        color: "gray",
    },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "gray",
        borderRadius: 5,
        marginBottom: 12,
        paddingHorizontal: 8,
    },
    passwordInput: {
        flex: 1,
        height: 40,
    },
    icon: {
        padding: 8,
    },
    error: {
        color: "red",
        marginBottom: 12,
        textAlign: "center",
    },
    link: {
        marginTop: 16,
        textAlign: "center",
    },
    linkText: {
        color: "blue",
    },
});

export default Register;
