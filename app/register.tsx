import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
    Image,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import logo from "../assets/images/logo.png";

import styles from "./Register.styles";
import { COLORS } from "../styles/colors";

export default function Register() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [role, setRole] = useState<"patient" | "doctor">("patient");
    const [licenseNumber, setLicenseNumber] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [dob, setDob] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [phone, setPhone] = useState("");
    const [showPassword, setShowPassword] = useState(false);
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
            colors={[
                COLORS.veryLight,
                COLORS.light,
                COLORS.secondary,
                COLORS.primary,
                COLORS.primaryDark,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                style={{ backgroundColor: "transparent" }}
            >
                <View style={styles.container}>
                    <Image source={logo} style={styles.logo} resizeMode="contain" />
                    <Text style={styles.header}>Create Account</Text>

                    <View style={styles.card}>
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor={COLORS.primary}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor={COLORS.primary}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <View style={styles.roleContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.roleButton,
                                    role === "patient" && styles.selectedRole,
                                ]}
                                onPress={() => setRole("patient")}
                            >
                                <Text
                                    style={[
                                        styles.roleText,
                                        role === "patient" && styles.selectedRoleText,
                                    ]}
                                >
                                    Patient
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.roleButton,
                                    role === "doctor" && styles.selectedRole,
                                ]}
                                onPress={() => setRole("doctor")}
                            >
                                <Text
                                    style={[
                                        styles.roleText,
                                        role === "doctor" && styles.selectedRoleText,
                                    ]}
                                >
                                    Doctor
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {role === "doctor" && (
                            <TextInput
                                style={styles.input}
                                placeholder="License Number"
                                placeholderTextColor={COLORS.primary}
                                value={licenseNumber}
                                onChangeText={setLicenseNumber}
                                autoCapitalize="none"
                            />
                        )}

                        <TouchableOpacity
                            onPress={() => setShowDatePicker(true)}
                            style={styles.input}
                        >
                            <Text
                                style={
                                    !dob
                                        ? styles.placeholderText
                                        : styles.inputText
                                }
                            >
                                {dob
                                    ? dob.toLocaleDateString()
                                    : "Select Date of Birth"}
                            </Text>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={dob || new Date(2000, 0, 1)}
                                mode="date"
                                display="default"
                                onChange={(_, selected) => {
                                    setShowDatePicker(false);
                                    if (selected) setDob(selected);
                                }}
                            />
                        )}

                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            placeholderTextColor={COLORS.primary}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />

                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Password"
                                placeholderTextColor={COLORS.primary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.icon}
                            >
                                <Ionicons
                                    name={showPassword ? "eye" : "eye-off"}
                                    size={24}
                                    color={COLORS.primary}
                                />
                            </TouchableOpacity>
                        </View>

                        {error && <Text style={styles.error}>{error}</Text>}

                        <TouchableOpacity
                            style={styles.registerButton}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            <Text style={styles.registerButtonText}>
                                {loading ? "Signing up..." : "Sign Up"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => router.push("/login")}>
                        <Text style={styles.footerText}>
                            Already have an account? Login here
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </LinearGradient>
    );
}
