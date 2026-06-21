export function applyTimeTheme(root: HTMLElement): void {
  const hour = new Date().getHours();
  const theme = hour >= 18 || hour < 5 ? 'night' : hour >= 5 && hour < 11 ? 'morning' : 'afternoon';
  root.dataset.theme = theme;
}
