import { assetPath } from '../assets';

export type WeatherLayer = 'day' | 'night' | 'sunset' | 'dawn' | 'rainDay' | 'rainNight' | 'snowDay' | 'snowNight';
export type TimeLayer = 'day' | 'night' | 'sunset' | 'dawn';
export type WeatherCondition = 'clear' | 'rain' | 'snow';
type ParticleMode = 'none' | 'rain' | 'snow';
type CloudProfile = 'light' | 'heavy';

const weatherSources: Record<WeatherLayer, string> = {
  day: assetPath('scene/weather/window-day.png'),
  night: assetPath('scene/weather/window-night.png'),
  sunset: assetPath('scene/weather/window-sunset.png'),
  dawn: assetPath('scene/weather/window-dawn.png'),
  rainDay: assetPath('scene/weather/window-rain-day.png'),
  rainNight: assetPath('scene/weather/window-rain-night.png'),
  snowDay: assetPath('scene/weather/window-snow-day.png'),
  snowNight: assetPath('scene/weather/window-snow-night.png')
};

const cloudProfiles: Record<WeatherLayer, CloudProfile> = {
  day: 'light',
  night: 'light',
  sunset: 'light',
  dawn: 'light',
  rainDay: 'heavy',
  rainNight: 'heavy',
  snowDay: 'heavy',
  snowNight: 'heavy'
};

const weatherConditions: Record<WeatherLayer, WeatherCondition> = {
  day: 'clear',
  night: 'clear',
  sunset: 'clear',
  dawn: 'clear',
  rainDay: 'rain',
  rainNight: 'rain',
  snowDay: 'snow',
  snowNight: 'snow'
};

const cloudFilters: Record<WeatherLayer, string> = {
  day: 'saturate(0.94) brightness(1.02)',
  night: 'saturate(0.72) brightness(0.62) contrast(0.95)',
  sunset: 'sepia(0.18) saturate(1.08) brightness(1.02)',
  dawn: 'sepia(0.1) saturate(0.98) brightness(1.04)',
  rainDay: 'saturate(0.72) brightness(0.82) contrast(0.98)',
  rainNight: 'saturate(0.62) brightness(0.48) contrast(1.02)',
  snowDay: 'saturate(0.54) brightness(1.08) contrast(0.92)',
  snowNight: 'saturate(0.62) brightness(0.7) contrast(0.96)'
};

const roomForegroundSource = assetPath('scene/room-foreground-window-manual-edit.png');
const cloudSources = [
  assetPath('scene/clouds/cloud-1.png'),
  assetPath('scene/clouds/cloud-2.png'),
  assetPath('scene/clouds/cloud-3.png'),
  assetPath('scene/clouds/cloud-4.png'),
  assetPath('scene/clouds/cloud-5.png')
];

const windowViewBox = {
  x: 719,
  y: 0,
  width: 682,
  height: 527
};

const rainSlantRatio = -0.62;
const rainWindRatio = -0.38;

type ImagePlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
};

type WindowRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type RainParticle = {
  x: number;
  y: number;
  length: number;
  speed: number;
  slant: number;
  velocityX: number;
  alpha: number;
  width: number;
};

type SnowParticle = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  phase: number;
  alpha: number;
};

type CloudParticle = {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  alpha: number;
  spriteIndex: number;
  phase: number;
};

export class SceneCanvasRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly resizeObserver: ResizeObserver;
  private readonly cloudParticles: CloudParticle[] = [];
  private readonly rainParticles: RainParticle[] = [];
  private readonly snowParticles: SnowParticle[] = [];
  private weather: WeatherLayer = 'day';
  private weatherCondition: WeatherCondition = 'clear';
  private frameId = 0;
  private isDirty = true;
  private cloudFrameKey = '';
  private particleFrameKey = '';
  private previousTimestamp = 0;

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
    cloudSources.forEach((source) => void this.loadImage(source));
    this.loop();
  }

  stop(): void {
    window.cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
  }

  setWeather(weather: WeatherLayer): void {
    this.weather = weather;
    this.weatherCondition = weatherConditions[weather];
    this.root.dataset.weather = weather;
    this.root.dataset.weatherCondition = this.weatherCondition;
    this.previousTimestamp = 0;
    this.cloudFrameKey = '';
    this.particleFrameKey = '';
    void this.loadImage(weatherSources[weather]).then(() => {
      this.isDirty = true;
    });
  }

  setScene(timeLayer: TimeLayer, weatherCondition: WeatherCondition): void {
    this.weather = timeLayer;
    this.weatherCondition = weatherCondition;
    this.root.dataset.weather = timeLayer;
    this.root.dataset.weatherCondition = weatherCondition;
    this.previousTimestamp = 0;
    this.cloudFrameKey = '';
    this.particleFrameKey = '';
    void this.loadImage(weatherSources[timeLayer]).then(() => {
      this.isDirty = true;
    });
  }

  private loop = (timestamp = 0): void => {
    const particleMode = this.getParticleMode();
    const deltaSeconds = Math.min(0.04, Math.max(0.001, (timestamp - this.previousTimestamp) / 1000 || 0.016));

    if (particleMode !== 'none' || this.cloudParticles.length > 0 || this.cloudFrameKey === '') {
      this.stepClouds(deltaSeconds);
      this.stepParticles(deltaSeconds);
      this.draw();
      this.isDirty = false;
    } else if (this.isDirty) {
      this.draw();
      this.isDirty = false;
    }

    this.previousTimestamp = timestamp;
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

    const foreground = this.images.get(roomForegroundSource);
    const foregroundPlacement = this.getCoverPlacement(foreground, width, height);
    const windowRect = this.getWindowRect(foregroundPlacement);
    this.drawWindowWeather(this.images.get(weatherSources[this.weather]), foregroundPlacement);
    this.drawClouds(windowRect);
    this.drawParticles(windowRect);
    this.drawCover(this.images.get(roomForegroundSource), width, height);
  }

  private drawCover(image: HTMLImageElement | undefined, targetWidth: number, targetHeight: number): void {
    if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return;

    const placement = this.getCoverPlacement(image, targetWidth, targetHeight);
    if (!placement) return;

    this.context.drawImage(image, placement.x, placement.y, placement.width, placement.height);
  }

  private drawWindowWeather(image: HTMLImageElement | undefined, foregroundPlacement: ImagePlacement | undefined): void {
    if (!image?.complete || !image.naturalWidth || !image.naturalHeight || !foregroundPlacement) return;

    const windowRect = this.getWindowRect(foregroundPlacement);
    if (!windowRect) return;

    this.context.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      windowRect.x,
      windowRect.y,
      windowRect.width,
      windowRect.height
    );
  }

  private drawParticles(windowRect: WindowRect | undefined): void {
    const particleMode = this.getParticleMode();
    if (particleMode === 'none' || !windowRect) return;

    this.ensureParticles(windowRect, particleMode);
    this.context.save();
    this.context.beginPath();
    this.context.rect(windowRect.x, windowRect.y, windowRect.width, windowRect.height);
    this.context.clip();

    if (particleMode === 'rain') {
      this.drawRain(windowRect);
    } else {
      this.drawSnow(windowRect);
    }

    this.context.restore();
  }

  private drawClouds(windowRect: WindowRect | undefined): void {
    if (!windowRect) return;

    this.ensureClouds(windowRect);
    this.context.save();
    this.context.beginPath();
    this.context.rect(windowRect.x, windowRect.y, windowRect.width, windowRect.height);
    this.context.clip();
    this.context.filter = `blur(${Math.max(0.35, windowRect.width * 0.0008)}px) ${cloudFilters[this.getEffectWeatherLayer()]}`;

    for (const cloud of this.cloudParticles) {
      const sprite = this.images.get(cloudSources[cloud.spriteIndex]);
      if (!sprite?.complete || !sprite.naturalWidth || !sprite.naturalHeight) continue;

      const x = windowRect.x + cloud.x;
      const y = windowRect.y + cloud.y + Math.sin(cloud.phase) * cloud.height * 0.04;
      this.context.globalAlpha = cloud.alpha;
      this.context.drawImage(sprite, x, y, cloud.width, cloud.height);
    }

    this.context.filter = 'none';
    this.context.globalAlpha = 1;
    this.context.restore();
  }

  private drawRain(windowRect: WindowRect): void {
    this.context.lineCap = 'round';

    for (const particle of this.rainParticles) {
      const startX = windowRect.x + particle.x;
      const startY = windowRect.y + particle.y;
      const endX = startX + particle.slant;
      const endY = startY + particle.length;

      const gradient = this.context.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, `rgba(229, 244, 255, 0)`);
      gradient.addColorStop(0.42, `rgba(229, 244, 255, ${particle.alpha})`);
      gradient.addColorStop(1, `rgba(229, 244, 255, 0)`);

      this.context.strokeStyle = gradient;
      this.context.lineWidth = particle.width;
      this.context.beginPath();
      this.context.moveTo(startX, startY);
      this.context.lineTo(endX, endY);
      this.context.stroke();
    }
  }

  private drawSnow(windowRect: WindowRect): void {
    for (const particle of this.snowParticles) {
      const x = windowRect.x + particle.x + Math.sin(particle.phase) * particle.drift;
      const y = windowRect.y + particle.y;

      this.context.fillStyle = `rgba(255, 255, 255, ${particle.alpha})`;
      this.context.beginPath();
      this.context.arc(x, y, particle.radius, 0, Math.PI * 2);
      this.context.fill();
    }
  }

  private stepParticles(deltaSeconds: number): void {
    const particleMode = this.getParticleMode();

    if (particleMode === 'rain') {
      for (const particle of this.rainParticles) {
        particle.x += particle.velocityX * deltaSeconds;
        particle.y += particle.speed * deltaSeconds;
      }
    }

    if (particleMode === 'snow') {
      for (const particle of this.snowParticles) {
        particle.y += particle.speed * deltaSeconds;
        particle.phase += deltaSeconds * 1.4;
      }
    }
  }

  private stepClouds(deltaSeconds: number): void {
    for (const cloud of this.cloudParticles) {
      cloud.x += cloud.speed * deltaSeconds;
      cloud.phase += deltaSeconds * 0.08;
    }
  }

  private ensureClouds(windowRect: WindowRect): void {
    const effectWeatherLayer = this.getEffectWeatherLayer();
    const profile = cloudProfiles[effectWeatherLayer];
    const frameKey = `${effectWeatherLayer}:${Math.round(windowRect.width)}:${Math.round(windowRect.height)}`;

    if (this.cloudFrameKey === frameKey) {
      this.wrapClouds(windowRect);
      return;
    }

    this.cloudFrameKey = frameKey;
    this.cloudParticles.length = 0;

    const count = profile === 'heavy' ? 12 : 6;
    for (let index = 0; index < count; index += 1) {
      const horizonDepth = Math.random();
      const y = windowRect.height * (0.06 + horizonDepth * 0.52);
      const perspective = 1 - horizonDepth * 0.56;
      const spriteIndex = Math.floor(Math.random() * cloudSources.length);
      const sprite = this.images.get(cloudSources[spriteIndex]);
      const width = windowRect.width * (0.18 + Math.random() * 0.16) * perspective;
      const spriteAspect = sprite?.naturalWidth && sprite?.naturalHeight ? sprite.naturalHeight / sprite.naturalWidth : 0.42;
      const height = width * spriteAspect * (0.82 + Math.random() * 0.2);
      const speedBase = profile === 'heavy' ? 13 : 18;
      const speed = speedBase * (0.35 + perspective * 0.65) * (0.72 + Math.random() * 0.46);

      this.cloudParticles.push({
        x: Math.random() * (windowRect.width + width * 2) - width,
        y,
        width,
        height,
        speed,
        alpha: (profile === 'heavy' ? 0.72 : 0.58) * (0.58 + perspective * 0.42),
        spriteIndex,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  private ensureParticles(windowRect: WindowRect, particleMode: ParticleMode): void {
    const frameKey = `${particleMode}:${Math.round(windowRect.width)}:${Math.round(windowRect.height)}`;
    if (this.particleFrameKey === frameKey) {
      this.wrapParticles(windowRect, particleMode);
      return;
    }

    this.particleFrameKey = frameKey;
    this.rainParticles.length = 0;
    this.snowParticles.length = 0;

    if (particleMode === 'rain') {
      const count = Math.max(120, Math.round((windowRect.width * windowRect.height) / 2800));
      for (let index = 0; index < count; index += 1) {
        const speed = 460 + Math.random() * 300;
        const length = 32 + Math.random() * 28;
        const angleJitter = 0.92 + Math.random() * 0.16;
        this.rainParticles.push({
          x: Math.random() * (windowRect.width + 240) - 120,
          y: Math.random() * windowRect.height,
          length,
          speed,
          slant: length * rainSlantRatio * angleJitter,
          velocityX: speed * rainWindRatio * angleJitter,
          alpha: 0.18 + Math.random() * 0.26,
          width: 0.8 + Math.random() * 0.8
        });
      }
      return;
    }

    if (particleMode === 'snow') {
      const count = Math.max(48, Math.round((windowRect.width * windowRect.height) / 6500));
      for (let index = 0; index < count; index += 1) {
        this.snowParticles.push({
          x: Math.random() * windowRect.width,
          y: Math.random() * windowRect.height,
          radius: 1.2 + Math.random() * 2.8,
          speed: 22 + Math.random() * 58,
          drift: 6 + Math.random() * 18,
          phase: Math.random() * Math.PI * 2,
          alpha: 0.34 + Math.random() * 0.48
        });
      }
    }
  }

  private wrapClouds(windowRect: WindowRect): void {
    for (const cloud of this.cloudParticles) {
      if (cloud.x > windowRect.width + cloud.width) {
        cloud.x = -cloud.width * (1.2 + Math.random() * 0.8);
      }
    }
  }

  private wrapParticles(windowRect: WindowRect, particleMode: ParticleMode): void {
    if (particleMode === 'rain') {
      for (const particle of this.rainParticles) {
        if (particle.y > windowRect.height + particle.length || particle.x < -120) {
          particle.x = Math.random() * (windowRect.width + 260) - 80;
          particle.y = -particle.length - Math.random() * 80;
        }
      }
      return;
    }

    if (particleMode === 'snow') {
      for (const particle of this.snowParticles) {
        if (particle.y > windowRect.height + particle.radius * 2) {
          particle.x = Math.random() * windowRect.width;
          particle.y = -particle.radius * 2 - Math.random() * 40;
          particle.phase = Math.random() * Math.PI * 2;
        }
      }
    }
  }

  private getWindowRect(foregroundPlacement: ImagePlacement | undefined): WindowRect | undefined {
    if (!foregroundPlacement) return undefined;

    return {
      x: foregroundPlacement.x + windowViewBox.x * foregroundPlacement.scale,
      y: foregroundPlacement.y + windowViewBox.y * foregroundPlacement.scale,
      width: windowViewBox.width * foregroundPlacement.scale,
      height: windowViewBox.height * foregroundPlacement.scale
    };
  }

  private getParticleMode(): ParticleMode {
    return this.weatherCondition === 'clear' ? 'none' : this.weatherCondition;
  }

  private getEffectWeatherLayer(): WeatherLayer {
    if (this.weatherCondition === 'rain') return this.weather === 'night' ? 'rainNight' : 'rainDay';
    if (this.weatherCondition === 'snow') return this.weather === 'night' ? 'snowNight' : 'snowDay';
    return this.weather;
  }

  private getCoverPlacement(
    image: HTMLImageElement | undefined,
    targetWidth: number,
    targetHeight: number
  ): ImagePlacement | undefined {
    if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return undefined;

    const scale = Math.max(targetWidth / image.naturalWidth, targetHeight / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;

    return {
      x: (targetWidth - width) / 2,
      y: (targetHeight - height) / 2,
      width,
      height,
      scale
    };
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
