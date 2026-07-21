import { useEffect, useMemo, useRef } from 'react';
import { usePlaybackStore } from '../playback/playbackStore';
import { formatClock } from '../format';

// SVG 사용자 좌표. preserveAspectRatio="none"로 가로/세로를 각각 늘려 채운다.
const W = 1000;
const H = 100;

/**
 * 속력 프로파일 리본. 타임라인 스크러버를 겸한다.
 *
 * 재생 전에 "수상한 구간이 먼저 보이게" 하는 이 도구의 시그니처.
 * 속력을 시간축 위에 그리고, 이상 지점을 마젠타 눈금으로 얹는다.
 * 클릭/드래그로 임의 시점 점프.
 *
 * 커서선은 재생 중 매 프레임 움직이므로 React 상태로 두지 않고
 * 스토어를 직접 구독해 SVG 요소만 명령형으로 갱신한다(MapView와 같은 이유).
 */
export function SpeedRibbon() {
  const points = usePlaybackStore((state) => state.points);
  const issues = usePlaybackStore((state) => state.issues);
  const seek = usePlaybackStore((state) => state.seek);

  const svgRef = useRef<SVGSVGElement>(null);
  const cursorRef = useRef<SVGLineElement>(null);
  const draggingRef = useRef(false);

  const geom = useMemo(() => {
    if (points.length === 0) return null;
    const start = points[0].timestamp;
    const end = points[points.length - 1].timestamp;
    const span = end - start || 1;
    const x = (t: number) => ((t - start) / span) * W;

    const withSpeed = points.filter((p) => p.sog !== undefined);
    const maxSog = withSpeed.reduce((m, p) => Math.max(m, p.sog!), 0);
    const y = (s: number) => (maxSog > 0 ? H - (s / maxSog) * H : H);

    const coords = withSpeed.map((p) => `${x(p.timestamp).toFixed(1)},${y(p.sog!).toFixed(1)}`);
    const line = coords.length ? `M${coords.join(' L')}` : '';
    const area =
      coords.length >= 2
        ? `M${x(withSpeed[0].timestamp).toFixed(1)},${H} L${coords.join(' L')} L${x(
            withSpeed[withSpeed.length - 1].timestamp,
          ).toFixed(1)},${H} Z`
        : '';

    const ticks = issues.map((issue) => x(issue.timestamp));
    return { start, end, span, line, area, ticks, maxSog };
  }, [points, issues]);

  // 커서선을 스토어에서 직접 갱신. points가 바뀌면 setPoints가 구독자를 깨워 시작점으로 리셋된다.
  useEffect(() => {
    const update = (state: { points: typeof points; cursor: number }) => {
      const pts = state.points;
      const el = cursorRef.current;
      if (pts.length === 0 || !el) return;
      const start = pts[0].timestamp;
      const span = pts[pts.length - 1].timestamp - start || 1;
      const cx = ((state.cursor - start) / span) * W;
      el.setAttribute('x1', String(cx));
      el.setAttribute('x2', String(cx));
      svgRef.current?.setAttribute('aria-valuetext', formatClock(state.cursor));
    };
    update(usePlaybackStore.getState());
    return usePlaybackStore.subscribe(update);
  }, []);

  if (!geom) return null;

  const seekFromClientX = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    seek(geom.start + ratio * (geom.end - geom.start));
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const { cursor } = usePlaybackStore.getState();
    const step = geom.span / 100;
    if (event.key === 'ArrowLeft') seek(cursor - step);
    else if (event.key === 'ArrowRight') seek(cursor + step);
    else if (event.key === 'Home') seek(geom.start);
    else if (event.key === 'End') seek(geom.end);
    else return;
    event.preventDefault();
  };

  return (
    <div className="flex flex-1 items-center gap-3">
      <span className="font-mono text-xs text-dim tabular-nums">{formatClock(geom.start)}</span>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="slider"
        tabIndex={0}
        aria-label="속력 프로파일 · 재생 위치"
        aria-valuemin={geom.start}
        aria-valuemax={geom.end}
        className="h-12 flex-1 cursor-pointer touch-none rounded border border-hairline bg-abyss focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-track"
        onPointerDown={(event) => {
          draggingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          seekFromClientX(event.clientX);
        }}
        onPointerMove={(event) => {
          if (draggingRef.current) seekFromClientX(event.clientX);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        onKeyDown={handleKeyDown}
      >
        {geom.area && <path d={geom.area} fill="#35e0c4" fillOpacity={0.18} />}
        {geom.line && (
          <path
            d={geom.line}
            fill="none"
            stroke="#35e0c4"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {geom.ticks.map((tx, i) => (
          <line
            key={i}
            x1={tx}
            x2={tx}
            y1={0}
            y2={H}
            stroke="#ff3d9a"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <line
          ref={cursorRef}
          x1={0}
          x2={0}
          y1={0}
          y2={H}
          stroke="#dbe7f0"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <span className="font-mono text-xs text-dim tabular-nums">{formatClock(geom.end)}</span>
    </div>
  );
}
