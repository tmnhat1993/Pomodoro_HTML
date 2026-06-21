export class ClockView {
  private frameId = 0;

  constructor(
    private readonly timeElement: HTMLElement,
    private readonly dateElement: HTMLElement
  ) {}

  start(): void {
    const update = () => {
      const now = new Date();
      this.timeElement.textContent = new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(now);
      this.dateElement.textContent = new Intl.DateTimeFormat('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(now);
      this.frameId = window.setTimeout(update, 1000);
    };

    update();
  }

  stop(): void {
    window.clearTimeout(this.frameId);
  }
}
