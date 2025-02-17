import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    Image,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import logo from "../assets/images/logo.png";

const Register = () => {
    const router = useRouter();
    const [name, setName] = useState("");
    const [role, setRole] = useState<"patient" | "doctor">("patient");
    const [licenseNumber, setLicenseNumber] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [dob, setDob] = useState<Date | null>(null);
    const [phone, setPhone] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

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

        const metadata: any = {
            full_name: name,
            date_of_birth: formattedDob,
            phone_number: phone,
            role: role,
        };
        if (role === "doctor") {
            metadata.license_number = licenseNumber;
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata },
        });

        if (error) {
            setError(error.message);
            console.log("Error registering:", error);
        } else {
            Alert.alert(
                "Registration successful!",
                role === "doctor"
                    ? "Your account will be verified by an administrator."
                    : "You can now log in to your account."
            );
            router.push("/home");
        }
        setLoading(false);
    };

    return (
        <LinearGradient
            colors={["#caf0f8", "#90e0ef", "#00b4d8", "#0077b6", "#03045e"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer} style={{ backgroundColor: "transparent" }}>
                <View style={styles.container}>
                    <Image source={logo} style={styles.logo} resizeMode="contain" />
                    <Text style={styles.header}>Create Account</Text>
                    <View style={styles.card}>
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor="#0077b6"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#0077b6"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <View style={styles.roleContainer}>
                            <TouchableOpacity
                                style={[styles.roleButton, role === "patient" && styles.selectedRole]}
                                onPress={() => setRole("patient")}
                            >
                                <Text style={[styles.roleText, role === "patient" && styles.selectedRoleText]}>
                                    Patient
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.roleButton, role === "doctor" && styles.selectedRole]}
                                onPress={() => setRole("doctor")}
                            >
                                <Text style={[styles.roleText, role === "doctor" && styles.selectedRoleText]}>
                                    Doctor
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {role === "doctor" && (
                            <TextInput
                                style={styles.input}
                                placeholder="License Number"
                                placeholderTextColor="#0077b6"
                                value={licenseNumber}
                                onChangeText={setLicenseNumber}
                                autoCapitalize="none"
                            />
                        )}
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
                            <Text style={!dob ? styles.placeholderText : styles.inputText}>
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
                                        const localDate = new Date(
                                            selectedDate.getFullYear(),
                                            selectedDate.getMonth(),
                                            selectedDate.getDate()
                                        );
                                        setDob(localDate);
                                    }
                                }}
                            />
                        )}
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            placeholderTextColor="#0077b6"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Password"
                                placeholderTextColor="#0077b6"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.icon}>
                                <Ionicons name={showPassword ? "eye" : "eye-off"} size={24} color="#0077b6" />
                            </TouchableOpacity>
                        </View>
                        {error && <Text style={styles.error}>{error}</Text>}
                        <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
                            <Text style={styles.registerButtonText}>
                                {loading ? "Signing up..." : "Sign Up"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => router.push("/login")}>
                        <Text style={styles.footerText}>Already have an account? Login here</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        padding: 16,
        justifyContent: "center",
    },
    container: {
        alignItems: "center",
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 16,
    },
    header: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 24,
        color: "#03045e",
    },
    card: {
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 20,
    },
    input: {
        height: 48,
        borderColor: "#00b4d8",
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 16,
        paddingHorizontal: 12,
        backgroundColor: "#f9f9f9",
    },
    placeholderText: {
        fontSize: 16,
        color: "#0077b6",
    },
    inputText: {
        fontSize: 16,
        color: "#333",
    },
    roleContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 16,
    },
    roleButton: {
        flex: 1,
        paddingVertical: 12,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        backgroundColor: "#f9f9f9",
        alignItems: "center",
    },
    selectedRole: {
        backgroundColor: "#0077b6",
        borderColor: "#0077b6",
    },
    roleText: {
        fontSize: 16,
        color: "#333",
    },
    selectedRoleText: {
        color: "#fff",
        fontWeight: "bold",
    },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderColor: "#00b4d8",
        borderWidth: 1,
        borderRadius: 8,
        backgroundColor: "#f9f9f9",
        marginBottom: 16,
        paddingHorizontal: 12,
    },
    passwordInput: {
        flex: 1,
        height: 48,
    },
    icon: {
        padding: 8,
    },
    error: {
        color: "red",
        textAlign: "center",
        marginBottom: 16,
    },
    registerButton: {
        backgroundColor: "#0077b6",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
    },
    registerButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    footerText: {
        fontSize: 16,
        color: "#caf0f8",
        textAlign: "center",
        textDecorationLine: "underline",
    },
});

export default Register;
