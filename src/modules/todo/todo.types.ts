export type TodoItem = {
  id: string;
  title: string;
  completed: boolean;
  pinned?: boolean;
  createdAt: number;
};
