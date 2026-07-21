import type { TrackPoint } from './types';
import { normalizeAngle } from './mapping';

/** 재생 커서 시각에서의 선박 상태. 화면은 이것만 구독해서 그린다. */
export interface TrackState {
  timestamp: number;
  lat: number;
  lon: number;
  sog?: number;
  cog?: number;
  hdg?: number;
  /** 마커가 향할 방향. hdg → cog → 진행 방향 순으로 결정한다. */
  heading: number;
  /** 커서가 속한 구간의 시작 포인트 인덱스 */
  index: number;
  /** 전체 구간 중 진행률 0~1 */
  progress: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * 두 각도 사이를 최단 경로로 보간한다.
 * 359° → 1°은 2°만 움직여야지, 반대로 358°를 돌면 안 된다.
 */
export function lerpAngle(from: number, to: number, ratio: number): number {
  const delta = ((to - from + 540) % 360) - 180;
  return normalizeAngle(from + delta * ratio);
}

/**
 * 두 지점 사이의 진행 방향(대권항로 초기 방위각).
 *
 * 같은 위도의 동쪽 점이라도 정확히 90°가 나오지 않는다. 위도 35°에서는 89.7°.
 * 대권항로가 북쪽으로 살짝 치우쳐 출발하기 때문이며 버그가 아니다.
 * (정확히 90°가 필요하면 항정선 공식을 써야 하지만, 항적 포인트 간격에서는
 *  차이가 0.3° 수준이라 마커 방향에는 영향이 없다.)
 */
export function bearing(from: TrackPoint, to: TrackPoint): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLon = toRad(to.lon - from.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return normalizeAngle(toDeg(Math.atan2(y, x)));
}

/** timestamp 이하인 마지막 포인트의 인덱스 (이진 탐색). */
function findSegment(points: TrackPoint[], timestamp: number): number {
  let low = 0;
  let high = points.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (points[mid].timestamp <= timestamp) low = mid;
    else high = mid - 1;
  }
  return low;
}

const lerp = (from: number, to: number, ratio: number) => from + (to - from) * ratio;

/**
 * 주어진 시각의 선박 상태를 인접 두 포인트에서 보간해 만든다.
 * 구간 밖의 시각은 양 끝으로 클램프한다.
 */
export function interpolateAt(points: TrackPoint[], timestamp: number): TrackState | null {
  if (points.length === 0) return null;

  const start = points[0].timestamp;
  const end = points[points.length - 1].timestamp;
  const span = end - start;
  const clamped = Math.min(Math.max(timestamp, start), end);
  const progress = span > 0 ? (clamped - start) / span : 0;

  const index = findSegment(points, clamped);
  const from = points[index];
  const to = points[index + 1];

  // 마지막 포인트에 도달했으면 보간할 다음 구간이 없다.
  if (!to) {
    const previous = points[index - 1];
    return {
      ...from,
      heading: from.hdg ?? from.cog ?? (previous ? bearing(previous, from) : 0),
      index,
      progress,
    };
  }

  const segmentSpan = to.timestamp - from.timestamp;
  // 같은 시각의 포인트가 연달아 있으면 앞 포인트를 그대로 쓴다.
  const ratio = segmentSpan > 0 ? (clamped - from.timestamp) / segmentSpan : 0;

  const state: TrackState = {
    timestamp: clamped,
    lat: lerp(from.lat, to.lat, ratio),
    lon: lerp(from.lon, to.lon, ratio),
    heading: 0,
    index,
    progress,
  };

  if (from.sog !== undefined) {
    state.sog = to.sog !== undefined ? lerp(from.sog, to.sog, ratio) : from.sog;
  }
  if (from.cog !== undefined) {
    state.cog = to.cog !== undefined ? lerpAngle(from.cog, to.cog, ratio) : from.cog;
  }
  if (from.hdg !== undefined) {
    state.hdg = to.hdg !== undefined ? lerpAngle(from.hdg, to.hdg, ratio) : from.hdg;
  }

  state.heading = state.hdg ?? state.cog ?? bearing(from, to);

  return state;
}
