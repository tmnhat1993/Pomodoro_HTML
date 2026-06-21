import { TodoStore } from './todo.store';
import type { TodoItem } from './todo.types';

type TodoViewElements = {
  panel: HTMLElement;
  list: HTMLElement;
  form: HTMLFormElement;
  input: HTMLInputElement;
  emptyState: HTMLElement;
  toggleButton: HTMLButtonElement;
  closeButton: HTMLButtonElement;
  backdrop: HTMLElement;
};

export class TodoView {
  constructor(
    private readonly store: TodoStore,
    private readonly elements: TodoViewElements
  ) {
    this.bindEvents();
  }

  render(items: TodoItem[]): void {
    this.elements.emptyState.hidden = items.length > 0;
    this.elements.list.innerHTML = items.map(renderTodoItem).join('');

    this.elements.list.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
      const id = button.closest<HTMLElement>('[data-id]')?.dataset.id;
      if (!id) return;

      button.addEventListener('click', () => {
        if (button.dataset.action === 'toggle') this.store.toggle(id);
        if (button.dataset.action === 'pin') this.store.pin(id);
        if (button.dataset.action === 'delete') this.store.delete(id);
      });
    });
  }

  private bindEvents(): void {
    this.elements.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.store.add(this.elements.input.value);
      this.elements.input.value = '';
      this.elements.input.focus();
    });

    this.elements.toggleButton.addEventListener('click', () => this.setDrawerOpen(true));
    this.elements.closeButton.addEventListener('click', () => this.setDrawerOpen(false));
    this.elements.backdrop.addEventListener('click', () => this.setDrawerOpen(false));
  }

  private setDrawerOpen(open: boolean): void {
    this.elements.panel.classList.toggle('is-open', open);
    this.elements.backdrop.classList.toggle('is-open', open);
    this.elements.toggleButton.setAttribute('aria-expanded', String(open));
  }
}

function renderTodoItem(item: TodoItem): string {
  const checked = item.completed ? 'checked' : '';
  const pinned = item.pinned ? 'is-pinned' : '';
  const completed = item.completed ? 'is-completed' : '';

  return `
    <li class="todo-item ${completed} ${pinned}" data-id="${item.id}">
      <button class="todo-check" type="button" data-action="toggle" aria-label="Toggle task" ${checked}>
        ${item.completed ? '✓' : ''}
      </button>
      <span>${escapeHtml(item.title)}</span>
      <button class="icon-button" type="button" data-action="pin" aria-label="Pin current task">${item.pinned ? '★' : '☆'}</button>
      <button class="icon-button" type="button" data-action="delete" aria-label="Delete task">×</button>
    </li>
  `;
}

function escapeHtml(value: string): string {
  const span = document.createElement('span');
  span.textContent = value;
  return span.innerHTML;
}
