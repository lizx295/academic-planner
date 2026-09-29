"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CloudSyncProvider } from "@/components/providers/CloudSyncProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CloudSyncProvider>
      <div className="flex min-h-dvh flex-col">
        <Sidebar />
        <div className="flex min-h-dvh flex-1 flex-col lg:pl-[248px]">
          <Topbar />
          <main
            id="main-content"
            className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8"
          >
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </CloudSyncProvider>
  );
}
