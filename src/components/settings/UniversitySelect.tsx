"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { highlightName, searchUniversities, type University } from "@/lib/universities";

export interface UniversitySelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Combobox: busca en el banco de universidades del Ecuador mientras
 * escribes. Permite dejar cualquier texto libre si la universidad no
 * está listada.
 */
export function UniversitySelect({ id, value, onChange }: UniversitySelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return searchUniversities(trimmed, 7);
  }, [value]);

  const showFreeText = value.trim().length > 0 && !UniversityExpr(suggestions, value);

  function choose(uni: University) {
    onChange(uni.name);
    setOpen(false);
  }

  function chooseFreeText() {
    onChange(value.trim());
    setOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const count = suggestions.length + (showFreeText ? 1 : 0);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (count === 0 ? 0 : (i + 1) % count));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (count === 0 ? 0 : (i - 1 + count) % count));
    } else if (e.key === "Enter") {
      if (!open) {
        setOpen(count > 0);
        return;
      }
      e.preventDefault();
      if (active < suggestions.length) choose(suggestions[active]);
      else chooseFreeText();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    setActive(0);
  }, [value]);

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search
          size={15}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
        />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? "university-listbox" : undefined}
          aria-activedescendant={open ? `university-option-${active}` : undefined}
          aria-autocomplete="list"
          value={value}
          placeholder="Escribe tu universidad…"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="h-9 w-full rounded-[10px] border border-border bg-surface pl-8 pr-3 text-sm text-text placeholder:text-text-faint transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {open && (suggestions.length > 0 || showFreeText) ? (
        <ul
          id="university-listbox"
          role="listbox"
          aria-label="Universidades sugeridas"
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-border bg-surface p-1 shadow-xl shadow-black/10"
        >
          {suggestions.map((uni, i) => {
            const parts = highlightName(uni.name, value);
            const selected = i === active;
            return (
              <li
                key={`${uni.name}-${i}`}
                id={`university-option-${i}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(uni)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2",
                  selected && "bg-surface-subtle",
                )}
              >
                <span className="min-w-0 flex-1 text-sm text-text">
                  {parts.map((p, j) =>
                    p.hit ? (
                      <mark key={j} className="rounded-[3px] bg-accent-soft px-0.5 font-semibold text-accent">
                        {p.text}
                      </mark>
                    ) : (
                      <span key={j}>{p.text}</span>
                    ),
                  )}
                </span>
                <span className="shrink-0 text-xs text-text-faint">{uni.city}</span>
                {selected ? <Check size={14} className="shrink-0 text-accent" aria-hidden="true" /> : null}
              </li>
            );
          })}

          {showFreeText ? (
            <li
              id={`university-option-${suggestions.length}`}
              role="option"
              aria-selected={active === suggestions.length}
              onMouseEnter={() => setActive(suggestions.length)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={chooseFreeText}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border-t border-border px-2.5 py-2",
                active === suggestions.length && "bg-surface-subtle",
              )}
            >
              <span className="min-w-0 flex-1 text-sm text-text-muted">
                Usar <span className="font-medium text-text">&ldquo;{value.trim()}&rdquo;</span> tal cual
              </span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

function UniversityExpr(list: University[], current: string): boolean {
  return list.some((u) => u.name.trim().toLowerCase() === current.trim().toLowerCase());
}