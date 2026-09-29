"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Download,
  Moon,
  Palette,
  RefreshCcw,
  Sun,
  Upload,
  User,
  Users,
  Zap,
} from "lucide-react";

import { useAppStore } from "@/store/app";
import { useResolvedDark, useTheme } from "@/hooks/useTheme";
import type { ThemePreference } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { Input, Select, FieldShell } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { Dialog } from "@/components/ui/Dialog";
import { ImportDialog } from "@/components/import/ImportDialog";
import { UniversitySelect } from "@/components/settings/UniversitySelect";
import { IntegrationsCard } from "@/components/settings/IntegrationsCard";

const THEMES: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const resolved = useResolvedDark(theme) ? "dark" : "light";
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const semesters = useAppStore((s) => s.semesters);
  const activeSemesterId = useAppStore((s) => s.activeSemesterId);
  const setActiveSemester = useAppStore((s) => s.setActiveSemester);
  const professors = useAppStore((s) => s.professors);
  const classrooms = useAppStore((s) => s.classrooms);
  const addProfessor = useAppStore((s) => s.addProfessor);
  const addClassroom = useAppStore((s) => s.addClassroom);
  const deleteProfessor = useAppStore((s) => s.deleteProfessor);
  const deleteClassroom = useAppStore((s) => s.deleteClassroom);
  const courses = useAppStore((s) => s.courses);
  const resetData = useAppStore((s) => s.resetData);
  const clearData = useAppStore((s) => s.clearData);

  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [program, setProgram] = useState("");
  const [studentId, setStudentId] = useState("");

  const [profTitle, setProfTitle] = useState("");
  const [profName, setProfName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomBuilding, setRoomBuilding] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  function saveProfile() {
    updateProfile({
      name: name.trim(),
      university: university.trim(),
      program: program.trim(),
      studentId: studentId.trim(),
    });
  }

  useEffect(() => {
    setName(profile.name);
    setUniversity(profile.university);
    setProgram(profile.program);
    setStudentId(profile.studentId);
  }, [profile.name, profile.university, profile.program, profile.studentId]);

  function exportData() {
    const s = useAppStore.getState();
    const payload = {
      profile: s.profile,
      activeSemesterId: s.activeSemesterId,
      semesters: s.semesters,
      professors: s.professors,
      classrooms: s.classrooms,
      courses: s.courses,
      schedules: s.schedules,
      attendance: s.attendance,
      tasks: s.tasks,
      assessments: s.assessments,
      grades: s.grades,
      materials: s.materials,
      notionWorkspaces: s.notionWorkspaces,
      personalEvents: s.personalEvents,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `academic-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Configuración"
        subtitle="Personaliza la app, tus datos y el respaldo."
      />

      <Card className="p-4 sm:p-5">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Palette size={16} className="text-text-faint" aria-hidden="true" />
              Apariencia
            </span>
          }
          description="Tema claro u oscuro, o seguir el sistema."
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Segmented options={THEMES} value={theme} onChange={setTheme} ariaLabel="Tema" />
          <span className="flex items-center gap-2 text-[13px] text-text-muted">
            {resolved === "dark" ? (
              <Moon size={14} aria-hidden="true" />
            ) : (
              <Sun size={14} aria-hidden="true" />
            )}
            Tema actual: {resolved === "dark" ? "oscuro" : "claro"}
          </span>
        </div>
      </Card>

      <IntegrationsCard />

      <Card className="p-4 sm:p-5">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <User size={16} className="text-text-faint" aria-hidden="true" />
              Perfil
            </span>
          }
          description="Nombre y universidad que se muestran en el dashboard."
        />
        <div className="mt-4 space-y-3">
          <FieldShell label="Nombre" htmlFor="set-name">
            <Input id="set-name" value={name} placeholder="Tu nombre" onChange={(e) => setName(e.target.value)} />
          </FieldShell>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldShell
              label="Universidad"
              htmlFor="set-uni"
              helper="Escribe para buscar entre las universidades del Ecuador (ej. ESPOL, católica, Cuenca)."
            >
              <UniversitySelect id="set-uni" value={university} onChange={setUniversity} />
            </FieldShell>
            <FieldShell label="Carrera / programa" htmlFor="set-program">
              <Input id="set-program" value={program} placeholder="Ingeniería de Software" onChange={(e) => setProgram(e.target.value)} />
            </FieldShell>
          </div>
          <FieldShell label="Matrícula / código" htmlFor="set-student">
            <Input id="set-student" value={studentId} placeholder="A01234567" onChange={(e) => setStudentId(e.target.value)} />
          </FieldShell>
          <div className="flex justify-end">
            <Button variant="primary" onClick={saveProfile}>
              Guardar perfil
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Zap size={16} className="text-text-faint" aria-hidden="true" />
              Semestre activo
            </span>
          }
          description="Las materias, asistencia y evaluaciones de este semestre se muestran por defecto."
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Select
            value={activeSemesterId}
            onChange={(e) => setActiveSemester(e.target.value)}
            className="w-64"
            aria-label="Semestre activo"
          >
            {semesters.length === 0 ? <option value="">Sin semestres</option> : null}
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.startsAt.slice(0, 4)})
              </option>
            ))}
          </Select>
          <p className="text-xs text-text-faint">
            {semesters.length === 0
              ? "Los datos de ejemplo incluyen un semestre. Se crea automáticamente al restablecer."
              : "Puedes restablecer el semestre de ejemplo desde Datos."}
          </p>
        </div>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="p-4">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Users size={16} className="text-text-faint" aria-hidden="true" />
                Profesores
              </span>
            }
            description="Se asignan a tus materias."
          />
          <div className="mt-3 space-y-1.5">
            {professors.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
                <span className="min-w-0 truncate text-sm text-text">
                  {p.title ? `${p.title} ` : ""}
                  {p.name}
                </span>
                <IconButton
                  aria-label={`Eliminar a ${p.name}`}
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-text-faint hover:text-absent"
                  onClick={() => deleteProfessor(p.id)}
                >
                  <Users size={14} />
                </IconButton>
              </div>
            ))}
            {professors.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border-strong px-3 py-2 text-[13px] text-text-faint">
                Aún no hay profesores.
              </p>
            ) : null}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={profName}
              placeholder="Nombre y apellido"
              aria-label="Nombre del nuevo profesor"
              onChange={(e) => setProfName(e.target.value)}
            />
            <Input
              value={profTitle}
              placeholder="Título (ej. Dra.)"
              aria-label="Título del profesor"
              className="w-24"
              onChange={(e) => setProfTitle(e.target.value)}
            />
            <Button
              variant="secondary"
              size="icon"
              aria-label="Agregar profesor"
              onClick={() => {
                if (!profName.trim()) return;
                addProfessor(profName.trim(), profTitle.trim());
                setProfName("");
                setProfTitle("");
              }}
            >
              <Users size={15} />
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Building2 size={16} className="text-text-faint" aria-hidden="true" />
                Aulas
              </span>
            }
            description="Lugares donde se imparten tus materias."
          />
          <div className="mt-3 space-y-1.5">
            {classrooms.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
                <span className="min-w-0 truncate text-sm text-text">
                  {c.name}
                  {c.building ? ` · ${c.building}` : ""}
                </span>
                <IconButton
                  aria-label={`Eliminar aula ${c.name}`}
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-text-faint hover:text-absent"
                  onClick={() => deleteClassroom(c.id)}
                >
                  <Building2 size={14} />
                </IconButton>
              </div>
            ))}
            {classrooms.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border-strong px-3 py-2 text-[13px] text-text-faint">
                Aún no hay aulas.
              </p>
            ) : null}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={roomName}
              placeholder="Aula A-204"
              aria-label="Nombre del nuevo aula"
              onChange={(e) => setRoomName(e.target.value)}
            />
            <Input
              value={roomBuilding}
              placeholder="Edificio"
              aria-label="Edificio del aula"
              className="w-28"
              onChange={(e) => setRoomBuilding(e.target.value)}
            />
            <Button
              variant="secondary"
              size="icon"
              aria-label="Agregar aula"
              onClick={() => {
                if (!roomName.trim()) return;
                addClassroom(roomName.trim(), roomBuilding.trim());
                setRoomName("");
                setRoomBuilding("");
              }}
            >
              <Building2 size={15} />
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-5">
        <CardHeader
          title="Datos"
          description="Importa, exporta y administra los datos de tu planificador."
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <Upload size={15} /> Importar
          </Button>
          <Button variant="secondary" onClick={exportData}>
            <Download size={15} /> Exportar respaldo
          </Button>
          <Button variant="outline" onClick={() => setConfirmReset(true)}>
            <RefreshCcw size={15} /> Restablecer ejemplos
          </Button>
          <Button variant="danger" onClick={() => setConfirmClear(true)}>
            Borrar todo
          </Button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-text-faint">
          Siempre hay una copia local para trabajar sin conexión. Si Supabase está configurado,
          también se guarda un respaldo privado asociado a tu sesión anónima.
        </p>
      </Card>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} courses={courses} />

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Restablecer datos de ejemplo"
        description="Se reemplazarán tus datos actuales por un semestre de ejemplo inventado."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                resetData();
                setConfirmReset(false);
              }}
            >
              Restablecer
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Los datos actuales se perderán. Puedes exportar un respaldo antes si los necesitas.
        </p>
      </Dialog>

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Borrar todo"
        description="Se eliminarán todas tus materias, tareas, evaluaciones y asistencias."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearData();
                setConfirmClear(false);
              }}
            >
              Borrar todo
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Esta acción no se puede deshacer. Considera exportar un respaldo antes de continuar.
        </p>
      </Dialog>
    </div>
  );
}
