"use client";

import { Bell, BellRing, Clock3 } from "lucide-react";
import { useState } from "react";

import { requestBrowserNotifications, sendTestBrowserNotification } from "@/components/providers/NotificationProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { useAppStore } from "@/store/app";

export function NotificationSettingsCard() {
  const preferences = useAppStore((state) => state.notificationPreferences);
  const update = useAppStore((state) => state.updateNotificationPreferences);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  async function enableBrowser() {
    const result = await requestBrowserNotifications();
    if (result === "granted") {
      update({ browser: true, enabled: true });
      setPermissionMessage("Notificaciones del navegador activadas.");
    } else if (result === "unsupported") {
      setPermissionMessage("Este navegador no admite notificaciones persistentes.");
    } else {
      update({ browser: false });
      setPermissionMessage("El navegador no concedió permiso. Puedes cambiarlo desde la configuración del sitio.");
    }
  }

  const rows = [
    ["announcements", "Anuncios", "Nuevos comunicados de tus materias"],
    ["messages", "Mensajes", "Conversaciones nuevas o sin leer"],
    ["discussions", "Foros", "Respuestas y actividad nueva en discusiones"],
    ["contentUpdates", "Contenido del curso", "Páginas, materiales y módulos publicados"],
    ["grades", "Notas y comentarios", "Calificaciones y retroalimentación publicada"],
    ["deadlines", "Fechas de entrega", "Recordatorios 24 y 2 horas antes"],
    ["classReminders", "Clases", "Recordatorios basados en tu horario"],
  ] as const;

  return (
    <Card className="p-4 sm:p-5">
      <CardHeader
        title={<span className="flex items-center gap-2"><BellRing size={16} className="text-text-faint" /> Notificaciones</span>}
        description="Elige qué avisos recibir. Las horas de silencio respetan la zona horaria del dispositivo."
        action={<Switch checked={preferences.enabled} onChange={(enabled) => update({ enabled })} label="Activar notificaciones" />}
      />

      <div className="mt-4 divide-y divide-border border-y border-border">
        {rows.map(([key, label, description]) => (
          <label key={key} className="flex items-center justify-between gap-4 py-3">
            <span>
              <span className="block text-sm font-medium text-text">{label}</span>
              <span className="mt-0.5 block text-xs text-text-faint">{description}</span>
            </span>
            <Switch checked={preferences[key]} onChange={(checked) => update({ [key]: checked })} label={`Activar ${label}`} />
          </label>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs font-medium text-text-muted"><Clock3 size={13} /> Silencio desde</span>
          <Input type="time" value={preferences.quietStart} onChange={(event) => update({ quietStart: event.target.value })} />
        </label>
        <label className="space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs font-medium text-text-muted"><Clock3 size={13} /> Hasta</span>
          <Input type="time" value={preferences.quietEnd} onChange={(event) => update({ quietEnd: event.target.value })} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={() => void enableBrowser()} disabled={!preferences.enabled}>
          <Bell size={15} /> {preferences.browser ? "Permiso del navegador activo" : "Activar avisos del navegador"}
        </Button>
        {preferences.browser ? (
          <Button
            variant="secondary"
            onClick={() => void sendTestBrowserNotification().then((shown) => setPermissionMessage(shown ? "Notificación de prueba enviada al sistema." : "El navegador ya no tiene permiso para mostrar avisos."))}
          >
            Probar notificación
          </Button>
        ) : null}
        {permissionMessage ? <p className="text-xs text-text-muted" role="status">{permissionMessage}</p> : null}
      </div>
    </Card>
  );
}
