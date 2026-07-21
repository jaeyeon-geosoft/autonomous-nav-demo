# PROGRESS — 작업 로그

여러 컴퓨터를 오가며 작업하기 위한 진행 상황 기록.
세션 시작 시 이 파일을 먼저 읽고, 종료 시 갱신한 뒤 Git에 커밋·푸시할 것.
최신 상태를 맨 위에 둔다.

---

## 현재 상태 (최신)

- **단계**: 구현 순서 2번 완료 (CSV 로드/파싱)
- **마지막으로 건드린 파일**: `src/data/parseCsv.ts`, `src/components/FileLoader.tsx`, `src/App.tsx`
- **다음 할 일**: SPEC.md 구현 순서 3번 — 재생 엔진(zustand 스토어: 커서/재생상태/배속) + 보간 로직
- **미해결/대기**:
    - **브라우저 확인 미완료**: 2번 단계 UI를 실제 브라우저에서 클릭해본 적 없음.
      파싱 로직은 Node에서 전부 검증했으나 드래그앤드롭/렌더링은 눈으로 봐야 함.
      확인용 샘플 CSV는 scratchpad의 `sample-track.csv`
    - 실제 데이터 형식 미확정 (분석가가 나중에 CSV 제공 예정) → 확정되면
      CLAUDE.md 데이터 모델 + SPEC.md 컬럼 매핑 갱신
    - 디자인 방향: 우선 알아서 깔끔하게, 이후 다듬기.
      현재 App.tsx는 2번 확인용 임시 화면이며 4~6번에서 교체 예정
      (그때 SPEC의 `public/예시 디자인 *.png` + frontend-design skill 적용)
    - **git remote 없음** → push 불가. 집/회사 동기화가 아직 안 됨. 주소 확정 후 연결 필요
    - **인코딩**: 현재 UTF-8로만 읽음. 분석가가 EUC-KR CSV를 주면 한글 헤더(위도/경도)가
      깨져서 매핑 실패함. 실제 데이터 받고 나서 필요하면 대응

---

## 로그

### 2026-07-21 — 구현 순서 2번
- `src/data/parseCsv.ts`: `parseCsv(File | string)` + `summarizeParse()`
    - papaparse `header: true`, `dynamicTyping`은 끔(값 해석은 매핑 레이어 담당)
    - **결정**: File을 papaparse에 직접 넘기지 않고 `file.text()`로 읽어 문자열로 파싱.
      papaparse의 File 스트리밍 경로가 브라우저 전용 API(FileReaderSync)를 타서
      Node 테스트가 불가능했음. 문자열 경로 하나로 통일하니 브라우저/Node 동작이
      같아지고 테스트도 됨. 수백 MB급 파일이 들어오면 스트리밍으로 되돌릴 것
- `src/components/FileLoader.tsx`: 드래그앤드롭 + 파일 선택 + mock 버튼
- `src/App.tsx`: 2번 확인용 임시 화면(매핑 결과/앞 5개 포인트 표시)
- 스캐폴드 잔재 정리: `src/App.css` 삭제, `src/index.css`를 tailwind import만 남김
  (`#root { width: 1126px }` 등이 레이아웃과 충돌해서)
- 검증: Node에서 5개 케이스 통과 — 헤더 표기 혼재, 시간 역순 정렬, 필수 컬럼 누락,
  깨진 행/빈 값 제외, BOM+CRLF(엑셀 저장본), File 객체 경로.
  `tsc -b` / `eslint src` / `npm run build` 통과

### 2026-07-21 — 스택 의존성 설치 + 문서 경로 정리
- 설치: `zustand@5`, `leaflet@1.9`, `papaparse@5`
  / dev: `tailwindcss@4`, `@tailwindcss/vite@4`, `@types/leaflet`, `@types/papaparse`
- Tailwind는 v4라 설정 파일(`tailwind.config.js`) 없이 동작.
  `vite.config.ts`에 `tailwindcss()` 플러그인 + `src/index.css`에 `@import 'tailwindcss'` 추가.
  유틸리티가 실제로 생성되는지 빌드 산출물에서 확인함(`.flex`, `.gap-4` 등)
- CLAUDE.md의 `PROGRESS.md` 경로를 `docs/PROGRESS.md`로 수정하고
  "파일 위치" 절을 추가(루트가 한 단계 중첩되어 있어 다음 세션이 헷갈리지 않도록)

### 2026-07-21 — 구현 순서 1번
- `TrackPoint` 모델 정의 (`src/data/types.ts`)
- 컬럼 매핑 레이어 (`src/data/mapping.ts`)
    - `FIELD_ALIASES` 테이블 + 헤더 정규화(소문자, 공백/`_`/`-` 제거)
      → `speed_over_ground`, `Speed Over Ground` 모두 매칭
    - timestamp: 유닉스 초/ms/ISO 문자열 모두 ms로 통일 (1e11 기준 초/ms 판별)
    - 각도 0~360 정규화, timestamp 오름차순 정렬
    - 필수 필드(timestamp/lat/lon) 누락 시 `missingRequired`로 반환
    - **결정**: 위치를 못 만드는 행(timestamp/lat/lon 파싱 실패)은 버리고
      `droppedRows`로 개수만 보고. 7번 품질 검증의 "결측치"는 선택 필드 담당.
      전부 유지하려면 TrackPoint의 lat/lon을 optional로 바꿔야 해서 이렇게 감.
- `generateMockTrack()` (`src/data/mockTrack.ts`)
    - 부산항 앞 출항 → 완만한 S자, 기본 1시간/10초 간격/360포인트
    - 난수 미사용(매번 동일 결과)
    - 선회·가속 프로파일을 **경과 시간 기준**으로 계산.
      처음엔 인덱스 비율 기준이라 `count`를 바꾸면 항적 모양 자체가
      바뀌는 문제가 있어 수정함
- 검증: `tsc -b` 통과, `eslint src/data` 통과, 임시 스크립트로 매핑/mock 동작 확인

### (날짜) 세션 시작 전
- 프로젝트 스펙 정리: CLAUDE.md, SPEC.md 작성
- 스택 확정: React + TS + Vite + Zustand + Tailwind + Leaflet/OpenSeaMap