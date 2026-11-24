import React, { createContext, useCallback, useContext, useState } from 'react';
import type { AdminNotice } from '../types/cms';

export interface DashboardWidgetVisibility {
  sekilas: boolean;
  aktivitas: boolean;
  draf_cepat: boolean;
  berita_acara: boolean;
  jemaat_wijk: boolean;
  ulang_tahun: boolean;
}

export interface HelpTab {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface AdminContextValue {
  notices: AdminNotice[];
  addNotice: (notice: Omit<AdminNotice, 'id'>) => void;
  dismissNotice: (id: string) => void;
  widgetVisibility: DashboardWidgetVisibility;
  toggleWidgetVisibility: (key: keyof DashboardWidgetVisibility) => void;
  helpTabs: HelpTab[];
  setHelpTabs: (tabs: HelpTab[]) => void;
  screenOptionsExtra: React.ReactNode | null;
  setScreenOptionsExtra: (node: React.ReactNode | null) => void;
}

const DEFAULT_WIDGET_VISIBILITY: DashboardWidgetVisibility = {
  sekilas: true,
  aktivitas: true,
  draf_cepat: true,
  berita_acara: true,
  jemaat_wijk: true,
  ulang_tahun: true,
};

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [widgetVisibility, setWidgetVisibility] = useState<DashboardWidgetVisibility>(
    DEFAULT_WIDGET_VISIBILITY
  );
  const [helpTabs, setHelpTabs] = useState<HelpTab[]>([]);
  const [screenOptionsExtra, setScreenOptionsExtra] = useState<React.ReactNode | null>(null);

  const addNotice = useCallback((notice: Omit<AdminNotice, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setNotices((prev) => [{ ...notice, id }, ...prev.slice(0, 3)]);
  }, []);

  const dismissNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const toggleWidgetVisibility = useCallback((key: keyof DashboardWidgetVisibility) => {
    setWidgetVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <AdminContext.Provider
      value={{
        notices,
        addNotice,
        dismissNotice,
        widgetVisibility,
        toggleWidgetVisibility,
        helpTabs,
        setHelpTabs,
        screenOptionsExtra,
        setScreenOptionsExtra,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error('useAdmin harus digunakan di dalam AdminProvider.');
  }
  return ctx;
}
