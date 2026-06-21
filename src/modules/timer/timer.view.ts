import { TimerCanvasRenderer } from './timer-canvas';
import { TimerStore } from './timer.store';
import type { Preset, TimerMode, TimerSnapshot } from './timer.types';

type TimerViewElements = {
  timerRoot: HTMLElement;
  timerCanvas: HTMLCanvasElement;
  dailyCycles: HTMLElement;
  startButton: HTMLButtonElement;
  pauseButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  skipButton: HTMLButtonElement;
  presetList: HTMLElement;
  addCustomButton: HTMLButtonElement;
  restoreDefaultPresetsButton: HTMLButtonElement;
  customFormPanel: HTMLElement;
  modeButtons: NodeListOf<HTMLButtonElement>;
  customForm: HTMLFormElement;
  focusInput: HTMLInputElement;
  shortBreakInput: HTMLInputElement;
  longBreakInput: HTMLInputElement;
  sessionsInput: HTMLInputElement;
  soundToggle: HTMLInputElement;
  notificationToggle: HTMLInputElement;
  formError: HTMLElement;
};

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export class TimerView {
  private readonly timerCanvas: TimerCanvasRenderer;
  private presetSignature = '';

  constructor(
    private readonly store: TimerStore,
    private readonly elements: TimerViewElements
  ) {
    this.timerCanvas = new TimerCanvasRenderer(elements.timerRoot, elements.timerCanvas);
    this.timerCanvas.start();
    this.bindEvents();
  }

  render(snapshot: TimerSnapshot): void {
    const { state, settings } = snapshot;
    this.timerCanvas.render(snapshot);
    this.elements.dailyCycles.textContent = `${snapshot.dailyCycles.completedCycles} cycle${
      snapshot.dailyCycles.completedCycles === 1 ? '' : 's'
    } today`;
    this.elements.startButton.textContent = state.status === 'paused' ? 'Resume' : 'Start';
    this.elements.startButton.disabled = state.status === 'running';
    this.elements.pauseButton.disabled = state.status !== 'running';
    this.elements.resetButton.disabled = state.status === 'idle';

    this.elements.modeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.mode === state.mode);
      button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
    });

    if (!this.elements.customFormPanel.contains(document.activeElement)) {
      this.elements.focusInput.value = String(settings.focusMinutes);
      this.elements.shortBreakInput.value = String(settings.shortBreakMinutes);
      this.elements.longBreakInput.value = String(settings.longBreakMinutes);
      this.elements.sessionsInput.value = String(settings.sessionsBeforeLongBreak);
    }
    this.elements.soundToggle.checked = settings.soundEnabled;
    this.elements.notificationToggle.checked = settings.notificationsEnabled;
    this.renderPresets(snapshot.presets);
  }

  private bindEvents(): void {
    this.elements.startButton.addEventListener('click', () => this.store.start());
    this.elements.pauseButton.addEventListener('click', () => this.store.pause());
    this.elements.resetButton.addEventListener('click', () => this.store.reset());
    this.elements.skipButton.addEventListener('click', () => this.store.skip());
    this.elements.addCustomButton.addEventListener('click', () => {
      this.elements.customFormPanel.hidden = !this.elements.customFormPanel.hidden;
      this.elements.addCustomButton.setAttribute('aria-expanded', String(!this.elements.customFormPanel.hidden));
      if (!this.elements.customFormPanel.hidden) {
        this.elements.focusInput.focus();
      }
    });
    this.elements.restoreDefaultPresetsButton.addEventListener('click', () => this.store.restoreDefaultPresets());

    this.elements.modeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.dataset.mode as TimerMode;
        this.store.setMode(mode);
      });
    });

    this.elements.customForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const focusMinutes = normalizeMinutes(this.elements.focusInput.value);
      const shortBreakMinutes = normalizeMinutes(this.elements.shortBreakInput.value);
      const longBreakMinutes = normalizeMinutes(this.elements.longBreakInput.value);
      const sessionsBeforeLongBreak = Math.min(12, Math.max(1, Number(this.elements.sessionsInput.value)));

      if (!focusMinutes || !shortBreakMinutes || !longBreakMinutes || !Number.isFinite(sessionsBeforeLongBreak)) {
        this.elements.formError.textContent = 'Use values from 1 to 180 minutes.';
        return;
      }

      this.elements.formError.textContent = '';
      this.store.addCustomPreset({ focusMinutes, shortBreakMinutes, longBreakMinutes, sessionsBeforeLongBreak });
      this.store.reset();
      this.elements.customFormPanel.hidden = true;
      this.elements.addCustomButton.setAttribute('aria-expanded', 'false');
    });

    this.elements.soundToggle.addEventListener('change', () => {
      this.store.updateSettings({ soundEnabled: this.elements.soundToggle.checked });
    });

    this.elements.notificationToggle.addEventListener('change', () => {
      this.store.updateSettings({ notificationsEnabled: this.elements.notificationToggle.checked });
    });
  }

  private renderPresets(presets: Preset[]): void {
    const signature = JSON.stringify(presets);
    if (signature === this.presetSignature) return;

    this.presetSignature = signature;
    this.elements.presetList.innerHTML = presets.map(
      (preset) => `
        <div class="preset-card" data-preset-card="${preset.id}">
          <button class="preset-button" type="button" data-preset="${preset.id}">
            <span>${preset.label}</span>
            <small>${preset.longBreakMinutes} long / ${preset.sessionsBeforeLongBreak} cycle</small>
          </button>
          <button class="preset-delete" type="button" data-delete-preset="${preset.id}" aria-label="Delete ${preset.label} preset">×</button>
        </div>
      `
    ).join('');

    this.elements.presetList.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button) => {
      const preset = presets.find((item) => item.id === button.dataset.preset);
      if (!preset) return;
      button.addEventListener('click', () => this.store.applyPreset(preset));
    });

    this.elements.presetList.querySelectorAll<HTMLButtonElement>('[data-delete-preset]').forEach((button) => {
      const id = button.dataset.deletePreset;
      if (!id) return;
      button.addEventListener('click', () => this.store.deletePreset(id));
    });
  }
}

function normalizeMinutes(value: string): number | null {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 1) return null;
  return Math.min(180, Math.floor(minutes));
}
