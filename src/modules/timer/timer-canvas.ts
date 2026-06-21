import type { TimerMode, TimerSnapshot } from './timer.types';
import { assetPath } from '../assets';

const timerBodySource = assetPath('scene/assets/timer-body.png');

const modeText: Record<TimerMode, string> = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break'
};

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export class TimerCanvasRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly image = new Image();
  private readonly resizeObserver: ResizeObserver;
  private latestSnapshot: TimerSnapshot | null = null;
  private imageReady = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly canvas: HTMLCanvasElement
  ) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Timer canvas 2D context is not available.');
    }

    this.context = context;
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
      this.draw();
    });
    this.image.decoding = 'async';
    this.image.src = timerBodySource;
    this.image.onload = () => {
      this.imageReady = true;
      this.draw();
    };
  }

  start(): void {
    this.resizeObserver.observe(this.root);
    this.resizeCanvas();
  }

  render(snapshot: TimerSnapshot): void {
    this.latestSnapshot = snapshot;
    this.canvas.setAttribute(
      'aria-label',
      `${modeText[snapshot.state.mode]} ${formatDuration(snapshot.remainingMs)} ${
        snapshot.state.status === 'completed' ? 'ready for next session' : snapshot.state.status
      }`
    );
    this.draw();
  }

  stop(): void {
    this.resizeObserver.disconnect();
  }

  private resizeCanvas(): void {
    const rect = this.root.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));

    if (this.canvas.width === width && this.canvas.height === height) return;

    this.canvas.width = width;
    this.canvas.height = height;
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  private draw(): void {
    const rect = this.root.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    this.context.clearRect(0, 0, width, height);

    if (this.imageReady) {
      this.context.drawImage(this.image, 0, 0, width, height);
    }

    if (!this.latestSnapshot) return;

    this.drawProgressRing(width, height, this.latestSnapshot);

    const remaining = formatDuration(this.latestSnapshot.remainingMs);
    const mode = modeText[this.latestSnapshot.state.mode];
    const status =
      this.latestSnapshot.state.status === 'completed' ? 'Ready for next session' : this.latestSnapshot.state.status;

    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.fillStyle = '#c93d31';
    this.context.font = `900 ${width * 0.032}px Inter, system-ui, sans-serif`;
    this.context.fillText(mode.toUpperCase(), width * 0.5, height * 0.405);

    this.context.fillStyle = '#4b2e24';
    this.context.font = `900 ${width * 0.147}px Inter, system-ui, sans-serif`;
    this.context.fillText(remaining, width * 0.5, height * 0.535);

    this.context.fillStyle = 'rgba(75, 46, 36, 0.68)';
    this.context.font = `900 ${width * 0.029}px Inter, system-ui, sans-serif`;
    this.context.fillText(status.toUpperCase(), width * 0.5, height * 0.66);
  }

  private drawProgressRing(width: number, height: number, snapshot: TimerSnapshot): void {
    const durationMs = Math.max(1, snapshot.state.durationMs);
    const remainingRatio = snapshot.state.status === 'idle' ? 1 : Math.max(0, Math.min(1, snapshot.remainingMs / durationMs));
    const centerX = width * 0.5;
    const centerY = height * 0.53;
    const radius = width * 0.241;
    const lineWidth = width * 0.018;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * remainingRatio;

    this.context.save();
    this.context.lineCap = 'round';
    this.context.lineWidth = lineWidth;

    this.context.strokeStyle = 'rgba(255, 245, 210, 0.98)';
    this.context.beginPath();
    this.context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.context.stroke();

    if (remainingRatio > 0.001) {
      const gradient = this.context.createLinearGradient(
        centerX - radius,
        centerY - radius,
        centerX + radius,
        centerY + radius
      );
      gradient.addColorStop(0, '#ff7f63');
      gradient.addColorStop(0.52, '#ef4b3e');
      gradient.addColorStop(1, '#cf352d');

      this.context.strokeStyle = gradient;
      this.context.shadowColor = 'rgba(207, 53, 45, 0.2)';
      this.context.shadowBlur = width * 0.006;
      this.context.beginPath();
      this.context.arc(centerX, centerY, radius, startAngle, endAngle);
      this.context.stroke();
    }

    this.context.restore();
  }
}
