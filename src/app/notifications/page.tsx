"use client";

import Link from "next/link";
import { Bell, CheckCheck, Trash2 } from "lucide-react";

import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { fmtRelativeIn } from "@/lib/format";
import { useAppStore } from "@/store/app";

export default function NotificationsPage() {
  const notifications = useAppStore((state) => state.notifications);
  const markRead = useAppStore((state) => state.markNotificationRead);
  const markAll = useAppStore((state) => state.markAllNotificationsRead);
  const remove = useAppStore((state) => state.deleteNotification);
  const ordered = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = ordered.filter((item) => !item.read).length;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Notificaciones"
        subtitle={`${unread} sin leer · avisos de Canvas y de tu agenda`}
        action={unread ? <Button onClick={markAll}><CheckCheck size={15} /> Marcar todo leído</Button> : null}
      />

      {ordered.length === 0 ? (
        <EmptyState icon={<Bell size={22} />} title="No hay notificaciones" description="Aquí aparecerán cambios importantes, mensajes y fechas próximas." />
      ) : (
        <ol className="divide-y divide-border border-y border-border">
          {ordered.map((item) => (
            <li key={item.id} className="group flex gap-3 py-4">
              <span aria-hidden="true" className={`mt-2 h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-border-strong" : "bg-accent"}`} />
              <div className="min-w-0 flex-1">
                {item.href ? item.href.startsWith("http") ? (
                  <a href={item.href} target="_blank" rel="noreferrer" onClick={() => markRead(item.id)} className="font-medium text-text hover:text-accent">{item.title}</a>
                ) : (
                  <Link href={item.href} onClick={() => markRead(item.id)} className="font-medium text-text hover:text-accent">{item.title}</Link>
                ) : (
                  <button type="button" className="text-left font-medium text-text" onClick={() => markRead(item.id)}>{item.title}</button>
                )}
                <p className="mt-1 text-sm leading-6 text-text-muted">{item.body}</p>
                <p className="mt-1 text-xs text-text-faint">{fmtRelativeIn(new Date(item.createdAt))}</p>
              </div>
              <IconButton aria-label={`Eliminar ${item.title}`} className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100" onClick={() => remove(item.id)}><Trash2 size={15} /></IconButton>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
