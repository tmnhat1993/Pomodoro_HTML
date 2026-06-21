import { readStorage, writeStorage } from '../storage/local-storage';

type DebugTargetId = 'brand' | 'timer' | 'clock' | 'controls' | 'todo';

type DebugValue = {
  width: number;
  x: number;
  y: number;
};

type DebugState = Record<DebugTargetId, DebugValue>;

type DebugTarget = {
  id: DebugTargetId;
  label: string;
  element: HTMLElement;
};

const STORAGE_KEY = 'podoromo:debug-layout-v2';
const TARGETS: Array<Omit<DebugTarget, 'element'>> = [
  { id: 'brand', label: 'Logo' },
  { id: 'timer', label: 'Timer' },
  { id: 'clock', label: 'Clock' },
  { id: 'controls', label: 'Controls' },
  { id: 'todo', label: 'Todo' }
];

export function setupDebugLayout(root: HTMLElement): void {
  const dialog = root.querySelector<HTMLDialogElement>('[data-debug-dialog]');
  const openButton = root.querySelector<HTMLButtonElement>('[data-debug-open]');
  const closeButton = root.querySelector<HTMLButtonElement>('[data-debug-close]');
  const form = root.querySelector<HTMLFormElement>('[data-debug-form]');
  const output = root.querySelector<HTMLTextAreaElement>('[data-debug-output]');
  const resetButton = root.querySelector<HTMLButtonElement>('[data-debug-reset]');

  if (!dialog || !openButton || !closeButton || !form || !output || !resetButton) return;

  const targets = TARGETS.map((target) => ({
    ...target,
    element: root.querySelector<HTMLElement>(`[data-debug-target="${target.id}"]`)!
  })).filter((target) => target.element);

  const state = readStorage<Partial<DebugState>>(STORAGE_KEY, {});

  const getValue = (target: DebugTarget): DebugValue => {
    const saved = state[target.id];
    const currentWidth = Math.round(target.element.getBoundingClientRect().width);
    return {
      width: saved?.width ?? currentWidth,
      x: saved?.x ?? 0,
      y: saved?.y ?? 0
    };
  };

  const persist = (): void => writeStorage(STORAGE_KEY, state);

  const applyTarget = (target: DebugTarget): void => {
    const value = getValue(target);
    target.element.style.setProperty('--debug-width', `${value.width}px`);
    target.element.style.setProperty('--debug-x', `${value.x}px`);
    target.element.style.setProperty('--debug-y', `${value.y}px`);
  };

  const updateOutput = (): void => {
    output.value = JSON.stringify(state, null, 2);
  };

  const renderControls = (): void => {
    form.innerHTML = targets.map((target) => {
      const value = getValue(target);
      const maxWidth = Math.max(900, Math.ceil(value.width * 2));
      return `
        <fieldset class="debug-fieldset" data-debug-group="${target.id}">
          <legend>${target.label}</legend>
          <label>
            Width
            <input data-debug-input data-debug-id="${target.id}" data-debug-prop="width" type="number" min="40" max="${maxWidth}" step="1" value="${value.width}" />
          </label>
          <label>
            X
            <input data-debug-input data-debug-id="${target.id}" data-debug-prop="x" type="number" min="-800" max="800" step="1" value="${value.x}" />
          </label>
          <label>
            Y
            <input data-debug-input data-debug-id="${target.id}" data-debug-prop="y" type="number" min="-800" max="800" step="1" value="${value.y}" />
          </label>
        </fieldset>
      `;
    }).join('');
    updateOutput();
  };

  targets.forEach(applyTarget);
  renderControls();

  form.addEventListener('input', (event) => {
    const input = event.target as HTMLInputElement;
    const id = input.dataset.debugId as DebugTargetId | undefined;
    const prop = input.dataset.debugProp as keyof DebugValue | undefined;
    const target = id ? targets.find((candidate) => candidate.id === id) : null;
    const numericValue = Number(input.value);

    if (!target || !prop || !Number.isFinite(numericValue)) return;

    state[target.id] = {
      ...getValue(target),
      [prop]: numericValue
    };
    applyTarget(target);
    persist();
    updateOutput();
  });

  resetButton.addEventListener('click', () => {
    targets.forEach((target) => {
      delete state[target.id];
      target.element.style.removeProperty('--debug-width');
      target.element.style.removeProperty('--debug-x');
      target.element.style.removeProperty('--debug-y');
    });
    persist();
    renderControls();
  });

  openButton.addEventListener('click', () => {
    renderControls();
    if (!dialog.open) dialog.showModal();
  });

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}
