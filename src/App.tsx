import { useState } from 'react';
import { FileLoader } from './components/FileLoader';
import { parseCsv, summarizeParse, type CsvParseResult } from './data/parseCsv';
import { generateMockTrack } from './data/mockTrack';
import {
  usePlaybackStore,
  useCurrentState,
  selectStartTime,
  selectEndTime,
  SPEEDS,
} from './playback/playbackStore';
import { usePlaybackClock } from './playback/usePlaybackClock';

const formatTime = (ms: number) => new Date(ms).toISOString().slice(11, 19);

/**
 * 3번 단계 확인용 임시 화면.
 * 지도와 제대로 된 재생 컨트롤이 들어오는 4~6번 단계에서 교체된다.
 */
function App() {
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [source, setSource] = useState('');
  const [error, setError] = useState<string | null>(null);

  const setPoints = usePlaybackStore((state) => state.setPoints);
  const points = usePlaybackStore((state) => state.points);
  const cursor = usePlaybackStore((state) => state.cursor);
  const playing = usePlaybackStore((state) => state.playing);
  const speed = usePlaybackStore((state) => state.speed);
  const togglePlay = usePlaybackStore((state) => state.togglePlay);
  const setSpeed = usePlaybackStore((state) => state.setSpeed);
  const seek = usePlaybackStore((state) => state.seek);
  const reset = usePlaybackStore((state) => state.reset);
  const current = useCurrentState();
  const startTime = usePlaybackStore(selectStartTime);
  const endTime = usePlaybackStore(selectEndTime);

  usePlaybackClock();

  const load = (parsed: CsvParseResult, label: string) => {
    setResult(parsed);
    setSource(label);
    setPoints(parsed.points);
  };

  const handleFile = async (file: File) => {
    setError(null);
    try {
      load(await parseCsv(file), file.name);
    } catch (cause) {
      setResult(null);
      setPoints([]);
      setError(cause instanceof Error ? cause.message : '파일을 읽지 못했습니다.');
    }
  };

  const handleMock = () => {
    setError(null);
    const mock = generateMockTrack();
    load(
      {
        points: mock,
        columns: {},
        missingRequired: [],
        droppedRows: 0,
        parseErrors: [],
        totalRows: mock.length,
      },
      'mock 데이터',
    );
  };

  return (
    <div className="min-h-full bg-slate-950 p-8 text-slate-200">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <h1 className="text-xl font-semibold text-white">선박 항적 데이터 뷰어</h1>

        <FileLoader onFile={handleFile} onMock={handleMock} />

        {error && (
          <p className="rounded border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {result && (
          <p className="text-sm text-slate-400">
            <span className="text-slate-200">{source}</span> — {summarizeParse(result)}
          </p>
        )}

        {points.length > 0 && (
          <div className="flex flex-col gap-4 rounded-lg bg-slate-900/60 p-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="w-20 rounded bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-500"
              >
                {playing ? '일시정지' : '재생'}
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
              >
                처음으로
              </button>
              <div className="ml-2 flex gap-1">
                {SPEEDS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSpeed(value)}
                    className={`rounded px-2.5 py-1.5 text-sm ${
                      speed === value
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {value}x
                  </button>
                ))}
              </div>
              <span className="ml-auto font-mono text-sm text-slate-400">
                {formatTime(cursor)} / {formatTime(endTime)}
              </span>
            </div>

            <input
              type="range"
              min={startTime}
              max={endTime}
              value={cursor}
              onChange={(event) => seek(Number(event.target.value))}
              className="w-full accent-sky-500"
            />

            {current && (
              <dl className="grid grid-cols-3 gap-x-6 gap-y-2 font-mono text-sm">
                <Field label="위도" value={current.lat.toFixed(5)} />
                <Field label="경도" value={current.lon.toFixed(5)} />
                <Field label="진행률" value={`${(current.progress * 100).toFixed(1)}%`} />
                <Field label="SOG" value={current.sog?.toFixed(1) ?? '—'} />
                <Field label="HDG" value={current.hdg?.toFixed(0) ?? '—'} />
                <Field
                  label="마커 방향"
                  value={`${current.heading.toFixed(0)}°`}
                />
                <Field label="포인트" value={`${current.index + 1} / ${points.length}`} />
              </dl>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  );
}

export default App;
