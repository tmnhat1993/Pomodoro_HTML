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
  unit: 'px' | '%';
};

const STORAGE_KEY = 'podoromo:debug-layout-v3';
const TARGETS: Array<Omit<DebugTarget, 'element'>> = [
  { id: 'brand', label: 'Logo', unit: '%' },
  { id: 'timer', label: 'Timer', unit: '%' },
  { id: 'clock', label: 'Clock', unit: 'px' },
  { id: 'controls', label: 'Controls', unit: 'px' },
  { id: 'todo', label: 'Todo', unit: 'px' }
];

export function setupDebugLayout(root: HTMLElement): void {
  const appCanvas = root.querySelector<HTMLElement>('.app-canvas');
  const dialog = root.querySelector<HTMLDialogElement>('[data-debug-dialog]');
  const openButton = root.querySelector<HTMLButtonElement>('[data-debug-open]');
  const closeButton = root.querySelector<HTMLButtonElement>('[data-debug-close]');
  const form = root.querySelector<HTMLFormElement>('[data-debug-form]');
  const output = root.querySelector<HTMLTextAreaElement>('[data-debug-output]');
  const resetButton = root.querySelector<HTMLButtonElement>('[data-debug-reset]');

  if (!appCanvas || !dialog || !openButton || !closeButton || !form || !output || !resetButton) return;

  const targets = TARGETS.map((target) => ({
    ...target,
    element: root.querySelector<HTMLElement>(`[data-debug-target="${target.id}"]`)!
  })).filter((target) => target.element);

  const state = readStorage<Partial<DebugState>>(STORAGE_KEY, {});
  const canvasRect = (): DOMRect => appCanvas.getBoundingClientRect();
  const asPercent = (value: number, basis: number): number => Number(((value / basis) * 100).toFixed(3));

  const getValue = (target: DebugTarget): DebugValue => {
    const saved = state[target.id];
    const targetRect = target.element.getBoundingClientRect();
    const appRect = canvasRect();
    const currentWidth =
      target.unit === '%' ? asPercent(targetRect.width, appRect.width) : Math.round(targetRect.width);
    const savedWidth =
      saved?.width === undefined
        ? undefined
        : target.unit === '%' && saved.width > 100
          ? asPercent(saved.width, appRect.width)
          : saved.width;
    return {
      width: savedWidth ?? currentWidth,
      x: saved?.x ?? 0,
      y: saved?.y ?? 0
    };
  };

  const persist = (): void => writeStorage(STORAGE_KEY, state);

  const applyTarget = (target: DebugTarget): void => {
    const value = getValue(target);
    const appRect = canvasRect();
    target.element.style.setProperty('--debug-width', `${value.width}${target.unit}`);
    target.element.style.setProperty(
      '--debug-x',
      target.unit === '%' ? `${(value.x / 100) * appRect.width}px` : `${value.x}px`
    );
    target.element.style.setProperty(
      '--debug-y',
      target.unit === '%' ? `${(value.y / 100) * appRect.height}px` : `${value.y}px`
    );
  };

  const updateOutput = (): void => {
    output.value = JSON.stringify(state, null, 2);
  };

  const renderControls = (): void => {
    form.innerHTML = targets.map((target) => {
      const value = getValue(target);
      const maxWidth = target.unit === '%' ? 100 : Math.max(900, Math.ceil(value.width * 2));
      const minWidth = target.unit === '%' ? 1 : 40;
      const offsetLimit = target.unit === '%' ? 100 : 800;
      const step = target.unit === '%' ? 0.1 : 1;
      return `
        <fieldset class="debug-fieldset" data-debug-group="${target.id}">
          <legend>${target.label}</legend>
          <label>
            Width (${target.unit})
            <input data-debug-input data-debug-id="${target.id}" data-debug-prop="width" type="number" min="${minWidth}" max="${maxWidth}" step="${step}" value="${value.width}" />
          </label>
          <label>
            X (${target.unit})
            <input data-debug-input data-debug-id="${target.id}" data-debug-prop="x" type="number" min="-${offsetLimit}" max="${offsetLimit}" step="${step}" value="${value.x}" />
          </label>
          <label>
            Y (${target.unit})
            <input data-debug-input data-debug-id="${target.id}" data-debug-prop="y" type="number" min="-${offsetLimit}" max="${offsetLimit}" step="${step}" value="${value.y}" />
          </label>
        </fieldset>
      `;
    }).join('');
    updateOutput();
  };

  targets.forEach(applyTarget);
  renderControls();

  const appResizeObserver = new ResizeObserver(() => {
    targets.forEach(applyTarget);
  });
  appResizeObserver.observe(appCanvas);

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
