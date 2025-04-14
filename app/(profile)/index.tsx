import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "react-native-ui-lib";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer'

const calculateAge = (dobString: string) => {
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const getInitials = (name: string) => {
    if (!name) return "";
    const names = name.trim().split(" ");
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

const Profile = () => {
    const router = useRouter();
    const { user } = useAuth();

    // Editable fields and avatar URI
    const [editableName, setEditableName] = useState("");
    const [editablePhone, setEditablePhone] = useState("");
    const [avatarUri, setAvatarUri] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setEditableName(user.user_metadata?.full_name || "");
            setEditablePhone(user.user_metadata?.phone_number || "");
            // Optionally, load the avatar from user metadata:
            setAvatarUri(user.user_metadata?.avatar_url || null);
        }
    }, [user]);

    if (!user) {
        return null;
    }

    const email = user.email || "";
    const dob = user.user_metadata?.date_of_birth || "";
    const role = user.user_metadata?.role || "";
    const age = dob ? calculateAge(dob).toString() : "";

    const uploadAvatar = async (uri: string) => {
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            // Extract file extension (default to jpg)
            const fileExt = uri.split('.').pop() || "jpg";
            const fileName = `${user.id}-${new Date().getTime()}.${fileExt}`;
            console.log("File name :", fileName);
            const { data, error } = await supabase.storage.from("avatars").upload(fileName, decode(base64), {
                cacheControl: "3600",
                upsert: true,
            });
            if (error) {
                Alert.alert("Upload Error", error.message);
                console.log("Upload Error :", error);
                return null;
            }
            const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(fileName);
            return publicData.publicUrl;
        } catch (err) {
            Alert.alert("Upload Error", "There was an error uploading your avatar.");
            console.error("Error uploading avatar:", err);
            return null;
        }
    };

    // When user taps on the avatar, pick a new image and upload it
    const handlePickAvatar = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert("Permission Required", "Permission to access media library is required!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            console.log("ImagePicker result:", result.assets[0].uri);
            const publicUrl = await uploadAvatar(result.assets[0].uri);
            if (publicUrl) {
                setAvatarUri(publicUrl);
                // Update user metadata with the new avatar URL
                const { error } = await supabase.auth.updateUser({
                    data: { avatar_url: publicUrl },
                });
                if (error) {
                    Alert.alert("Update Failed", error.message);
                } else {
                    Alert.alert("Avatar updated successfully!");
                }
            }
        }
    };

    const handleSignOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("Error signing out:", error.message);
            } else {
                console.log("User signed out");
            }
        } catch (err) {
            console.error("Unexpected error:", err);
        }
    };

    const handleUpdateProfile = async () => {
        const { error } = await supabase.auth.updateUser({
            data: {
                full_name: editableName,
                phone_number: editablePhone,
                // Optionally, the avatar URL is updated in handlePickAvatar.
            },
        });
        if (error) {
            Alert.alert("Update Failed", error.message);
        } else {
            Alert.alert("Profile updated successfully!");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header with Back Button */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.push("/home")}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>
                {/* Top Section with Avatar */}
                <View style={styles.topSection}>
                    <Avatar
                        size={90}
                        source={avatarUri ? { uri: avatarUri } : undefined}
                        label={!avatarUri ? getInitials(editableName) : undefined}
                        containerStyle={styles.avatar}
                        onPress={handlePickAvatar}
                    />
                    <Text style={styles.displayName}>{editableName}</Text>
                    <Text style={styles.displayEmail}>{email}</Text>
                </View>

                {/* Profile Details */}
                <View style={styles.detailsContainer}>
                    {/* Editable Name */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Name</Text>
                        <View style={styles.fieldBox}>
                            <TextInput
                                style={[styles.fieldInput]}
                                value={editableName}
                                onChangeText={setEditableName}
                                placeholder="Full Name"
                                placeholderTextColor="#666"
                            />
                            <Ionicons name="pencil-outline" size={18} color="#0077b6" />
                        </View>
                    </View>

                    {/* Editable Phone */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Phone Number</Text>
                        <View style={styles.fieldBox}>
                            <TextInput
                                style={[styles.fieldInput]}
                                value={editablePhone}
                                onChangeText={setEditablePhone}
                                placeholder="Phone Number"
                                placeholderTextColor="#666"
                                keyboardType="phone-pad"
                            />
                            <Ionicons name="pencil-outline" size={18} color="#0077b6" />
                        </View>
                    </View>

                    {/* Read-Only Email */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Email</Text>
                        <View style={[styles.fieldBox, styles.fieldReadOnly]}>
                            <TextInput
                                style={styles.fieldInput}
                                value={email}
                                editable={false}
                            />
                        </View>
                    </View>

                    {/* Read-Only Role */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Role</Text>
                        <View style={[styles.fieldBox, styles.fieldReadOnly]}>
                            <TextInput
                                style={[styles.fieldInput, styles.fieldReadOnly]}
                                value={role}
                                editable={false}
                            />
                        </View>
                    </View>

                    {/* Read-Only Date of Birth */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Date of Birth</Text>
                        <View style={[styles.fieldBox, styles.fieldReadOnly]}>
                            <TextInput
                                style={[styles.fieldInput, styles.fieldReadOnly]}
                                value={dob}
                                editable={false}
                            />
                        </View>
                    </View>

                    {/* Read-Only Age */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Age</Text>
                        <View style={[styles.fieldBox, styles.fieldReadOnly]}>
                            <TextInput
                                style={[styles.fieldInput, styles.fieldReadOnly]}
                                value={age}
                                editable={false}
                            />
                        </View>
                    </View>
                </View>

                {/* Save Changes Button */}
                <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>

                {/* Additional Buttons */}
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity style={styles.commonButton} onPress={() => router.push("/settings")}>
                        <Ionicons name="settings-outline" size={20} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Settings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.commonButton} onPress={handleSignOut}>
                        <Ionicons name="log-out-outline" size={20} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f9f9f9",
    },
    scrollContainer: {
        paddingHorizontal: 16,
        paddingBottom: 30,
        flexGrow: 1,
    },
    /* Header */
    header: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#03045e",
        padding: 16,
    },
    backButton: {
        marginRight: 8,
    },
    headerTitle: {
        flex: 1,
        textAlign: "left",
        fontSize: 22,
        fontWeight: "bold",
        color: "#fff",
    },
    /* Top Section */
    topSection: {
        alignItems: "center",
        marginVertical: 20,
    },
    avatar: {
        borderRadius: 45,
        marginBottom: 10,
    },
    displayName: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#03045e",
        marginBottom: 4,
    },
    displayEmail: {
        fontSize: 14,
        color: "#555",
    },
    /* Details Container */
    detailsContainer: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#90e0ef",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    fieldGroup: {
        marginBottom: 12,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#03045e",
        marginBottom: 4,
    },
    fieldBox: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#90e0ef",
        borderRadius: 8,
        paddingHorizontal: 10,
        backgroundColor: "#fff",
    },
    fieldInput: {
        flex: 1,
        height: 40,
        fontSize: 14,
        color: "#03045e",
    },
    fieldReadOnly: {
        backgroundColor: "#e0e0e0",
    },
    /* Save Changes Button */
    saveButton: {
        backgroundColor: "#0077b6",
        borderRadius: 25,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignSelf: "center",
        marginBottom: 20,
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    /* Bottom Buttons */
    buttonsContainer: {
        alignItems: "center",
        marginBottom: 20,
    },
    commonButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#0077b6",
        borderRadius: 25,
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginBottom: 12,
        width: "80%",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default Profile;