import { useColorScheme } from "react-native";
import { plannerThemes } from "@academic-planner/core";

export function usePlannerTheme() {
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  return { dark, colors: dark ? plannerThemes.dark : plannerThemes.light };
}
