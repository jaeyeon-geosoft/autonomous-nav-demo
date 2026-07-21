import { usePlaybackStore, useCurrentState } from '../playback/playbackStore';
import { formatDateTime, orDash } from '../format';

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
  const total = usePlaybackStore((state) => state.points.length);

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

      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        <Readout label="위도 LAT" value={current.lat.toFixed(5)} unit="°" />
        <Readout label="경도 LON" value={current.lon.toFixed(5)} unit="°" />
        <Readout label="대지속력 SOG" value={orDash(current.sog, 1)} unit="kn" />
        <Readout label="선수방위 HDG" value={orDash(current.hdg, 0)} unit="°" />
        <Readout label="대지침로 COG" value={orDash(current.cog, 0)} unit="°" />
        <Readout label="마커 방향" value={current.heading.toFixed(0)} unit="°" />
      </div>

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
