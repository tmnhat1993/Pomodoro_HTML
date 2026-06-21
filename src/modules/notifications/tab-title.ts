import type { TimerMode } from '../timer/timer.types';
import { formatDuration } from '../timer/timer.view';

const modeLabel: Record<TimerMode, string> = {
  focus: 'Focus',
  shortBreak: 'Break',
  longBreak: 'Long Break'
};

export function updateTabTitle(mode: TimerMode, remainingMs: number, completed = false): void {
  document.title = completed ? 'Done - Pomodoro' : `${formatDuration(remainingMs)} - ${modeLabel[mode]}`;
}
