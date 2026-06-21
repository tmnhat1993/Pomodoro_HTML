import type { TimerMode } from '../timer/timer.types';
import { playSessionBell } from './sound';

type ToastOptions = {
  message: string;
  tone?: 'default' | 'success' | 'warning';
};

const sessionMessage: Record<TimerMode, string> = {
  focus: 'Focus session complete',
  shortBreak: 'Break finished',
  longBreak: 'Long break finished'
};

export class NotificationService {
  constructor(private readonly toastRoot: HTMLElement) {}

  toast({ message, tone = 'default' }: ToastOptions): void {
    const toast = document.createElement('div');
    toast.className = `toast toast--${tone}`;
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    this.toastRoot.append(toast);
    window.setTimeout(() => toast.classList.add('toast--visible'), 10);
    window.setTimeout(() => {
      toast.classList.remove('toast--visible');
      window.setTimeout(() => toast.remove(), 250);
    }, 3600);
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      this.toast({ message: 'Browser notifications are not supported here.', tone: 'warning' });
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    this.toast({
      message: permission === 'granted' ? 'Browser notifications enabled.' : 'Using in-app alerts instead.',
      tone: permission === 'granted' ? 'success' : 'warning'
    });
    return permission;
  }

  notifySession(mode: TimerMode, soundEnabled: boolean, browserNotificationsEnabled: boolean): void {
    const message = sessionMessage[mode];
    this.toast({ message, tone: 'success' });

    if (soundEnabled) {
      playSessionBell();
    }

    if (browserNotificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro', { body: message });
    }
  }
}
