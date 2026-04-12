import { create } from 'zustand';

interface AttendanceSyncState {
  version: number;
  lastUpdatedAt: string | null;
  markAttendanceSynced: () => void;
}

export const useAttendanceSyncStore = create<AttendanceSyncState>((set) => ({
  version: 0,
  lastUpdatedAt: null,
  markAttendanceSynced: () =>
    set((state) => ({
      version: state.version + 1,
      lastUpdatedAt: new Date().toISOString(),
    })),
}));
