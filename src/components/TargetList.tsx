import { usePlaybackStore } from '../playback/playbackStore';

/** 로드된 타선/예인선 목록. 지도 위 마커를 일일이 호버하지 않아도 뭐가 있는지 한눈에 보이게. */
export function TargetList() {
  const targets = usePlaybackStore((state) => state.targets);

  if (targets.length === 0) return null;

  return (
    <div className="border-t border-hairline p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] tracking-wide text-dim">타선 · 예인선</span>
        <span className="font-mono text-sm text-ink">{targets.length}척</span>
      </div>

      <ul className="mt-2 flex flex-col gap-1">
        {targets.map((ship) => (
          <li key={ship.id} className="flex items-baseline justify-between gap-2 font-mono text-xs">
            <span className="text-ink">{ship.name ?? ship.id}</span>
            {ship.shipType && <span className="text-dim">{ship.shipType}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
