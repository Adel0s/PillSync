import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthProvider";

export default function Layout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="home" />
        <Stack.Screen name="profile" />
      </Stack>
    </AuthProvider>
  );
}
