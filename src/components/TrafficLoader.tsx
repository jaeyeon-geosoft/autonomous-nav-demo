import { useRef } from 'react';

interface TrafficLoaderProps {
  onFile: (file: File) => void;
}

/** 타선/예인선 트래픽 CSV를 자선 항적과 별개로 불러오는 축소형 버튼. FileLoader의 compact 변형과 같은 패턴. */
export function TrafficLoader({ onFile }: TrafficLoaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded border border-hairline px-3 py-1.5 text-xs text-dim transition-colors hover:border-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-track"
      >
        타선 데이터
      </button>
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
