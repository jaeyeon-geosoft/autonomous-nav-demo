import type { TrackPoint } from './types';
import { normalizeAngle } from './mapping';

const KNOTS_TO_MS = 0.514444;
const METERS_PER_DEG_LAT = 111320;
/** 출항 가속에 걸리는 시간. 너무 길면 재생 초반이 정지 화면처럼 보인다. */
const RAMP_UP_SEC = 180;
/** S자 선회 한 주기 */
const TURN_PERIOD_SEC = 2400;

export interface MockTrackOptions {
  count?: number;
  intervalSec?: number;
  startTime?: number;
  startLat?: number;
  startLon?: number;
}

/**
 * 실제 데이터 없이 지도/재생을 확인하기 위한 가짜 항적.
 * 부산항 앞바다에서 출항해 완만한 S자로 항해하는 1시간 구간.
 * 매번 같은 결과가 나오도록 난수를 쓰지 않는다.
 */
export function generateMockTrack(options: MockTrackOptions = {}): TrackPoint[] {
  const {
    count = 360,
    intervalSec = 10,
    startTime = Date.now(),
    startLat = 35.05,
    startLon = 129.1,
  } = options;

  const points: TrackPoint[] = [];
  let lat = startLat;
  let lon = startLon;

  for (let i = 0; i < count; i += 1) {
    // 프로파일은 경과 시간 기준. count/intervalSec은 구간 길이와 샘플 간격만 바꾸고
    // 항적의 모양(가속 구간, 선회 주기)은 바꾸지 않는다.
    const elapsedSec = i * intervalSec;
    const turnPhase = (elapsedSec / TURN_PERIOD_SEC) * Math.PI * 2;

    // 출항 가속(0→12kn) 후 완만한 속력 변화.
    const sog =
      12 * Math.min(elapsedSec / RAMP_UP_SEC, 1) - 1.5 * Math.sin(turnPhase / 1.5);
    // 기준 침로 45°에서 좌우로 완만하게 도는 S자.
    const cog = normalizeAngle(45 + 35 * Math.sin(turnPhase));
    // 선수방위는 침로보다 약간 앞서 돈다(표류각).
    const hdg = normalizeAngle(cog + 2.5 * Math.cos(turnPhase));
    // 타각은 S자 선회 방향을 따라간다. 명령은 실제보다 살짝 앞서 반응한다.
    const rudderCmd = 12 * Math.cos(turnPhase);
    const rudderActual = 12 * Math.cos(turnPhase - 0.15);
    // 진행 구간 40~55%에서 잠깐 근접상황(위험도 상승 + 회피 동작)을 흉내낸다.
    const nearMissPhase = elapsedSec / (count * intervalSec);
    const inNearMiss = nearMissPhase > 0.4 && nearMissPhase < 0.55;
    const risk = inNearMiss
      ? 0.55 + 0.4 * Math.sin(((nearMissPhase - 0.4) / 0.15) * Math.PI)
      : 0.1 + 0.05 * Math.sin(turnPhase / 3);

    points.push({
      timestamp: startTime + i * intervalSec * 1000,
      lat: Number(lat.toFixed(6)),
      lon: Number(lon.toFixed(6)),
      sog: Number(sog.toFixed(1)),
      cog: Number(cog.toFixed(1)),
      hdg: Number(hdg.toFixed(1)),
      risk: Number(risk.toFixed(2)),
      avoidFlag: inNearMiss,
      windSpeed: Number((6 + 1.5 * Math.sin(turnPhase / 4)).toFixed(1)),
      windDir: normalizeAngle(200 + 10 * Math.sin(turnPhase / 5)),
      waveHeight: Number((0.8 + 0.2 * Math.sin(turnPhase / 3)).toFixed(1)),
      waveDir: normalizeAngle(210 + 8 * Math.cos(turnPhase / 5)),
      currentSpeed: Number((0.4 + 0.1 * Math.cos(turnPhase / 6)).toFixed(2)),
      currentDir: normalizeAngle(30 + 15 * Math.sin(turnPhase / 7)),
      rudderCmd: Number(rudderCmd.toFixed(1)),
      rudderActual: Number(rudderActual.toFixed(1)),
      engineCmd: Number((sog * 8).toFixed(0)),
      engineActual: Number((sog * 8 * 0.97).toFixed(0)),
    });

    // 이번 구간의 속력·침로로 다음 위치를 적분.
    const distance = sog * KNOTS_TO_MS * intervalSec;
    const radians = (cog * Math.PI) / 180;
    lat += (distance * Math.cos(radians)) / METERS_PER_DEG_LAT;
    lon +=
      (distance * Math.sin(radians)) /
      (METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  }

  return points;
}
