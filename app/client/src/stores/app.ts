import { create } from 'zustand';

export type ModuleId =
  | 'workspace'
  | 'deconstruct'
  | 'writing'
  | 'runtime'
  | 'knowledge'
  | 'tasks';

interface AppState {
  activeModule: ModuleId;
  setActiveModule: (module: ModuleId) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeModule: 'workspace',
  setActiveModule: (module) => set({ activeModule: module }),
}));
