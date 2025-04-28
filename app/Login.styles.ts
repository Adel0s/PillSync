import { StyleSheet } from "react-native";
import { COLORS } from "../styles/colors";
import { SPACING } from "../styles/spacing";
import { TYPO } from "../styles/typography";
import { SHADOW } from "../styles/shadows";

export default StyleSheet.create({
    gradient: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        padding: SPACING.md,
        justifyContent: "center",
    },
    container: {
        alignItems: "center",
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: SPACING.md,
    },
    header: {
        ...TYPO.h2,
        color: COLORS.primaryDark,
        marginBottom: SPACING.lg,
    },
    card: {
        width: "100%",
        backgroundColor: COLORS.white,
        borderRadius: SPACING.md,
        padding: SPACING.lg,
        ...SHADOW,
        marginBottom: SPACING.lg,
    },
    input: {
        height: 48,
        borderColor: COLORS.secondary,
        borderWidth: 1,
        borderRadius: SPACING.sm,
        marginBottom: SPACING.md,
        paddingHorizontal: SPACING.md,
        backgroundColor: COLORS.background,
    },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderColor: COLORS.secondary,
        borderWidth: 1,
        borderRadius: SPACING.sm,
        backgroundColor: COLORS.background,
        marginBottom: SPACING.md,
        paddingHorizontal: SPACING.md,
    },
    passwordInput: {
        flex: 1,
        height: 48,
    },
    icon: {
        padding: SPACING.xs,
    },
    error: {
        color: COLORS.error,
        textAlign: "center",
        marginBottom: SPACING.md,
    },
    loginButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: SPACING.sm,
        alignItems: "center",
        marginBottom: SPACING.md,
    },
    loginButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: "bold",
    },
    forgotContainer: {
        marginVertical: SPACING.sm,
        alignItems: "center",
    },
    forgotText: {
        color: COLORS.primary,
        textDecorationLine: "underline",
    },
    footerText: {
        fontSize: TYPO.body.fontSize,
        color: COLORS.veryLight,
        textAlign: "center",
        textDecorationLine: "underline",
    },
});
