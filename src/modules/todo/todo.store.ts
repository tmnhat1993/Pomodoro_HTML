import { readStorage, writeStorage } from '../storage/local-storage';
import type { TodoItem } from './todo.types';

const TODO_KEY = 'pomodoro:todos';

type TodoListener = (items: TodoItem[]) => void;

export class TodoStore {
  private items = readStorage<TodoItem[]>(TODO_KEY, []);
  private listeners = new Set<TodoListener>();

  subscribe(listener: TodoListener): () => void {
    this.listeners.add(listener);
    listener(this.getItems());
    return () => this.listeners.delete(listener);
  }

  getItems(): TodoItem[] {
    return [...this.items].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || a.createdAt - b.createdAt);
  }

  add(title: string): void {
    const trimmed = title.trim();
    if (!trimmed) return;

    this.items = [
      ...this.items,
      {
        id: crypto.randomUUID(),
        title: trimmed,
        completed: false,
        createdAt: Date.now()
      }
    ];
    this.commit();
  }

  toggle(id: string): void {
    this.items = this.items.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item));
    this.commit();
  }

  pin(id: string): void {
    this.items = this.items.map((item) => ({ ...item, pinned: item.id === id ? !item.pinned : false }));
    this.commit();
  }

  delete(id: string): void {
    this.items = this.items.filter((item) => item.id !== id);
    this.commit();
  }

  private commit(): void {
    writeStorage(TODO_KEY, this.items);
    this.listeners.forEach((listener) => listener(this.getItems()));
  }
}
