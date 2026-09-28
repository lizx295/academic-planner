import { courseColorClasses } from "@/lib/colors";
import type { CourseColor } from "@/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Avatar({
  name,
  color,
  className,
}: {
  name: string;
  color: CourseColor;
  className?: string;
}) {
  const c = courseColorClasses(color);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold ${c.solid} ${className ?? ""}`}
    >
      {initials(name)}
    </span>
  );
}