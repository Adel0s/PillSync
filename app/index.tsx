import { View, Text, StyleSheet, Animated, Image } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import logo from "@/assets/images/logo.png";

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 2,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      const checkSession = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          router.replace("/home");
        } else {
          router.replace("/login");
        }
      };
      checkSession();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appName}>PillSync</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#20A0D8",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
  },
  logo: {
    width: 200,
    height: 200,
  },
  appName: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 20,
    letterSpacing: 1,
  },
});
