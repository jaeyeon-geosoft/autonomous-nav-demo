import { usePlaybackStore } from '../playback/playbackStore';
import { countByKind, type IssueKind } from '../data/quality';
import { formatClock } from '../format';

const KIND_LABEL: Record<IssueKind, string> = {
  accident: '사고 발생',
  avoid: '회피 동작',
  jump: '위치 점프',
  missing: '결측치',
  time: '시각 이상',
  range: '범위 벗어남',
};

const KIND_ORDER: IssueKind[] = ['accident', 'avoid', 'jump', 'time', 'range', 'missing'];

export function IssueList() {
  const points = usePlaybackStore((state) => state.points);
  const issues = usePlaybackStore((state) => state.issues);
  const cursor = usePlaybackStore((state) => state.cursor);
  const seek = usePlaybackStore((state) => state.seek);

  if (points.length === 0) return null;

  // 정상은 조용하게: 이상이 없으면 차분한 청록으로 한 줄만.
  if (issues.length === 0) {
    return (
      <div className="border-t border-hairline p-5">
        <div className="text-[11px] tracking-wide text-dim">품질 · 이벤트</div>
        <div className="mt-1 font-mono text-sm text-track">이상/이벤트 없음 · {points.length}개 포인트</div>
      </div>
    );
  }

  const counts = countByKind(issues);

  return (
    <div className="border-t border-hairline p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] tracking-wide text-dim">품질 · 이벤트</span>
        <span className="font-mono text-sm text-alert">{issues.length}건</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-dim">
        {KIND_ORDER.filter((kind) => counts[kind] > 0).map((kind) => (
          <span key={kind}>
            {KIND_LABEL[kind]} <span className="text-alert">{counts[kind]}</span>
          </span>
        ))}
      </div>

      <ul className="mt-3 flex flex-col gap-1">
        {issues.map((issue, i) => {
          const active = Math.abs(cursor - issue.timestamp) < 1;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => seek(issue.timestamp)}
                className={`flex w-full items-baseline gap-2 rounded border-l-2 py-1.5 pr-2 pl-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-alert ${
                  active
                    ? 'border-alert bg-alert/10'
                    : 'border-alert/50 hover:bg-alert/10'
                }`}
              >
                <span className="font-mono text-xs text-dim tabular-nums">
                  {formatClock(issue.timestamp)}
                </span>
                <span className="text-xs text-ink">{issue.message}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
