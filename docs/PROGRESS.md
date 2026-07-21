# PROGRESS — 작업 로그

여러 컴퓨터를 오가며 작업하기 위한 진행 상황 기록.
세션 시작 시 이 파일을 먼저 읽고, 종료 시 갱신한 뒤 Git에 커밋·푸시할 것.
최신 상태를 맨 위에 둔다.

---

## 현재 상태 (최신)

- **단계**: 구현 순서 1번 완료 (모델 + 매핑 + mock)
- **마지막으로 건드린 파일**: `src/data/types.ts`, `src/data/mapping.ts`, `src/data/mockTrack.ts`
- **다음 할 일**: SPEC.md 구현 순서 2번 — CSV 로드/파싱 → TrackPoint[] 변환
  (papaparse 설치 필요. 매핑 레이어는 이미 객체 행 배열을 받게 되어 있어
  papaparse `header: true` 결과를 `mapRowsToTrack`에 그대로 넘기면 된다)
- **미해결/대기**:
    - 실제 데이터 형식 미확정 (분석가가 나중에 CSV 제공 예정) → 확정되면
      CLAUDE.md 데이터 모델 + SPEC.md 컬럼 매핑 갱신
    - 디자인 방향: 우선 알아서 깔끔하게, 이후 다듬기
    - 스택 의존성 미설치: zustand, tailwind, leaflet, papaparse
      (1번 단계는 순수 TS라 불필요했음. 각 단계에서 필요할 때 설치)
    - 문서 경로 주의: 실제 프로젝트 루트는 중첩된 `autonomous-nav-demo/`,
      PROGRESS.md는 루트가 아니라 `docs/`에 있음.
      CLAUDE.md 73번째 줄은 `PROGRESS.md`로만 적혀 있어 헷갈림 → 정리 필요

---

## 로그

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