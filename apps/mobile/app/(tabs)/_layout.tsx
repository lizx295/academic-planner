import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { usePlannerTheme } from "@/theme";

const icon: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home-outline",
  calendar: "calendar-outline",
  courses: "book-outline",
  tasks: "checkbox-outline",
  settings: "grid-outline",
};

export default function TabsLayout() {
  const { colors } = usePlannerTheme();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          position: "absolute",
          height: 78,
          paddingTop: 9,
          paddingBottom: 12,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => <Ionicons name={icon[route.name] ?? "ellipse-outline"} color={color} size={size} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio" }} />
      <Tabs.Screen name="calendar" options={{ title: "Agenda" }} />
      <Tabs.Screen name="courses" options={{ title: "Materias" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tareas" }} />
      <Tabs.Screen name="settings" options={{ title: "Más" }} />
    </Tabs>
  );
}
