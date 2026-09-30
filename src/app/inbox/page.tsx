"use client";

import { useState } from "react";
import { ExternalLink, Mail, Megaphone, MessageSquare, Star } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAppStore } from "@/store/app";

type Tab = "messages" | "announcements";

export default function InboxPage() {
  const [tab, setTab] = useState<Tab>("messages");
  const conversations = useAppStore((state) => state.conversations);
  const announcements = useAppStore((state) => state.announcements);
  const courses = useAppStore((state) => state.courses);
  const markConversationRead = useAppStore((state) => state.markConversationRead);
  const markAnnouncementRead = useAppStore((state) => state.markAnnouncementRead);
  const [expanded, setExpanded] = useState<string | null>(null);
  const courseById = new Map(courses.map((course) => [course.id, course]));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader title="Bandeja" subtitle="Mensajes y anuncios publicados en Canvas." />
      <div className="flex gap-5 border-b border-border" role="tablist" aria-label="Tipo de bandeja">
        {([[
          "messages", `Mensajes (${conversations.filter((item) => !item.read).length})`, MessageSquare,
        ], [
          "announcements", `Anuncios (${announcements.filter((item) => !item.read).length})`, Megaphone,
        ]] as const).map(([id, label, Icon]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium ${tab === id ? "border-accent text-text" : "border-transparent text-text-muted"}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "messages" ? (
        conversations.length === 0 ? <EmptyState icon={<Mail size={22} />} title="Bandeja vacía" description="Los mensajes de Canvas aparecerán después de sincronizar." /> : (
          <ol className="divide-y divide-border border-y border-border">
            {[...conversations].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)).map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => { markConversationRead(item.id); setExpanded(expanded === item.id ? null : item.id); }} className="flex w-full gap-3 py-4 text-left">
                  <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-border-strong" : "bg-accent"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-text">{item.subject}</span>
                      {item.starred ? <Star size={13} className="fill-task text-task" /> : null}
                    </span>
                    <span className={`${expanded === item.id ? "" : "line-clamp-2"} mt-1 block text-sm leading-6 text-text-muted`}>{item.preview || "Sin vista previa"}</span>
                    <span className="mt-1 block text-xs text-text-faint">{item.participantNames.join(", ") || "Canvas"} · {new Date(item.lastMessageAt).toLocaleString("es-EC")}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )
      ) : announcements.length === 0 ? (
        <EmptyState icon={<Megaphone size={22} />} title="Sin anuncios" description="Los comunicados de tus materias aparecerán después de sincronizar." />
      ) : (
        <ol className="divide-y divide-border border-y border-border">
          {[...announcements].sort((a, b) => b.postedAt.localeCompare(a.postedAt)).map((item) => (
            <li key={item.id} className="py-4">
              <button type="button" onClick={() => { markAnnouncementRead(item.id); setExpanded(expanded === item.id ? null : item.id); }} className="flex w-full gap-3 text-left">
                <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-border-strong" : "bg-accent"}`} />
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-semibold text-text">{item.title}</span>
                  <span className="mt-1 block text-xs text-text-faint">{courseById.get(item.courseId)?.code ?? "Materia"} · {item.authorName} · {new Date(item.postedAt).toLocaleString("es-EC")}</span>
                  <span className={`${expanded === item.id ? "whitespace-pre-wrap" : "line-clamp-2"} mt-2 block text-sm leading-6 text-text-muted`}>{item.message || "Sin contenido adicional."}</span>
                </span>
              </button>
              {expanded === item.id && item.externalUrl ? <a href={item.externalUrl} target="_blank" rel="noreferrer" className="ml-5 mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">Abrir en Canvas <ExternalLink size={12} /></a> : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
