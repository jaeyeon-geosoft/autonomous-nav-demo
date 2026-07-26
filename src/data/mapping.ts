import type { TrackPoint, TrackField } from './types';

/**
 * 원본 헤더 → 표준 필드 매핑. 실제 데이터 형식이 확정되면
 * 이 테이블만 고치고 나머지 코드는 건드리지 않는다.
 * 별칭은 normalizeHeader를 거친 형태(소문자, 공백/언더스코어/하이픈 제거)로 적는다.
 */
const FIELD_ALIASES: Record<TrackField, string[]> = {
  timestamp: [
    'timestamp', 'time', 'datetime', 'ts', 'utc', '시간', '시각', '일시',
    'time[s]', 'time(sec)',
  ],
  lat: ['lat', 'latitude', '위도', 'latitude[deg]', 'gpslat[deg]'],
  lon: ['lon', 'lng', 'long', 'longitude', '경도', 'longitude[deg]', 'gpslon[deg]'],
  sog: ['sog', 'speed', 'speedoverground', '속력', '속도'],
  cog: ['cog', 'course', 'courseoverground', '침로', '대지침로'],
  hdg: ['hdg', 'heading', 'trueheading', '선수방위', '방위', 'gyroheading[deg]'],
  rot: ['rot', 'rateofturn', 'turnrate', '선회율', 'turningrate[deg/s]'],
  status: ['status', 'navstatus', 'navigationstatus', 'mode', '상태', '운항상태', 'steeringmode'],

  // STR 시뮬레이션 데이터셋(InstData) 컬럼명 — docs/str 데이터 분석.xlsx 참고
  risk: ['risk', '위험도'],
  avoidFlag: ['avoidflag', '회피동작플래그', '회피플래그'],
  accident: ['accident', '사고플래그', '사고'],
  windSpeed: ['windspeed[m/s]', 'wind(m/sec)'],
  windDir: ['winddir[deg]', 'wind(deg)'],
  waveHeight: ['waveheight[m]', 'wave(m)'],
  waveDir: ['wavedir[deg]', 'wave(deg)'],
  currentSpeed: ['currentdrift[m/s]', 'curr(m/sec)'],
  currentDir: ['currentset[deg]', 'curr(deg)'],
  rudderCmd: ['crudcmd[deg]', 'prudcmd[deg]', 'srudcmd[deg]'],
  rudderActual: ['crudder[deg]', 'prudder[deg]', 'prudder(deg)', 'srudder[deg]', 'srudder(deg)'],
  engineCmd: ['cengcmd', 'pengcmd', 'sengcmd'],
  engineActual: ['cengine', 'pengine', 'sengine'],
};

const REQUIRED_FIELDS: TrackField[] = ['timestamp', 'lat', 'lon'];

export interface MappingResult {
  points: TrackPoint[];
  /** 표준 필드가 원본의 어떤 컬럼에서 왔는지 (사용자 확인/디버깅용) */
  columns: Partial<Record<TrackField, string>>;
  /** 매핑에 실패한 필수 필드. 비어있지 않으면 points는 빈 배열. */
  missingRequired: TrackField[];
  /** timestamp/lat/lon을 숫자로 읽지 못해 버린 행 수 */
  droppedRows: number;
}

const normalizeHeader = (header: string): string =>
  header.trim().toLowerCase().replace(/[\s_-]/g, '');

/** 각도를 0~360으로 정규화. */
export const normalizeAngle = (deg: number): number => ((deg % 360) + 360) % 360;

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** 0/1 플래그 컬럼(Accident, AvoidFlag)을 boolean으로. */
function parseFlag(value: unknown): boolean | undefined {
  const asNumber = parseNumber(value);
  if (asNumber !== undefined) return asNumber !== 0;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
  }
  return undefined;
}

/**
 * 유닉스 초/밀리초, ISO 문자열을 모두 유닉스 ms로 통일.
 * 1e11 미만의 숫자는 초 단위로 본다(1e11ms = 1973년, 1e11s = 5138년).
 */
function parseTimestamp(value: unknown): number | undefined {
  const asNumber = parseNumber(value);
  if (asNumber !== undefined) {
    return asNumber < 1e11 ? asNumber * 1000 : asNumber;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/** 원본 헤더 목록에서 표준 필드별로 쓸 컬럼을 고른다. */
export function resolveColumns(headers: string[]): Partial<Record<TrackField, string>> {
  const byNormalized = new Map<string, string>();
  for (const header of headers) {
    const key = normalizeHeader(header);
    // 같은 이름이 여러 번 나오면 첫 번째를 쓴다.
    if (!byNormalized.has(key)) byNormalized.set(key, header);
  }

  const columns: Partial<Record<TrackField, string>> = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [TrackField, string[]][]) {
    const hit = aliases.find((alias) => byNormalized.has(alias));
    if (hit) columns[field] = byNormalized.get(hit);
  }
  return columns;
}

/** papaparse 등에서 온 객체 행들을 TrackPoint[]로 변환한다. */
export function mapRowsToTrack(rows: Record<string, unknown>[]): MappingResult {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const columns = resolveColumns(headers);
  const missingRequired = REQUIRED_FIELDS.filter((field) => !columns[field]);

  if (missingRequired.length > 0) {
    return { points: [], columns, missingRequired, droppedRows: 0 };
  }

  const points: TrackPoint[] = [];
  let droppedRows = 0;

  for (const row of rows) {
    const timestamp = parseTimestamp(row[columns.timestamp!]);
    const lat = parseNumber(row[columns.lat!]);
    const lon = parseNumber(row[columns.lon!]);

    // 위치를 못 만드는 행은 버린다. 이상값 판정(범위 밖 등)은 품질 검증 단계의 몫.
    if (timestamp === undefined || lat === undefined || lon === undefined) {
      droppedRows += 1;
      continue;
    }

    const point: TrackPoint = { timestamp, lat, lon };

    const sog = columns.sog ? parseNumber(row[columns.sog]) : undefined;
    if (sog !== undefined) point.sog = sog;

    const cog = columns.cog ? parseNumber(row[columns.cog]) : undefined;
    if (cog !== undefined) point.cog = normalizeAngle(cog);

    const hdg = columns.hdg ? parseNumber(row[columns.hdg]) : undefined;
    if (hdg !== undefined) point.hdg = normalizeAngle(hdg);

    const rot = columns.rot ? parseNumber(row[columns.rot]) : undefined;
    if (rot !== undefined) point.rot = rot;

    const status = columns.status ? row[columns.status] : undefined;
    if (typeof status === 'string' && status.trim() !== '') point.status = status.trim();

    const risk = columns.risk ? parseNumber(row[columns.risk]) : undefined;
    if (risk !== undefined) point.risk = risk;

    const avoidFlag = columns.avoidFlag ? parseFlag(row[columns.avoidFlag]) : undefined;
    if (avoidFlag !== undefined) point.avoidFlag = avoidFlag;

    const accident = columns.accident ? parseFlag(row[columns.accident]) : undefined;
    if (accident !== undefined) point.accident = accident;

    const windSpeed = columns.windSpeed ? parseNumber(row[columns.windSpeed]) : undefined;
    if (windSpeed !== undefined) point.windSpeed = windSpeed;

    const windDir = columns.windDir ? parseNumber(row[columns.windDir]) : undefined;
    if (windDir !== undefined) point.windDir = normalizeAngle(windDir);

    const waveHeight = columns.waveHeight ? parseNumber(row[columns.waveHeight]) : undefined;
    if (waveHeight !== undefined) point.waveHeight = waveHeight;

    const waveDir = columns.waveDir ? parseNumber(row[columns.waveDir]) : undefined;
    if (waveDir !== undefined) point.waveDir = normalizeAngle(waveDir);

    const currentSpeed = columns.currentSpeed ? parseNumber(row[columns.currentSpeed]) : undefined;
    if (currentSpeed !== undefined) point.currentSpeed = currentSpeed;

    const currentDir = columns.currentDir ? parseNumber(row[columns.currentDir]) : undefined;
    if (currentDir !== undefined) point.currentDir = normalizeAngle(currentDir);

    const rudderCmd = columns.rudderCmd ? parseNumber(row[columns.rudderCmd]) : undefined;
    if (rudderCmd !== undefined) point.rudderCmd = rudderCmd;

    const rudderActual = columns.rudderActual ? parseNumber(row[columns.rudderActual]) : undefined;
    if (rudderActual !== undefined) point.rudderActual = rudderActual;

    const engineCmd = columns.engineCmd ? parseNumber(row[columns.engineCmd]) : undefined;
    if (engineCmd !== undefined) point.engineCmd = engineCmd;

    const engineActual = columns.engineActual ? parseNumber(row[columns.engineActual]) : undefined;
    if (engineActual !== undefined) point.engineActual = engineActual;

    points.push(point);
  }

  points.sort((a, b) => a.timestamp - b.timestamp);

  return { points, columns, missingRequired, droppedRows };
}
