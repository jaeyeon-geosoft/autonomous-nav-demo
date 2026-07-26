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
