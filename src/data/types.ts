/** 화면 코드가 아는 유일한 항적 모델. 원본 컬럼명은 mapping.ts에서 격리한다. */
export interface TrackPoint {
  timestamp: number; // 유닉스 ms
  lat: number; // 위도 decimal degrees
  lon: number; // 경도 decimal degrees
  sog?: number; // 대지속력 knots
  cog?: number; // 대지침로 deg
  hdg?: number; // 선수방위 deg
  rot?: number; // 선회율
  status?: string; // 운항 상태

  // 자율/안전
  risk?: number; // 위험도 수치 (CRI 등)
  avoidFlag?: boolean; // 회피 동작 수행 중 여부
  accident?: boolean; // 사고/충돌 발생 여부

  // 해상 외란
  windSpeed?: number; // 풍속 m/s
  windDir?: number; // 풍향 deg
  waveHeight?: number; // 파고 m
  waveDir?: number; // 파향 deg
  currentSpeed?: number; // 유속 m/s
  currentDir?: number; // 유향 deg

  // 제어(타/엔진) 명령값 vs 실제값
  rudderCmd?: number; // 타각 명령 deg
  rudderActual?: number; // 타각 실제 응답 deg
  engineCmd?: number; // 엔진 출력 명령
  engineActual?: number; // 엔진 출력 실제 상태
}

export type TrackField = keyof TrackPoint;

/**
 * 주변 타선/예인선(traffic_숫자 테이블)의 한 시점 상태.
 * 자선(TrackPoint)과 달리 클램프하지 않는다 — 그 선박의 데이터 구간 밖이면
 * 화면에서 사라지는 게 맞다(중간에 등장/퇴장하는 선박이라).
 */
export interface TargetPoint {
  timestamp: number; // 유닉스 ms
  lat: number;
  lon: number;
  yaw?: number; // 선수각 deg (마커 방향에 씀)
  turningRate?: number; // 선회율 deg/s
  tugEnable?: boolean; // 예인선으로 동작 중인지
}

/** 하나의 타선/예인선과 그 항적. */
export interface TargetShip {
  id: string;
  name?: string;
  shipType?: string;
  length?: number; // m
  beam?: number; // m
  points: TargetPoint[]; // timestamp 오름차순
}
