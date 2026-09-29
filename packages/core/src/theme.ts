export const plannerThemes = {
  light: {
    background: "#f6f6f8", surface: "#ffffff", surfaceSubtle: "#f1f2f5",
    border: "#e7e8ee", borderStrong: "#d8dae2", text: "#191a21", textMuted: "#55575f",
    textFaint: "#898c96", accent: "#4f43e8", accentStrong: "#3d34c5", accentSoft: "#efedfd",
    onAccent: "#ffffff", present: "#15803d", presentSoft: "#dcfce7", warning: "#b45309",
    warningSoft: "#fef3c7", danger: "#be2742", dangerSoft: "#ffe4e6",
  },
  dark: {
    background: "#0b0c11", surface: "#12141b", surfaceSubtle: "#171922",
    border: "#232630", borderStrong: "#30343f", text: "#eceef2", textMuted: "#a3a7b2",
    textFaint: "#6d7180", accent: "#8b86f0", accentStrong: "#a6a2f4", accentSoft: "#24213f",
    onAccent: "#ffffff", present: "#4ade80", presentSoft: "#173524", warning: "#e6a35e",
    warningSoft: "#362817", danger: "#f08396", dangerSoft: "#3a1c24",
  },
} as const;
export type PlannerTheme = typeof plannerThemes.light;
export const courseColors = {
  indigo: "#5353d8", sky: "#0284c7", emerald: "#059669", amber: "#d97706",
  rose: "#e11d48", violet: "#7c3aed", slate: "#64748b",
} as const;
