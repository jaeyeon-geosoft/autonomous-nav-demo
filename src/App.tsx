import { useState } from 'react';
import { FileLoader } from './components/FileLoader';
import { TrafficLoader } from './components/TrafficLoader';
import { MapView } from './components/MapView';
import { StatusPanel } from './components/StatusPanel';
import { IssueList } from './components/IssueList';
import { TargetList } from './components/TargetList';
import { TransportBar } from './components/TransportBar';
import { parseCsv, summarizeParse, type CsvParseResult } from './data/parseCsv';
import { parseTrafficCsv, summarizeTrafficParse } from './data/parseTraffic';
import { generateMockTrack } from './data/mockTrack';
import { generateMockTargets } from './data/mockTargets';
import { usePlaybackStore } from './playback/playbackStore';
import { usePlaybackClock } from './playback/usePlaybackClock';

function App() {
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [source, setSource] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [trafficError, setTrafficError] = useState<string | null>(null);

  const setPoints = usePlaybackStore((state) => state.setPoints);
  const setTargets = usePlaybackStore((state) => state.setTargets);
  const points = usePlaybackStore((state) => state.points);

  usePlaybackClock();

  const load = (parsed: CsvParseResult, label: string) => {
    setResult(parsed);
    setSource(label);
    setPoints(parsed.points);
    setError(parsed.missingRequired.length > 0 ? summarizeParse(parsed) : null);
    // 자선 항적이 바뀌면 이전 시나리오의 타선 데이터는 더 이상 맞지 않는다.
    setTargets([]);
    setTrafficError(null);
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
      '예시 항적',
    );
    // 예시 항적은 다중 선박 표시도 바로 확인할 수 있게 타선 mock을 같이 넣는다.
    setTargets(generateMockTargets(mock));
  };

  const handleTrafficFile = async (file: File) => {
    setTrafficError(null);
    try {
      const parsed = await parseTrafficCsv(file);
      if (parsed.missingRequired.length > 0 || parsed.ships.length === 0) {
        setTrafficError(summarizeTrafficParse(parsed));
        return;
      }
      setTargets(parsed.ships);
    } catch (cause) {
      setTrafficError(cause instanceof Error ? cause.message : '타선 파일을 읽지 못했습니다.');
    }
  };

  const loaded = points.length > 0;

  return (
    <div className="flex h-full flex-col bg-abyss">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-5 py-3">
        <h1 className="text-sm font-semibold tracking-wide text-ink">선박 항적 데이터 뷰어</h1>
        {result && (
          <p className="font-mono text-xs text-dim">
            <span className="text-ink">{source}</span> · {summarizeParse(result)}
          </p>
        )}
        {loaded && (
          <div className="ml-auto flex items-center gap-2">
            <TrafficLoader onFile={handleTrafficFile} />
            <FileLoader onFile={handleFile} onMock={handleMock} compact />
          </div>
        )}
      </header>

      {error && (
        <p className="border-b border-alert/40 bg-alert/10 px-5 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      {trafficError && (
        <p className="border-b border-alert/40 bg-alert/10 px-5 py-2 text-sm text-alert">
          타선 데이터: {trafficError}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="relative min-h-100 flex-1">
          <MapView />

          {!loaded && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center bg-abyss/85 p-6">
              <div className="w-full max-w-md">
                <FileLoader onFile={handleFile} onMock={handleMock} />
              </div>
            </div>
          )}
        </main>

        <aside className="w-full shrink-0 overflow-y-auto border-t border-hairline bg-deep lg:w-80 lg:border-t-0 lg:border-l">
          <StatusPanel />
          <IssueList />
          <TargetList />
        </aside>
      </div>

      {loaded && (
        <footer className="border-t border-hairline bg-deep">
          <TransportBar />
        </footer>
      )}
    </div>
  );
}

export default App;
