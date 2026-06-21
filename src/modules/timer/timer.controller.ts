import type { TimerSnapshot } from './timer.types';
import { TimerStore } from './timer.store';

type TickHandler = (snapshot: TimerSnapshot) => void;
type CompleteHandler = (snapshot: TimerSnapshot) => void;

export class TimerController {
  private frameId = 0;
  private completedStateSeen = false;

  constructor(
    private readonly store: TimerStore,
    private readonly onTick: TickHandler,
    private readonly onComplete: CompleteHandler
  ) {}

  startLoop(): void {
    const tick = () => {
      const snapshot = this.store.getSnapshot();
      this.onTick(snapshot);

      if (snapshot.state.status === 'running' && snapshot.remainingMs <= 0) {
        this.onComplete({ ...snapshot, remainingMs: 0, progress: 1 });
        this.store.completeCurrentSession();
        this.onTick(this.store.getSnapshot());
        this.completedStateSeen = true;
      } else if (snapshot.state.status !== 'completed') {
        this.completedStateSeen = false;
      } else if (!this.completedStateSeen) {
        this.onComplete(snapshot);
        this.completedStateSeen = true;
      }

      this.frameId = window.setTimeout(tick, 250);
    };

    tick();
  }

  stopLoop(): void {
    window.clearTimeout(this.frameId);
  }
}
