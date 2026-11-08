import {
  CalendarDays,
  Camera,
  ClipboardList,
  Home,
  NotebookPen,
  Settings,
  SquareCheck,
  BookOpen,
  UserCheck,
  Users,
  Link2,
  Zap,
  Sparkles,
  Cable,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/", label: "Inicio", icon: Home },
      { href: "/calendar", label: "Calendario", icon: CalendarDays },
      { href: "/capture", label: "Captura rápida", icon: Sparkles },
    ],
  },
  {
    title: "Académico",
    items: [
      { href: "/courses", label: "Materias", icon: BookOpen },
      { href: "/tasks", label: "Tareas", icon: SquareCheck },
      { href: "/assessments", label: "Evaluaciones", icon: ClipboardList },
      { href: "/attendance", label: "Asistencia", icon: UserCheck },
      { href: "/scan", label: "Escanear calendario", icon: Camera },
    ],
  },
  {
    title: "Espacio",
    items: [
      { href: "/notes", label: "Workspace", icon: NotebookPen },
      { href: "/integrations", label: "Integraciones", icon: Cable },
      { href: "/shortcuts", label: "Atajos y API", icon: Zap },
      { href: "/connect", label: "Dispositivos", icon: Link2 },
    ],
  },
];

export const ADMIN_ITEM: NavItem = {
  href: "/admin",
  label: "Administración",
  icon: Users,
};

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Configuración",
  icon: Settings,
};

export const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_SECTIONS.flatMap((s) => s.items),
  SETTINGS_ITEM,
];

/** Los 4 principales para la bottom nav de móviles. */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/courses", label: "Materias", icon: BookOpen },
  { href: "/capture", label: "Captura", icon: Sparkles },
];

/** Rutas agrupadas bajo el botón "Más" en móvil. */
export const MOBILE_MORE_ITEMS: NavItem[] = [
  { href: "/tasks", label: "Tareas", icon: SquareCheck },
  { href: "/assessments", label: "Evaluaciones", icon: ClipboardList },
  { href: "/attendance", label: "Asistencia", icon: UserCheck },
  { href: "/notes", label: "Workspace", icon: NotebookPen },
  { href: "/scan", label: "Escanear calendario", icon: Camera },
  { href: "/integrations", label: "Integraciones", icon: Cable },
  { href: "/shortcuts", label: "Atajos y API", icon: Zap },
  { href: "/connect", label: "Dispositivos", icon: Link2 },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function pageTitleFor(pathname: string): string {
  if (pathname.startsWith("/courses/")) return "Materia";
  const item = ALL_NAV_ITEMS.find((i) => i.href !== "/" && pathname.startsWith(i.href));
  if (pathname === "/") return "Inicio";
  return item?.label ?? "Academic Planner";
}