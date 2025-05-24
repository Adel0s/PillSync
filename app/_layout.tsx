import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthProvider";
import { useNotifications } from "../hooks/useNotifications";

// acest component simplu pornește useNotifications() o singură dată
function NotificationLoader() {
  useNotifications();
  return null;
}

export default function Layout() {
  return (
    <AuthProvider>
      <NotificationLoader />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="home" />
        <Stack.Screen name="(profile)/index" />
        <Stack.Screen name="(profile)/change-email" />
        <Stack.Screen name="(profile)/change-password" />
        <Stack.Screen name="(profile)/confirm-change-email" />
        <Stack.Screen name="(add_medication)/index" />
        <Stack.Screen name="(add_medication)/manual_add" />
        <Stack.Screen name="(add_medication)/schedule" />
        <Stack.Screen name="refill_tracker/index" />
        <Stack.Screen name="refill_tracker/[id]/index" />
        <Stack.Screen name="refill_tracker/[id]/inventory" />
        <Stack.Screen name="refill_tracker/[id]/schedule_pill_list" />
        <Stack.Screen name="(calendar_view)/index" />
        <Stack.Screen
          name="pill_interactions"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="reset_password" />
      </Stack>
    </AuthProvider>
  );
}
