import { ClockView } from './modules/clock/clock.view';
import { setupDebugLayout } from './modules/debug/debug-layout';
import { NotificationService } from './modules/notifications/notifications';
import { updateTabTitle } from './modules/notifications/tab-title';
import { setupSceneCanvas } from './modules/scene/scene-canvas';
import { applyTimeTheme } from './modules/scene/scene-theme';
import { TimerController } from './modules/timer/timer.controller';
import { TimerStore } from './modules/timer/timer.store';
import { TimerView } from './modules/timer/timer.view';
import { TodoStore } from './modules/todo/todo.store';
import { TodoView } from './modules/todo/todo.view';

export function createApp(root: HTMLElement): void {
  root.innerHTML = `
    <main class="app-shell" aria-label="Podoromo app">
      <section class="app-canvas">
        <div class="scene-stack" aria-hidden="true">
          <canvas class="scene-canvas" data-scene-canvas></canvas>
        </div>

        <div class="brand-block" aria-label="Podoromo" data-debug-target="brand">
          <img class="brand-wordmark" src="/brand/podoromo-wordmark-420.png" alt="Podoromo. Focus. Rest. Repeat." />
          <h1 class="sr-only">Podoromo</h1>
        </div>

        <article class="tomato-timer" aria-label="Timer" data-debug-target="timer">
          <canvas class="timer-canvas" data-timer-canvas aria-label="Focus 25:00 idle"></canvas>
        </article>

        <aside class="digital-clock" aria-label="Digital desk clock" data-debug-target="clock">
          <span data-clock-time>00:00:00</span>
          <small data-clock-date>loading</small>
        </aside>

        <aside class="todo-panel" aria-label="Todo list" data-debug-target="todo">
          <div class="panel-header">
            <div>
              <h2>Today</h2>
              <p>Pick one tiny next step.</p>
            </div>
            <button class="icon-button todo-close" type="button" aria-label="Close todo drawer">×</button>
          </div>
          <form class="todo-form" data-todo-form>
            <label for="task-title">Add task</label>
            <div>
              <input id="task-title" data-todo-input autocomplete="off" placeholder="Write a focus task..." />
              <button type="submit" aria-label="Add task">+</button>
            </div>
          </form>
          <p class="empty-state" data-todo-empty>No tasks yet.</p>
          <ul class="todo-list" data-todo-list></ul>
        </aside>

        <button class="todo-fab" type="button" aria-label="Open todo drawer" aria-expanded="false">☑</button>
        <div class="drawer-backdrop" data-drawer-backdrop></div>

        <section class="control-bar" aria-label="Timer controls" data-debug-target="controls">
          <div class="control-header">
            <div>
              <span>Session</span>
              <strong data-control-summary>25 / 5</strong>
              <small class="daily-cycles" data-daily-cycles>0 cycles today</small>
            </div>
            <button class="settings-button" type="button" data-settings-open aria-label="Open settings">Settings</button>
          </div>

          <div class="control-group mode-switch" aria-label="Timer mode">
            <button type="button" data-mode="focus" aria-pressed="true">Focus</button>
            <button type="button" data-mode="shortBreak" aria-pressed="false">Short</button>
            <button type="button" data-mode="longBreak" aria-pressed="false">Long</button>
          </div>

          <div class="control-group actions">
            <button class="primary-action" type="button" data-start aria-label="Start timer">Start</button>
            <button type="button" data-pause aria-label="Pause timer">Pause</button>
            <button type="button" data-reset aria-label="Reset timer">Reset</button>
            <button type="button" data-skip aria-label="Skip session">Skip</button>
          </div>
        </section>

        <dialog class="settings-dialog" data-settings-dialog aria-labelledby="settings-title">
          <div class="settings-panel">
            <div class="settings-header">
              <div>
                <h2 id="settings-title">Settings</h2>
                <p>Presets, custom durations, and alerts.</p>
              </div>
              <button class="icon-button" type="button" data-settings-close aria-label="Close settings">×</button>
            </div>

            <section class="settings-section" aria-label="Timer presets">
              <div class="settings-section-header">
                <h3>Presets</h3>
                <button class="restore-presets-button" type="button" data-restore-default-presets>Restore defaults</button>
              </div>
              <div class="control-group presets" data-preset-list></div>
            </section>

            <section class="settings-section" aria-label="Custom time">
              <button class="add-custom-time-button" type="button" data-add-custom-time aria-expanded="false">Add your custom time</button>
              <div class="custom-form-panel" data-custom-form-panel hidden>
                <form class="custom-form" data-custom-form>
                  <label>
                    Focus
                    <input data-focus-minutes type="number" min="1" max="180" inputmode="numeric" />
                  </label>
                  <label>
                    Short break
                    <input data-short-break-minutes type="number" min="1" max="180" inputmode="numeric" />
                  </label>
                  <label>
                    Long break
                    <input data-long-break-minutes type="number" min="1" max="180" inputmode="numeric" />
                  </label>
                  <label>
                    Cycle
                    <input data-sessions-before-long type="number" min="1" max="12" inputmode="numeric" />
                  </label>
                  <button type="submit">Save custom time</button>
                  <p class="form-error" data-form-error aria-live="polite"></p>
                </form>
              </div>
            </section>

            <section class="settings-section" aria-label="Alerts">
              <h3>Alerts</h3>
              <div class="control-group toggles">
                <label class="toggle">
                  <input type="checkbox" data-sound-toggle />
                  <span>Sound</span>
                </label>
                <label class="toggle">
                  <input type="checkbox" data-notification-toggle />
                  <span>Browser notification</span>
                </label>
              </div>
            </section>
          </div>
        </dialog>

        <button class="debug-open" type="button" data-debug-open aria-label="Open layout debug">Debug</button>
        <dialog class="debug-dialog" data-debug-dialog aria-labelledby="debug-title">
          <div class="debug-panel">
            <div class="debug-header">
              <div>
                <h2 id="debug-title">Debug layout</h2>
                <p>Adjust the major elements with pixel values.</p>
              </div>
              <button class="icon-button" type="button" data-debug-close aria-label="Close debug">×</button>
            </div>
            <form class="debug-form" data-debug-form></form>
            <label class="debug-output">
              Current values
              <textarea data-debug-output rows="8" readonly></textarea>
            </label>
            <button class="debug-reset" type="button" data-debug-reset>Reset layout overrides</button>
          </div>
        </dialog>

        <div class="toast-root" data-toast-root></div>
      </section>

      <aside class="mobile-notice" data-mobile-notice role="dialog" aria-labelledby="mobile-notice-title" aria-modal="true">
        <div class="mobile-notice-panel">
          <h2 id="mobile-notice-title">Desktop recommended</h2>
          <p>Ứng dụng này hoạt động tốt nhất trên trình duyệt desktop. Cảm ơn bạn đã ghé qua Podoromo.</p>
          <button type="button" data-mobile-notice-close>Đã hiểu</button>
        </div>
      </aside>
    </main>
  `;

  const canvas = root.querySelector<HTMLElement>('.app-canvas')!;
  const sceneCanvas = root.querySelector<HTMLCanvasElement>('[data-scene-canvas]')!;
  applyTimeTheme(canvas);
  setupSceneCanvas(canvas, sceneCanvas).setWeather('current');

  const timerStore = new TimerStore();
  const todoStore = new TodoStore();
  const notificationService = new NotificationService(root.querySelector<HTMLElement>('[data-toast-root]')!);

  const timerView = new TimerView(timerStore, {
    timerRoot: root.querySelector<HTMLElement>('.tomato-timer')!,
    timerCanvas: root.querySelector<HTMLCanvasElement>('[data-timer-canvas]')!,
    dailyCycles: root.querySelector<HTMLElement>('[data-daily-cycles]')!,
    startButton: root.querySelector<HTMLButtonElement>('[data-start]')!,
    pauseButton: root.querySelector<HTMLButtonElement>('[data-pause]')!,
    resetButton: root.querySelector<HTMLButtonElement>('[data-reset]')!,
    skipButton: root.querySelector<HTMLButtonElement>('[data-skip]')!,
    presetList: root.querySelector<HTMLElement>('[data-preset-list]')!,
    addCustomButton: root.querySelector<HTMLButtonElement>('[data-add-custom-time]')!,
    restoreDefaultPresetsButton: root.querySelector<HTMLButtonElement>('[data-restore-default-presets]')!,
    customFormPanel: root.querySelector<HTMLElement>('[data-custom-form-panel]')!,
    modeButtons: root.querySelectorAll<HTMLButtonElement>('[data-mode]'),
    customForm: root.querySelector<HTMLFormElement>('[data-custom-form]')!,
    focusInput: root.querySelector<HTMLInputElement>('[data-focus-minutes]')!,
    shortBreakInput: root.querySelector<HTMLInputElement>('[data-short-break-minutes]')!,
    longBreakInput: root.querySelector<HTMLInputElement>('[data-long-break-minutes]')!,
    sessionsInput: root.querySelector<HTMLInputElement>('[data-sessions-before-long]')!,
    soundToggle: root.querySelector<HTMLInputElement>('[data-sound-toggle]')!,
    notificationToggle: root.querySelector<HTMLInputElement>('[data-notification-toggle]')!,
    formError: root.querySelector<HTMLElement>('[data-form-error]')!
  });

  const todoView = new TodoView(todoStore, {
    panel: root.querySelector<HTMLElement>('.todo-panel')!,
    list: root.querySelector<HTMLElement>('[data-todo-list]')!,
    form: root.querySelector<HTMLFormElement>('[data-todo-form]')!,
    input: root.querySelector<HTMLInputElement>('[data-todo-input]')!,
    emptyState: root.querySelector<HTMLElement>('[data-todo-empty]')!,
    toggleButton: root.querySelector<HTMLButtonElement>('.todo-fab')!,
    closeButton: root.querySelector<HTMLButtonElement>('.todo-close')!,
    backdrop: root.querySelector<HTMLElement>('[data-drawer-backdrop]')!
  });

  const clock = new ClockView(root.querySelector<HTMLElement>('[data-clock-time]')!, root.querySelector<HTMLElement>('[data-clock-date]')!);
  const settingsDialog = root.querySelector<HTMLDialogElement>('[data-settings-dialog]')!;
  const settingsOpenButton = root.querySelector<HTMLButtonElement>('[data-settings-open]')!;
  const settingsCloseButton = root.querySelector<HTMLButtonElement>('[data-settings-close]')!;
  const controlSummary = root.querySelector<HTMLElement>('[data-control-summary]')!;
  const mobileNotice = root.querySelector<HTMLElement>('[data-mobile-notice]')!;
  const mobileNoticeCloseButton = root.querySelector<HTMLButtonElement>('[data-mobile-notice-close]')!;

  timerStore.subscribe((snapshot) => {
    timerView.render(snapshot);
    controlSummary.textContent = `${snapshot.settings.focusMinutes} / ${snapshot.settings.shortBreakMinutes}`;
    updateTabTitle(snapshot.state.mode, snapshot.remainingMs, snapshot.state.status === 'completed');
  });
  todoStore.subscribe((items) => todoView.render(items));

  settingsOpenButton.addEventListener('click', () => {
    if (!settingsDialog.open) {
      settingsDialog.showModal();
    }
  });

  settingsCloseButton.addEventListener('click', () => settingsDialog.close());
  settingsDialog.addEventListener('click', (event) => {
    if (event.target === settingsDialog) {
      settingsDialog.close();
    }
  });
  mobileNoticeCloseButton.addEventListener('click', () => {
    mobileNotice.hidden = true;
  });

  root.querySelector<HTMLInputElement>('[data-notification-toggle]')!.addEventListener('change', async (event) => {
    const target = event.currentTarget as HTMLInputElement;
    if (target.checked) {
      const permission = await notificationService.requestPermission();
      timerStore.updateSettings({ notificationsEnabled: permission === 'granted' });
    }
  });

  const controller = new TimerController(
    timerStore,
    (snapshot) => {
      timerView.render(snapshot);
      updateTabTitle(snapshot.state.mode, snapshot.remainingMs);
    },
    (snapshot) => {
      notificationService.notifySession(
        snapshot.state.mode,
        snapshot.settings.soundEnabled,
        snapshot.settings.notificationsEnabled
      );
      updateTabTitle(snapshot.state.mode, snapshot.remainingMs, true);
    }
  );

  clock.start();
  controller.startLoop();
  setupDebugLayout(root);

  window.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.code === 'Space') {
      event.preventDefault();
      const status = timerStore.getSnapshot().state.status;
      status === 'running' ? timerStore.pause() : timerStore.start();
    }
    if (event.key.toLowerCase() === 'r') timerStore.reset();
    if (event.key.toLowerCase() === 't') root.querySelector<HTMLButtonElement>('.todo-fab')?.click();
  });
}
