import { useMemo } from 'react';
import { create } from 'zustand';
import type { TrackPoint } from '../data/types';
import { interpolateAt, type TrackState } from '../data/interpolate';

export const SPEEDS = [1, 5, 10] as const;
export type Speed = (typeof SPEEDS)[number];

interface PlaybackStore {
  points: TrackPoint[];
  /** 재생 커서. 항상 유닉스 ms(데이터의 실제 시각). */
  cursor: number;
  playing: boolean;
  speed: Speed;

  setPoints: (points: TrackPoint[]) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: Speed) => void;
  seek: (timestamp: number) => void;
  reset: () => void;
  /** 실제 경과 시간(ms)만큼 배속을 곱해 커서를 전진시킨다. */
  advance: (elapsedMs: number) => void;
}

const firstTime = (points: TrackPoint[]) => points[0]?.timestamp ?? 0;
const lastTime = (points: TrackPoint[]) => points[points.length - 1]?.timestamp ?? 0;

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  points: [],
  cursor: 0,
  playing: false,
  speed: 1,

  setPoints: (points) => set({ points, cursor: firstTime(points), playing: false }),

  play: () => {
    const { points, cursor } = get();
    if (points.length === 0) return;
    // 끝에 도달한 상태에서 재생하면 처음부터 다시 시작한다.
    set({ playing: true, cursor: cursor >= lastTime(points) ? firstTime(points) : cursor });
  },

  pause: () => set({ playing: false }),

  togglePlay: () => (get().playing ? get().pause() : get().play()),

  setSpeed: (speed) => set({ speed }),

  seek: (timestamp) => {
    const { points } = get();
    if (points.length === 0) return;
    const clamped = Math.min(Math.max(timestamp, firstTime(points)), lastTime(points));
    set({ cursor: clamped });
  },

  reset: () => set({ cursor: firstTime(get().points), playing: false }),

  advance: (elapsedMs) => {
    const { points, cursor, speed, playing } = get();
    if (!playing || points.length === 0) return;
    const end = lastTime(points);
    const next = cursor + elapsedMs * speed;
    // 끝에 닿으면 멈춘다.
    if (next >= end) set({ cursor: end, playing: false });
    else set({ cursor: next });
  },
}));

export const selectStartTime = (state: PlaybackStore) => firstTime(state.points);
export const selectEndTime = (state: PlaybackStore) => lastTime(state.points);

/**
 * 현재 커서 시각의 선박 상태. 화면은 이걸 구독한다.
 *
 * 셀렉터(`usePlaybackStore(s => interpolateAt(...))`)로 만들면 안 된다.
 * interpolateAt은 매번 새 객체를 반환하는데 zustand는 스냅샷을 Object.is로
 * 비교하므로, 렌더마다 값이 바뀐 것으로 판단해 무한 렌더 루프에 빠진다.
 * 원시값만 구독하고 파생 객체는 useMemo로 만든다.
 */
export function useCurrentState(): TrackState | null {
  const points = usePlaybackStore((state) => state.points);
  const cursor = usePlaybackStore((state) => state.cursor);
  return useMemo(() => interpolateAt(points, cursor), [points, cursor]);
}
