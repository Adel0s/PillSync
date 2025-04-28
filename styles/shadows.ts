// styles/shadows.ts
import { Platform } from "react-native";

export const SHADOW = Platform.select({
    ios: {
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
    },
    android: {
        elevation: 5,
    },
});
