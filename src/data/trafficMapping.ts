import type { TargetPoint, TargetShip } from './types';
import { normalizeHeader, normalizeAngle, parseNumber, parseTimestamp } from './mapping';

/**
 * traffic_숫자 테이블(주변 타선 + 예인선) 컬럼 → TargetShip 매핑.
 * 별칭은 mapping.ts와 같은 규칙(normalizeHeader를 거친 형태)을 따른다.
 * 실제 데이터가 오면 이 테이블만 고치면 된다.
 */
const TRAFFIC_ALIASES = {
  timestamp: ['timestamp', 'time', 'time[s]', 'time(sec)'],
  id: ['id', 'shipid', '선박식별id'],
  name: ['shipname', '선박명'],
  shipType: ['shiptype', '선박종류'],
  length: ['shiplength[m]'],
  beam: ['shipbeam[m]'],
  lat: ['lat', 'latitude', 'latitude[deg]', '위도'],
  lon: ['lon', 'longitude', 'longitude[deg]', '경도'],
  yaw: ['yaw[deg]', 'yaw'],
  turningRate: ['turningrate[deg/s]'],
  tugEnable: ['tugenable'],
} as const;

type TrafficField = keyof typeof TRAFFIC_ALIASES;

const REQUIRED_FIELDS: TrafficField[] = ['timestamp', 'id', 'lat', 'lon'];

export interface TrafficMappingResult {
  ships: TargetShip[];
  columns: Partial<Record<TrafficField, string>>;
  missingRequired: TrafficField[];
  droppedRows: number;
}

function resolveColumns(headers: string[]): Partial<Record<TrafficField, string>> {
  const byNormalized = new Map<string, string>();
  for (const header of headers) {
    const key = normalizeHeader(header);
    if (!byNormalized.has(key)) byNormalized.set(key, header);
  }

  const columns: Partial<Record<TrafficField, string>> = {};
  for (const [field, aliases] of Object.entries(TRAFFIC_ALIASES) as [TrafficField, readonly string[]][]) {
    const hit = aliases.find((alias) => byNormalized.has(alias));
    if (hit) columns[field] = byNormalized.get(hit);
  }
  return columns;
}

function parseFlag(value: unknown): boolean | undefined {
  const asNumber = parseNumber(value);
  if (asNumber !== undefined) return asNumber !== 0;
  return undefined;
}

/** papaparse 등에서 온 객체 행들을 TargetShip[]로 변환한다(ID별로 그룹핑). */
export function mapRowsToTraffic(rows: Record<string, unknown>[]): TrafficMappingResult {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const columns = resolveColumns(headers);
  const missingRequired = REQUIRED_FIELDS.filter((field) => !columns[field]);

  if (missingRequired.length > 0) {
    return { ships: [], columns, missingRequired, droppedRows: 0 };
  }

  const byId = new Map<string, TargetShip>();
  let droppedRows = 0;

  for (const row of rows) {
    const timestamp = parseTimestamp(row[columns.timestamp!]);
    const lat = parseNumber(row[columns.lat!]);
    const lon = parseNumber(row[columns.lon!]);
    const idRaw = row[columns.id!];
    const id = idRaw === undefined || idRaw === null ? '' : String(idRaw).trim();

    if (timestamp === undefined || lat === undefined || lon === undefined || id === '') {
      droppedRows += 1;
      continue;
    }

    let ship = byId.get(id);
    if (!ship) {
      ship = { id, points: [] };
      byId.set(id, ship);
    }

    // 이름/종류/제원은 선박당 값 하나. 아직 없으면 채운다(행마다 반복 제공되는 경우도, 처음 한 번만인 경우도 대응).
    if (ship.name === undefined && columns.name) {
      const name = row[columns.name];
      if (typeof name === 'string' && name.trim() !== '') ship.name = name.trim();
    }
    if (ship.shipType === undefined && columns.shipType) {
      const shipType = row[columns.shipType];
      if (typeof shipType === 'string' && shipType.trim() !== '') ship.shipType = shipType.trim();
    }
    if (ship.length === undefined && columns.length) {
      const length = parseNumber(row[columns.length]);
      if (length !== undefined) ship.length = length;
    }
    if (ship.beam === undefined && columns.beam) {
      const beam = parseNumber(row[columns.beam]);
      if (beam !== undefined) ship.beam = beam;
    }

    const point: TargetPoint = { timestamp, lat, lon };

    const yaw = columns.yaw ? parseNumber(row[columns.yaw]) : undefined;
    if (yaw !== undefined) point.yaw = normalizeAngle(yaw);

    const turningRate = columns.turningRate ? parseNumber(row[columns.turningRate]) : undefined;
    if (turningRate !== undefined) point.turningRate = turningRate;

    const tugEnable = columns.tugEnable ? parseFlag(row[columns.tugEnable]) : undefined;
    if (tugEnable !== undefined) point.tugEnable = tugEnable;

    ship.points.push(point);
  }

  const ships = [...byId.values()];
  for (const ship of ships) {
    ship.points.sort((a, b) => a.timestamp - b.timestamp);
  }

  return { ships, columns, missingRequired, droppedRows };
}
