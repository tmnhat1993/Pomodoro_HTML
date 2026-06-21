import { readStorage, writeStorage } from '../storage/local-storage';
import type { DailyCycles, Preset, TimerMode, TimerSettings, TimerSnapshot, TimerState } from './timer.types';

const SETTINGS_KEY = 'podoromo:timer-settings';
const STATE_KEY = 'podoromo:timer-state';
const DAILY_CYCLES_KEY = 'podoromo:daily-cycles';
const PRESETS_KEY = 'podoromo:presets';

export const DEFAULT_PRESETS: Preset[] = [
  { id: 'classic', label: '25 / 5', focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, sessionsBeforeLongBreak: 4 },
  { id: 'deep', label: '50 / 10', focusMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 20, sessionsBeforeLongBreak: 4 },
  { id: 'sprint', label: '15 / 3', focusMinutes: 15, shortBreakMinutes: 3, longBreakMinutes: 12, sessionsBeforeLongBreak: 4 },
  { id: 'maker', label: '90 / 15', focusMinutes: 90, shortBreakMinutes: 15, longBreakMinutes: 30, sessionsBeforeLongBreak: 3 }
];

export const defaultSettings: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreak: false,
  autoStartFocus: false,
  soundEnabled: true,
  notificationsEnabled: false
};

const fallbackState: TimerState = {
  mode: 'focus',
  status: 'idle',
  durationMs: defaultSettings.focusMinutes * 60_000,
  startedAt: null,
  endAt: null,
  pausedRemainingMs: null,
  completedFocusSessions: 0
};

function todayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fallbackDailyCycles(): DailyCycles {
  return {
    date: todayKey(),
    completedCycles: 0
  };
}

type Listener = (snapshot: TimerSnapshot) => void;

function durationForMode(mode: TimerMode, settings: TimerSettings): number {
  const minutesByMode: Record<TimerMode, number> = {
    focus: settings.focusMinutes,
    shortBreak: settings.shortBreakMinutes,
    longBreak: settings.longBreakMinutes
  };

  return minutesByMode[mode] * 60_000;
}

function calculateRemaining(state: TimerState): number {
  if (state.status === 'running' && state.endAt) {
    return Math.max(0, state.endAt - Date.now());
  }

  if (state.status === 'paused' && state.pausedRemainingMs !== null) {
    return state.pausedRemainingMs;
  }

  if (state.status === 'completed') {
    return 0;
  }

  return state.durationMs;
}

export class TimerStore {
  private settings: TimerSettings;
  private state: TimerState;
  private dailyCycles: DailyCycles;
  private presets: Preset[];
  private listeners = new Set<Listener>();

  constructor() {
    this.settings = readStorage<TimerSettings>(SETTINGS_KEY, defaultSettings);
    this.presets = this.normalizePresets(readStorage<Preset[]>(PRESETS_KEY, DEFAULT_PRESETS));
    this.dailyCycles = this.normalizeDailyCycles(readStorage<DailyCycles>(DAILY_CYCLES_KEY, fallbackDailyCycles()));
    const savedState = readStorage<TimerState>(STATE_KEY, fallbackState);
    this.state = {
      ...fallbackState,
      ...savedState,
      durationMs: durationForMode(savedState.mode ?? 'focus', this.settings)
    };

    if (this.state.status === 'running' && calculateRemaining(this.state) <= 0) {
      this.state = { ...this.state, status: 'completed', endAt: null, pausedRemainingMs: null };
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): TimerSnapshot {
    this.dailyCycles = this.normalizeDailyCycles(this.dailyCycles);
    const remainingMs = calculateRemaining(this.state);
    const elapsed = this.state.durationMs - remainingMs;

    return {
      state: { ...this.state },
      settings: { ...this.settings },
      dailyCycles: { ...this.dailyCycles },
      presets: this.presets.map((preset) => ({ ...preset })),
      remainingMs,
      progress: this.state.durationMs > 0 ? Math.min(1, Math.max(0, elapsed / this.state.durationMs)) : 0
    };
  }

  start(): void {
    const remainingMs = calculateRemaining(this.state);
    this.state = {
      ...this.state,
      status: 'running',
      startedAt: Date.now(),
      endAt: Date.now() + remainingMs,
      pausedRemainingMs: null
    };
    this.commit();
  }

  pause(): void {
    if (this.state.status !== 'running') return;

    this.state = {
      ...this.state,
      status: 'paused',
      endAt: null,
      pausedRemainingMs: calculateRemaining(this.state)
    };
    this.commit();
  }

  reset(): void {
    this.state = {
      ...this.state,
      status: 'idle',
      durationMs: durationForMode(this.state.mode, this.settings),
      startedAt: null,
      endAt: null,
      pausedRemainingMs: null
    };
    this.commit();
  }

  skip(): void {
    this.completeCurrentSession();
  }

  setMode(mode: TimerMode): void {
    this.state = {
      ...this.state,
      mode,
      status: 'idle',
      durationMs: durationForMode(mode, this.settings),
      startedAt: null,
      endAt: null,
      pausedRemainingMs: null
    };
    this.commit();
  }

  applyPreset(preset: Preset): void {
    this.updateSettings({
      focusMinutes: preset.focusMinutes,
      shortBreakMinutes: preset.shortBreakMinutes,
      longBreakMinutes: preset.longBreakMinutes,
      sessionsBeforeLongBreak: preset.sessionsBeforeLongBreak
    });
    this.setMode('focus');
  }

  addCustomPreset(settings: Pick<TimerSettings, 'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes' | 'sessionsBeforeLongBreak'>): void {
    const preset: Preset = {
      id: `custom-${Date.now()}`,
      label: `${settings.focusMinutes} / ${settings.shortBreakMinutes}`,
      ...settings
    };
    this.presets = [...this.presets, preset];
    this.updateSettings(settings);
    this.setMode('focus');
  }

  deletePreset(id: string): void {
    this.presets = this.presets.filter((preset) => preset.id !== id);
    this.commit();
  }

  restoreDefaultPresets(): void {
    this.presets = DEFAULT_PRESETS.map((preset) => ({ ...preset }));
    this.commit();
  }

  updateSettings(nextSettings: Partial<TimerSettings>): void {
    this.settings = { ...this.settings, ...nextSettings };
    this.state = {
      ...this.state,
      durationMs: durationForMode(this.state.mode, this.settings)
    };
    this.commit();
  }

  completeCurrentSession(): void {
    this.dailyCycles = this.normalizeDailyCycles(this.dailyCycles);
    const completedCycles =
      this.state.mode === 'focus' ? this.dailyCycles.completedCycles : this.dailyCycles.completedCycles + 1;
    const completedFocusSessions =
      this.state.mode === 'focus' ? this.state.completedFocusSessions + 1 : this.state.completedFocusSessions;
    const nextMode: TimerMode =
      this.state.mode === 'focus'
        ? completedFocusSessions % this.settings.sessionsBeforeLongBreak === 0
          ? 'longBreak'
          : 'shortBreak'
        : 'focus';
    const shouldAutoStart = nextMode === 'focus' ? this.settings.autoStartFocus : this.settings.autoStartBreak;

    this.state = {
      mode: nextMode,
      status: shouldAutoStart ? 'running' : 'completed',
      durationMs: durationForMode(nextMode, this.settings),
      startedAt: shouldAutoStart ? Date.now() : null,
      endAt: shouldAutoStart ? Date.now() + durationForMode(nextMode, this.settings) : null,
      pausedRemainingMs: null,
      completedFocusSessions
    };
    this.dailyCycles = {
      ...this.dailyCycles,
      completedCycles
    };
    this.commit();
  }

  private normalizeDailyCycles(dailyCycles: DailyCycles): DailyCycles {
    const date = todayKey();
    if (dailyCycles.date !== date) {
      return {
        date,
        completedCycles: 0
      };
    }

    return dailyCycles;
  }

  private normalizePresets(presets: Preset[]): Preset[] {
    const normalized = presets
      .filter((preset) => preset.id && preset.label && preset.focusMinutes && preset.shortBreakMinutes)
      .map((preset) => ({
        ...preset,
        longBreakMinutes: preset.longBreakMinutes ?? defaultSettings.longBreakMinutes,
        sessionsBeforeLongBreak: preset.sessionsBeforeLongBreak ?? defaultSettings.sessionsBeforeLongBreak
      }));

    return normalized.length > 0 ? normalized : DEFAULT_PRESETS.map((preset) => ({ ...preset }));
  }

  private commit(): void {
    this.dailyCycles = this.normalizeDailyCycles(this.dailyCycles);
    writeStorage(SETTINGS_KEY, this.settings);
    writeStorage(STATE_KEY, this.state);
    writeStorage(DAILY_CYCLES_KEY, this.dailyCycles);
    writeStorage(PRESETS_KEY, this.presets);
    this.listeners.forEach((listener) => listener(this.getSnapshot()));
  }
}
