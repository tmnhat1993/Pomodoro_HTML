export type WeatherLayer = 'current' | 'rainNight';

const weatherSources: Record<WeatherLayer, string> = {
  current: '/scene/weather/weather-current.png',
  rainNight: '/scene/weather/weather-rain-night.png'
};

const roomForegroundSource = '/scene/room-foreground-window-manual-edit.png';

export class SceneCanvasRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly resizeObserver: ResizeObserver;
  private weather: WeatherLayer = 'current';
  private frameId = 0;
  private isDirty = true;

  constructor(
    private readonly root: HTMLElement,
    private readonly canvas: HTMLCanvasElement
  ) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context is not available.');
    }

    this.context = context;
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
      this.isDirty = true;
    });
  }

  start(): void {
    this.resizeObserver.observe(this.root);
    this.resizeCanvas();
    void this.loadImage(weatherSources[this.weather]);
    void this.loadImage(roomForegroundSource);
    this.loop();
  }

  stop(): void {
    window.cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
  }

  setWeather(weather: WeatherLayer): void {
    this.weather = weather;
    this.root.dataset.weather = weather;
    void this.loadImage(weatherSources[weather]).then(() => {
      this.isDirty = true;
    });
  }

  private loop = (): void => {
    if (this.isDirty) {
      this.draw();
      this.isDirty = false;
    }

    this.frameId = window.requestAnimationFrame(this.loop);
  };

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
    const { width, height } = this.root.getBoundingClientRect();
    this.context.clearRect(0, 0, width, height);
    this.drawCover(this.images.get(roomForegroundSource), width, height);
  }

  private drawCover(image: HTMLImageElement | undefined, targetWidth: number, targetHeight: number): void {
    if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return;

    const scale = Math.max(targetWidth / image.naturalWidth, targetHeight / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const x = (targetWidth - width) / 2;
    const y = (targetHeight - height) / 2;

    this.context.drawImage(image, x, y, width, height);
  }

  private loadImage(source: string): Promise<HTMLImageElement> {
    const cached = this.images.get(source);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = source;
      image.onload = () => {
        this.images.set(source, image);
        this.isDirty = true;
        resolve(image);
      };
      image.onerror = () => reject(new Error(`Unable to load scene image: ${source}`));
    });
  }
}

export function setupSceneCanvas(root: HTMLElement, canvas: HTMLCanvasElement): SceneCanvasRenderer {
  const renderer = new SceneCanvasRenderer(root, canvas);
  renderer.start();
  return renderer;
}
