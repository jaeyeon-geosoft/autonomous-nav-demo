import type { TrackPoint, TargetPoint } from './types';
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

  risk?: number;
  avoidFlag?: boolean;
  accident?: boolean;

  windSpeed?: number;
  windDir?: number;
  waveHeight?: number;
  waveDir?: number;
  currentSpeed?: number;
  currentDir?: number;

  rudderCmd?: number;
  rudderActual?: number;
  engineCmd?: number;
  engineActual?: number;
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

  if (from.risk !== undefined) {
    state.risk = to.risk !== undefined ? lerp(from.risk, to.risk, ratio) : from.risk;
  }
  // 플래그는 보간하지 않는다 — 구간 시작 포인트의 값을 그대로 쓴다.
  state.avoidFlag = from.avoidFlag;
  state.accident = from.accident;

  if (from.windSpeed !== undefined) {
    state.windSpeed = to.windSpeed !== undefined ? lerp(from.windSpeed, to.windSpeed, ratio) : from.windSpeed;
  }
  if (from.windDir !== undefined) {
    state.windDir = to.windDir !== undefined ? lerpAngle(from.windDir, to.windDir, ratio) : from.windDir;
  }
  if (from.waveHeight !== undefined) {
    state.waveHeight = to.waveHeight !== undefined ? lerp(from.waveHeight, to.waveHeight, ratio) : from.waveHeight;
  }
  if (from.waveDir !== undefined) {
    state.waveDir = to.waveDir !== undefined ? lerpAngle(from.waveDir, to.waveDir, ratio) : from.waveDir;
  }
  if (from.currentSpeed !== undefined) {
    state.currentSpeed =
      to.currentSpeed !== undefined ? lerp(from.currentSpeed, to.currentSpeed, ratio) : from.currentSpeed;
  }
  if (from.currentDir !== undefined) {
    state.currentDir =
      to.currentDir !== undefined ? lerpAngle(from.currentDir, to.currentDir, ratio) : from.currentDir;
  }
  if (from.rudderCmd !== undefined) {
    state.rudderCmd = to.rudderCmd !== undefined ? lerp(from.rudderCmd, to.rudderCmd, ratio) : from.rudderCmd;
  }
  if (from.rudderActual !== undefined) {
    state.rudderActual =
      to.rudderActual !== undefined ? lerp(from.rudderActual, to.rudderActual, ratio) : from.rudderActual;
  }
  if (from.engineCmd !== undefined) {
    state.engineCmd = to.engineCmd !== undefined ? lerp(from.engineCmd, to.engineCmd, ratio) : from.engineCmd;
  }
  if (from.engineActual !== undefined) {
    state.engineActual =
      to.engineActual !== undefined ? lerp(from.engineActual, to.engineActual, ratio) : from.engineActual;
  }

  return state;
}

/** 재생 커서 시각에서의 타선/예인선 상태. */
export interface TargetState {
  lat: number;
  lon: number;
  heading: number;
  tugEnable?: boolean;
}

/**
 * 타선(TargetShip) 상태 보간. 자선의 interpolateAt과 달리 클램프하지 않는다 —
 * 커서가 이 선박의 데이터 구간 밖이면 null을 반환해 화면에서 사라지게 한다
 * (시나리오 중간에 등장/퇴장하는 선박을 표현하기 위함).
 */
export function interpolateTargetAt(points: TargetPoint[], timestamp: number): TargetState | null {
  if (points.length === 0) return null;

  const start = points[0].timestamp;
  const end = points[points.length - 1].timestamp;
  if (timestamp < start || timestamp > end) return null;

  const index = findSegment(points, timestamp);
  const from = points[index];
  const to = points[index + 1];

  if (!to) {
    const previous = points[index - 1];
    return {
      lat: from.lat,
      lon: from.lon,
      heading: from.yaw ?? (previous ? bearing(previous, from) : 0),
      tugEnable: from.tugEnable,
    };
  }

  const segmentSpan = to.timestamp - from.timestamp;
  const ratio = segmentSpan > 0 ? (timestamp - from.timestamp) / segmentSpan : 0;

  return {
    lat: lerp(from.lat, to.lat, ratio),
    lon: lerp(from.lon, to.lon, ratio),
    heading:
      from.yaw !== undefined
        ? lerpAngle(from.yaw, to.yaw ?? from.yaw, ratio)
        : bearing(from, to),
    tugEnable: from.tugEnable,
  };
}
