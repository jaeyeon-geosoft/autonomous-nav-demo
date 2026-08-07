import type { TrackPoint, TargetShip, TargetPoint } from './types';
import { normalizeAngle } from './mapping';

const METERS_PER_DEG_LAT = 111320;
const METERS_PER_NM = 1852;

/**
 * 예시 항적(mockTrack)의 근접상황 구간(진행 40~55%)에 맞춰 타선 1척이
 * 자선 항로를 가로질러 지나가게 하는 mock 데이터. 실제 traffic CSV 없이도
 * 다중 선박 표시(등장→퇴장)를 확인하기 위한 용도.
 */
export function generateMockTargets(ownTrack: TrackPoint[]): TargetShip[] {
  if (ownTrack.length === 0) return [];

  const start = ownTrack[0].timestamp;
  const end = ownTrack[ownTrack.length - 1].timestamp;
  const span = end - start;
  if (span <= 0) return [];

  // mockTrack.ts의 근접상황 구간(40~55%)보다 조금 넉넉하게 등장/퇴장시킨다.
  const enterAt = start + span * 0.35;
  const exitAt = start + span * 0.6;

  const nearIndex = Math.round(ownTrack.length * 0.475);
  const near = ownTrack[Math.min(nearIndex, ownTrack.length - 1)];

  // 자선 진행 방향(45°)과 대략 수직으로 가로지르는 직선 항로.
  const crossingBearing = 135;
  const bearingRad = (crossingBearing * Math.PI) / 180;

  const steps = 20;
  const points: TargetPoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const ratio = i / steps;
    const timestamp = Math.round(enterAt + (exitAt - enterAt) * ratio);
    const offsetM = (ratio - 0.5) * 1.2 * METERS_PER_NM; // 자선 위치 기준 -0.6~+0.6해리
    const dx = offsetM * Math.sin(bearingRad);
    const dy = offsetM * Math.cos(bearingRad);
    const lat = near.lat + dy / METERS_PER_DEG_LAT;
    const lon = near.lon + dx / (METERS_PER_DEG_LAT * Math.cos((near.lat * Math.PI) / 180));

    points.push({
      timestamp,
      lat: Number(lat.toFixed(6)),
      lon: Number(lon.toFixed(6)),
      yaw: normalizeAngle(crossingBearing),
    });
  }

  return [
    {
      id: 'MOCK-TARGET-1',
      name: 'DEMO TARGET',
      shipType: '어선',
      length: 45,
      beam: 9,
      points,
    },
  ];
}

