const pad = (value: number) => String(value).padStart(2, '0');

/**
 * 화면 표시는 브라우저 로컬 시각 기준.
 * 원본 CSV에 타임존이 없으면 파싱 단계에서도 로컬로 해석되므로 기준을 맞춘다.
 */
export function formatClock(ms: number): string {
  const date = new Date(ms);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatDateTime(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${formatClock(ms)}`;
}

/** 구간 길이를 사람이 읽는 형태로. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
}

/** 값이 없으면 대시로. 화면에 undefined가 새어나가지 않게 한군데서 처리. */
export function orDash(
  value: number | undefined,
  digits: number,
  suffix = '',
): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}${suffix}`;
}
