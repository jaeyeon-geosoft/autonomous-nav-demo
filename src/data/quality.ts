import type { TrackPoint } from './types';

/**
 * 데이터 품질 이상 유형.
 * - jump: 인접 포인트 간 역산 속력이 비현실적으로 큼(위치 튐 의심)
 * - missing: 데이터셋에 대체로 존재하는 선택 필드가 이 포인트에서만 비어있음
 * - time: 시각 역전/중복, 또는 지나치게 큰 공백
 * - range: 위경도/속도/각도가 물리적으로 불가능한 범위
 */
export type IssueKind = 'jump' | 'missing' | 'time' | 'range';

export interface Issue {
  kind: IssueKind;
  /** 이슈가 걸린 포인트 인덱스. 구간 이슈(jump)는 뒤쪽 포인트 인덱스. */
  index: number;
  /** 이 이슈로 점프할 커서 시각(ms). */
  timestamp: number;
  /** 사람이 읽는 설명. */
  message: string;
}

/** 이 속력(kn)을 넘는 역산 속력은 위치 튐으로 본다. 웬만한 선박 최고속의 상한. */
const MAX_SPEED_KNOTS = 60;
/** 정상 간격(중앙값)의 몇 배를 넘으면 큰 공백으로 볼지. */
const GAP_FACTOR = 8;
/** 이 비율 이상 존재하는 선택 필드만 결측 검사 대상으로 삼는다. */
const EXPECTED_PRESENCE = 0.5;

const OPTIONAL_FIELDS = ['sog', 'cog', 'hdg'] as const;
const FIELD_LABEL: Record<(typeof OPTIONAL_FIELDS)[number], string> = {
  sog: 'SOG',
  cog: 'COG',
  hdg: 'HDG',
};

const R_EARTH_M = 6371000;
const M_PER_S_TO_KNOTS = 1 / 0.514444;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** 두 지점 간 대권 거리(m). */
function haversine(a: TrackPoint, b: TrackPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 인접 timestamp 간격의 중앙값(ms). 큰 공백 판정의 기준. */
function medianInterval(points: TrackPoint[]): number {
  const diffs: number[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const dt = points[i].timestamp - points[i - 1].timestamp;
    if (dt > 0) diffs.push(dt);
  }
  if (diffs.length === 0) return 0;
  diffs.sort((a, b) => a - b);
  return diffs[Math.floor(diffs.length / 2)];
}

function formatGap(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}초`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}분`;
  return `${(min / 60).toFixed(1)}시간`;
}

const mk = (kind: IssueKind, index: number, point: TrackPoint, message: string): Issue => ({
  kind,
  index,
  timestamp: point.timestamp,
  message,
});

/**
 * 항적 전체를 스캔해 이상 구간을 찾는다. 순수 함수 — 화면과 무관하게 검증 가능.
 * 반환 순서는 포인트 순서(=시간순)를 따른다.
 */
export function findIssues(points: TrackPoint[]): Issue[] {
  const issues: Issue[] = [];
  if (points.length === 0) return issues;

  // "있어야 할" 선택 필드만 결측 검사한다. 아예 제공되지 않은 컬럼(예: cog 없음)을
  // 매 포인트 결측으로 보고하면 목록이 소음으로 뒤덮인다.
  const expected = OPTIONAL_FIELDS.filter((field) => {
    const present = points.reduce((n, p) => (p[field] !== undefined ? n + 1 : n), 0);
    return present >= points.length * EXPECTED_PRESENCE;
  });

  const median = medianInterval(points);

  points.forEach((point, i) => {
    // 범위 벗어남
    if (point.lat < -90 || point.lat > 90) {
      issues.push(mk('range', i, point, `위도 범위 벗어남 (${point.lat})`));
    }
    if (point.lon < -180 || point.lon > 180) {
      issues.push(mk('range', i, point, `경도 범위 벗어남 (${point.lon})`));
    }
    if (point.sog !== undefined && point.sog < 0) {
      issues.push(mk('range', i, point, `속력 음수 (${point.sog}kn)`));
    }
    for (const field of ['cog', 'hdg'] as const) {
      const v = point[field];
      if (v !== undefined && (v < 0 || v >= 360)) {
        issues.push(mk('range', i, point, `${FIELD_LABEL[field]} 각도 범위 벗어남 (${v}°)`));
      }
    }

    // 결측치
    for (const field of expected) {
      if (point[field] === undefined) {
        issues.push(mk('missing', i, point, `${FIELD_LABEL[field]} 결측`));
      }
    }

    if (i === 0) return;
    const prev = points[i - 1];
    const dt = point.timestamp - prev.timestamp;

    // timestamp 이상
    if (dt < 0) {
      issues.push(mk('time', i, point, '시각 역전(이전보다 과거)'));
    } else if (dt === 0) {
      issues.push(mk('time', i, point, '시각 중복'));
    } else if (median > 0 && dt > median * GAP_FACTOR) {
      issues.push(mk('time', i, point, `시각 공백 ${formatGap(dt)}`));
    }

    // 위치 점프
    if (dt > 0) {
      const speedKn = (haversine(prev, point) / (dt / 1000)) * M_PER_S_TO_KNOTS;
      if (speedKn > MAX_SPEED_KNOTS) {
        issues.push(mk('jump', i, point, `위치 점프 (역산 ${Math.round(speedKn)}kn)`));
      }
    }
  });

  return issues;
}

/** 유형별 개수. 품질 요약에 쓴다. */
export function countByKind(issues: Issue[]): Record<IssueKind, number> {
  const counts: Record<IssueKind, number> = { jump: 0, missing: 0, time: 0, range: 0 };
  for (const issue of issues) counts[issue.kind] += 1;
  return counts;
}
