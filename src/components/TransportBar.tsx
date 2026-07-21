import {
  usePlaybackStore,
  selectStartTime,
  selectEndTime,
  SPEEDS,
} from '../playback/playbackStore';
import { formatClock, formatDuration } from '../format';
import { SpeedRibbon } from './SpeedRibbon';

export function TransportBar() {
  const playing = usePlaybackStore((state) => state.playing);
  const speed = usePlaybackStore((state) => state.speed);
  const cursor = usePlaybackStore((state) => state.cursor);
  const togglePlay = usePlaybackStore((state) => state.togglePlay);
  const setSpeed = usePlaybackStore((state) => state.setSpeed);
  const reset = usePlaybackStore((state) => state.reset);
  const startTime = usePlaybackStore(selectStartTime);
  const endTime = usePlaybackStore(selectEndTime);

  const span = endTime - startTime;
  const elapsed = cursor - startTime;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3">
      <button
        type="button"
        onClick={togglePlay}
        className="w-24 rounded bg-track px-4 py-2 text-sm font-medium text-abyss transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-track"
      >
        {playing ? '일시정지' : '재생'}
      </button>

      <button
        type="button"
        onClick={reset}
        className="rounded border border-hairline px-3 py-2 text-sm text-dim transition-colors hover:border-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-track"
      >
        처음으로
      </button>

      <div className="flex items-center gap-1" role="group" aria-label="재생 배속">
        {SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSpeed(value)}
            aria-pressed={speed === value}
            className={`rounded px-3 py-2 font-mono text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-track ${
              speed === value
                ? 'bg-hairline text-track'
                : 'text-dim hover:text-ink'
            }`}
          >
            {value}x
          </button>
        ))}
      </div>

      <SpeedRibbon />

      <span className="font-mono text-xs text-dim tabular-nums">
        <span className="text-ink">{formatClock(cursor)}</span> · {formatDuration(elapsed)} /{' '}
        {formatDuration(span)}
      </span>
    </div>
  );
}
