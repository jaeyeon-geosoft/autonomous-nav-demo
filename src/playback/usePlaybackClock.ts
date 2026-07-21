import { useEffect } from 'react';
import { usePlaybackStore } from './playbackStore';

/**
 * 재생 중일 때 매 프레임 실제 경과 시간을 스토어에 넘긴다.
 * 시간 진행은 여기서만 일으키고, 스토어는 계산만 한다.
 */
export function usePlaybackClock() {
  const playing = usePlaybackStore((state) => state.playing);

  useEffect(() => {
    if (!playing) return;

    let frame = 0;
    let previous = performance.now();

    const step = (now: number) => {
      usePlaybackStore.getState().advance(now - previous);
      previous = now;
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
}
