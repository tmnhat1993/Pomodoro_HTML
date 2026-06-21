export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export type TimerSettings = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoStartBreak: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
};

export type TimerState = {
  mode: TimerMode;
  status: TimerStatus;
  durationMs: number;
  startedAt: number | null;
  endAt: number | null;
  pausedRemainingMs: number | null;
  completedFocusSessions: number;
};

export type DailyCycles = {
  date: string;
  completedCycles: number;
};

export type Preset = {
  id: string;
  label: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
};

export type TimerSnapshot = {
  state: TimerState;
  settings: TimerSettings;
  dailyCycles: DailyCycles;
  presets: Preset[];
  remainingMs: number;
  progress: number;
};
