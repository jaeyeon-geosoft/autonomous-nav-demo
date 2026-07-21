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
}

export type TrackField = keyof TrackPoint;
