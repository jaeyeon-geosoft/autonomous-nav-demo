import { useRef, useState } from 'react';

interface FileLoaderProps {
  onFile: (file: File) => void;
  onMock: () => void;
  /** 헤더에 놓이는 축소형. 데이터를 이미 불러온 뒤에 쓴다. */
  compact?: boolean;
  /** 파일을 읽는 동안(큰 CSV일수록 시간이 걸림) 재요청을 막고 로딩 중임을 알린다. */
  loading?: boolean;
}

/** CSV 파일을 드래그앤드롭 또는 파일 선택으로 받는다. */
export function FileLoader({ onFile, onMock, compact = false, loading = false }: FileLoaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const picker = (
    <input
      ref={inputRef}
      type="file"
      accept=".csv,text/csv"
      className="hidden"
      disabled={loading}
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) onFile(file);
        // 같은 파일을 다시 선택해도 change가 발생하도록 초기화
        event.target.value = '';
      }}
    />
  );

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {loading && <span className="font-mono text-xs text-track">불러오는 중…</span>}
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="rounded border border-hairline px-3 py-1.5 text-xs text-dim transition-colors hover:border-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-track disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-hairline disabled:hover:text-dim"
        >
          다른 파일
        </button>
        {picker}
      </div>
    );
  }

  return (
    <div
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (loading) return;
        const file = event.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      className={`rounded-lg border border-dashed p-10 text-center transition-colors ${
        dragging ? 'border-track bg-track/5' : 'border-hairline bg-deep/80'
      }`}
    >
      <p className="text-sm text-ink">
        {loading ? '불러오는 중…' : '항적 CSV 파일을 여기에 놓으세요'}
      </p>
      <p className="mt-1 text-xs text-dim">
        timestamp · 위도 · 경도 컬럼이 있으면 헤더 이름이 달라도 인식합니다
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="rounded bg-track px-4 py-2 text-sm font-medium text-abyss transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-track disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
        >
          파일 선택
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onMock}
          className="rounded border border-hairline px-4 py-2 text-sm text-dim transition-colors hover:border-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-track disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-hairline disabled:hover:text-dim"
        >
          예시 항적으로 둘러보기
        </button>
      </div>
      {picker}
    </div>
  );
}
