import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function PillInteractionsLayout() {
    return (
        <Tabs
            initialRouteName="drug_drug"
            screenOptions={{ headerShown: false }}
        >
            <Tabs.Screen
                name="drug_drug"
                options={{
                    title: "Drug ↔️ Drug",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="medkit-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="drug_food"
                options={{
                    title: "Drug ↔️ Food",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="nutrition-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
