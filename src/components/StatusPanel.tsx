import { useMemo } from 'react';
import { usePlaybackStore, useCurrentState } from '../playback/playbackStore';
import { formatDateTime, orDash } from '../format';
import type { TrackPoint } from '../data/types';

const ENV_FIELDS = ['windSpeed', 'windDir', 'waveHeight', 'waveDir', 'currentSpeed', 'currentDir'] as const;
const CONTROL_FIELDS = ['rudderCmd', 'rudderActual', 'engineCmd', 'engineActual'] as const;

/** 데이터셋에 해당 필드가 하나라도 있는지. 전혀 없는 컬럼군은 섹션 자체를 숨긴다. */
function hasAnyField(points: TrackPoint[], fields: readonly (keyof TrackPoint)[]): boolean {
  return points.some((point) => fields.some((field) => point[field] !== undefined));
}

/** 큰 값 + 작은 라벨. 계기판처럼 값이 먼저 읽히게 한다. */
function Readout({
  label,
  value,
  unit,
  wide = false,
}: {
  label: string;
  value: string;
  unit?: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <div className="text-[11px] tracking-wide text-dim">{label}</div>
      <div className="font-mono text-2xl leading-tight text-ink">
        {value}
        {unit && <span className="ml-1 text-sm text-dim">{unit}</span>}
      </div>
    </div>
  );
}

export function StatusPanel() {
  const current = useCurrentState();
  const points = usePlaybackStore((state) => state.points);
  const total = points.length;

  const hasEnv = useMemo(() => hasAnyField(points, ENV_FIELDS), [points]);
  const hasControl = useMemo(() => hasAnyField(points, CONTROL_FIELDS), [points]);

  if (!current) {
    return (
      <p className="p-5 text-sm text-dim">
        데이터를 불러오면 현재 시각의 위치와 속력이 표시됩니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <div className="text-[11px] tracking-wide text-dim">현재 시각</div>
        <div className="font-mono text-sm text-ink">{formatDateTime(current.timestamp)}</div>
      </div>

      {(current.accident || current.avoidFlag) && (
        <div className="flex gap-2">
          {current.accident && (
            <span className="rounded border border-alert/50 bg-alert/10 px-2 py-1 font-mono text-xs text-alert">
              사고 발생
            </span>
          )}
          {current.avoidFlag && (
            <span className="rounded border border-alert/50 bg-alert/10 px-2 py-1 font-mono text-xs text-alert">
              회피 동작 중
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        <Readout label="위도 LAT" value={current.lat.toFixed(5)} unit="°" />
        <Readout label="경도 LON" value={current.lon.toFixed(5)} unit="°" />
        <Readout label="대지속력 SOG" value={orDash(current.sog, 1)} unit="kn" />
        <Readout label="선수방위 HDG" value={orDash(current.hdg, 0)} unit="°" />
        <Readout label="대지침로 COG" value={orDash(current.cog, 0)} unit="°" />
        <Readout label="마커 방향" value={current.heading.toFixed(0)} unit="°" />
        <Readout label="위험도 RISK" value={orDash(current.risk, 2)} />
      </div>

      {hasEnv && (
        <div className="border-t border-hairline pt-4">
          <div className="text-[11px] tracking-wide text-dim">해상 외란</div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-5">
            <Readout label="풍속 WIND" value={orDash(current.windSpeed, 1)} unit="m/s" />
            <Readout label="풍향 WIND" value={orDash(current.windDir, 0)} unit="°" />
            <Readout label="파고 WAVE" value={orDash(current.waveHeight, 1)} unit="m" />
            <Readout label="파향 WAVE" value={orDash(current.waveDir, 0)} unit="°" />
            <Readout label="유속 CURR" value={orDash(current.currentSpeed, 1)} unit="m/s" />
            <Readout label="유향 CURR" value={orDash(current.currentDir, 0)} unit="°" />
          </div>
        </div>
      )}

      {hasControl && (
        <div className="border-t border-hairline pt-4">
          <div className="text-[11px] tracking-wide text-dim">타/엔진 (명령 → 실제)</div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-5">
            <Readout label="타각 명령" value={orDash(current.rudderCmd, 1)} unit="°" />
            <Readout label="타각 실제" value={orDash(current.rudderActual, 1)} unit="°" />
            <Readout label="엔진 명령" value={orDash(current.engineCmd, 0)} />
            <Readout label="엔진 실제" value={orDash(current.engineActual, 0)} />
          </div>
        </div>
      )}

      <div className="border-t border-hairline pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] tracking-wide text-dim">진행률</span>
          <span className="font-mono text-sm text-ink">
            {(current.progress * 100).toFixed(1)}%
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-[11px] tracking-wide text-dim">포인트</span>
          <span className="font-mono text-sm text-ink">
            {current.index + 1} <span className="text-dim">/ {total}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
