import { useRef, useState } from 'react';

interface FileLoaderProps {
  onFile: (file: File) => void;
  onMock: () => void;
}

/** CSV 파일을 드래그앤드롭 또는 파일 선택으로 받는다. */
export function FileLoader({ onFile, onMock }: FileLoaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        dragging ? 'border-sky-400 bg-sky-950/40' : 'border-slate-700 bg-slate-900/40'
      }`}
    >
      <p className="text-slate-300">항적 CSV 파일을 여기에 놓거나</p>
      <div className="mt-3 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-500"
        >
          파일 선택
        </button>
        <button
          type="button"
          onClick={onMock}
          className="rounded bg-slate-700 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-600"
        >
          mock 데이터로 확인
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          // 같은 파일을 다시 선택해도 change가 발생하도록 초기화
          event.target.value = '';
        }}
      />
    </div>
  );
}
