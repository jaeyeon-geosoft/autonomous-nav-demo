import { useState } from 'react';
import { FileLoader } from './components/FileLoader';
import { MapView } from './components/MapView';
import { StatusPanel } from './components/StatusPanel';
import { IssueList } from './components/IssueList';
import { TransportBar } from './components/TransportBar';
import { parseCsv, summarizeParse, type CsvParseResult } from './data/parseCsv';
import { generateMockTrack } from './data/mockTrack';
import { usePlaybackStore } from './playback/playbackStore';
import { usePlaybackClock } from './playback/usePlaybackClock';

function App() {
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [source, setSource] = useState('');
  const [error, setError] = useState<string | null>(null);

  const setPoints = usePlaybackStore((state) => state.setPoints);
  const points = usePlaybackStore((state) => state.points);

  usePlaybackClock();

  const load = (parsed: CsvParseResult, label: string) => {
    setResult(parsed);
    setSource(label);
    setPoints(parsed.points);
    setError(parsed.missingRequired.length > 0 ? summarizeParse(parsed) : null);
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
          <div className="ml-auto">
            <FileLoader onFile={handleFile} onMock={handleMock} compact />
          </div>
        )}
      </header>

      {error && (
        <p className="border-b border-alert/40 bg-alert/10 px-5 py-2 text-sm text-alert">
          {error}
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
