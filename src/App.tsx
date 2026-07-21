import { useState } from 'react';
import { FileLoader } from './components/FileLoader';
import { parseCsv, summarizeParse, type CsvParseResult } from './data/parseCsv';
import { generateMockTrack } from './data/mockTrack';

/**
 * 2번 단계 확인용 임시 화면.
 * 지도/재생 UI가 들어오는 4~6번 단계에서 교체된다.
 */
function App() {
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [source, setSource] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    try {
      setResult(await parseCsv(file));
      setSource(file.name);
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : '파일을 읽지 못했습니다.');
    }
  };

  const handleMock = () => {
    setError(null);
    const points = generateMockTrack();
    setResult({
      points,
      columns: {},
      missingRequired: [],
      droppedRows: 0,
      parseErrors: [],
      totalRows: points.length,
    });
    setSource('mock 데이터');
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
          <div className="flex flex-col gap-4 text-sm">
            <p className="text-slate-400">
              <span className="text-slate-200">{source}</span> — {summarizeParse(result)}
            </p>

            {Object.keys(result.columns).length > 0 && (
              <div>
                <h2 className="mb-1 font-medium text-slate-300">컬럼 매핑</h2>
                <ul className="text-slate-400">
                  {Object.entries(result.columns).map(([field, column]) => (
                    <li key={field}>
                      {field} ← {column}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.parseErrors.length > 0 && (
              <ul className="text-amber-400">
                {result.parseErrors.slice(0, 5).map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}

            {result.points.length > 0 && (
              <div>
                <h2 className="mb-1 font-medium text-slate-300">앞 5개 포인트</h2>
                <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-400">
                  {result.points
                    .slice(0, 5)
                    .map(
                      (point) =>
                        `${new Date(point.timestamp).toISOString()}  ` +
                        `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}  ` +
                        `sog ${point.sog ?? '—'}  hdg ${point.hdg ?? '—'}`,
                    )
                    .join('\n')}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
