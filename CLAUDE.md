# CLAUDE.md

이 파일은 Claude Code가 매 작업에서 참조하는 상시 맥락입니다.
항상 지켜야 할 프로젝트 개요, 스택, 아키텍처 원칙, 데이터 모델, 컨벤션을 담습니다.
상세 기능 요구사항은 `docs/SPEC.md`를 참조하세요.

## 프로젝트 개요

선박 항적 데이터 뷰어. 데이터 분석가가 준 항적 데이터를 지도 위에 재생하여
"이 데이터가 실제로 말이 되는 항적인지" 눈으로 검증하는 프론트엔드 도구입니다.

- 백엔드 없음. 실시간 스트리밍 없음.
- 파일(주로 CSV)을 로드해서 시간순으로 재생하는 방식.
- 현 단계 핵심: 지도 위 선박 이동 애니메이션 + 위경도/속도 등 부가 정보 표시.
- 데이터 형식은 STR 시뮬레이터 컬럼 사전 기준으로 1차 대응 완료. 실 데이터가 오면
  매핑 테이블(`mapping.ts` / `trafficMapping.ts`)만 맞춥니다.

## 기술 스택

- React + TypeScript + Vite
- 상태관리: Zustand
- 스타일: Tailwind CSS
- 지도: Leaflet + KHOA 개방海 전자해도 WMS(키 있을 때) / CARTO + OpenSeaMap seamark(폴백)
- CSV 파싱: papaparse

## 핵심 데이터 모델

모든 데이터는 아래 표준 내부 모델로 통일합니다. 화면 코드는 이 모델만 알고,
원본 데이터의 컬럼명은 매핑 레이어에서 격리합니다. **정본은 `src/data/types.ts`** —
필드를 늘릴 때는 그쪽을 고치고, 여기는 요약만 유지합니다.

```typescript
// 자선
interface TrackPoint {
  timestamp: number;   // 유닉스 ms로 통일 (파싱 시 변환)
  lat: number;         // 위도 decimal degrees
  lon: number;         // 경도 decimal degrees
  sog?: number;        // 대지속력 knots (Speed Over Ground)
  cog?: number;        // 대지침로 deg (Course Over Ground)
  hdg?: number;        // 선수방위 deg (Heading)
  rot?: number;        // 선회율 (Rate of Turn)
  status?: string;     // 운항 상태 (auto/manual 등)

  // STR 데이터셋 대응 — 자율/안전, 해상 외란, 제어(명령 vs 실제)
  risk?, avoidFlag?, accident?
  windSpeed?, windDir?, waveHeight?, waveDir?, currentSpeed?, currentDir?
  rudderCmd?, rudderActual?, engineCmd?, engineActual?
}

// 타선/예인선 (traffic_N) — 자선과 별도 타입
interface TargetShip { id, name?, shipType?, length?, beam?, points: TargetPoint[] }
interface TargetPoint { timestamp, lat, lon, yaw?, turningRate?, tugEnable? }
```

`TrackPoint`는 **자선 표준 모델**이라는 계약이다. 타선 전용 필드를 여기 얹지 말고
`TargetShip` 쪽에 둔다.

## 아키텍처 원칙

1. **컬럼 매핑 레이어로 원본 형식을 격리한다.**
   원본 CSV 헤더가 `lat`이든 `latitude`든 `위도`든, 매핑 함수 하나가
   TrackPoint로 변환한다. 실제 데이터가 확정되면 이 매핑 테이블만 수정하고
   나머지 코드는 건드리지 않는다.

2. **데이터 없이도 개발 가능해야 한다.**
   `generateMockTrack()`이 그럴듯한 가짜 항적을 생성해서, 실제 데이터가
   없어도 지도 애니메이션과 재생을 확인할 수 있어야 한다.

3. **재생 엔진과 화면을 분리한다.**
   재생 엔진은 TrackPoint 배열과 현재 시각(재생 커서)만 관리하고,
   화면은 "현재 시각의 상태"를 구독해서 그린다.

4. **나중에 실시간 소스로 교체 가능한 여지를 남긴다.**
   지금은 파일 기반이지만, 데이터 공급 방식(파일 재생 vs 실시간)을
   화면과 분리해두면 나중에 확장할 때 화면을 재사용할 수 있다.

## 코딩 컨벤션

- 컴포넌트는 함수형 + Hooks.
- 화면에 표시되는 숫자는 항상 반올림 처리(위경도 소수 자릿수 고정, 속도 1자리 등).
- 각도(heading/cog)는 0~360 정규화.
- timestamp는 내부에서 항상 유닉스 ms. 표시할 때만 포맷.
- 사용자 커뮤니케이션은 한국어. 간결하고 직접적으로.

## 작업 기록 (집/회사 컴퓨터 간 이어가기)

여러 컴퓨터를 오가며 작업하므로, 세션 맥락을 `docs/PROGRESS.md`에 기록해
다음 세션이 어디서든 이어받을 수 있게 한다.

- **세션 시작 시**: 먼저 `docs/PROGRESS.md`를 읽고 마지막 상태/다음 할 일을 파악한다.
- **세션 종료 시(또는 의미 있는 단계 완료 시)**: `docs/PROGRESS.md`를 갱신한다.
    - 오늘 한 작업(완료된 것)
    - 현재 상태 / 마지막으로 건드린 파일
    - 다음에 할 일
    - 미해결 이슈나 결정 대기 중인 사항
- 갱신 후에는 Git으로 커밋·푸시해서 다른 컴퓨터와 동기화한다.
  (다른 컴퓨터에서 시작할 때는 먼저 pull)

`docs/PROGRESS.md`는 "지금 어디까지 왔나"의 단일 기록점이다. 최신 상태를
맨 위에 두고, 오래된 로그는 아래에 쌓는다.

## 파일 위치

모든 경로는 저장소 루트 기준.

- `CLAUDE.md` — 상시 맥락(이 파일)
- `README.md` — 개발자용 문서(구조·아키텍처·지도 배경 설정)
- `docs/SPEC.md` — 상세 요구사항
- `docs/PROGRESS.md` — 작업 로그
- `src/data/` — 데이터 레이어(모델, 컬럼 매핑, mock 생성)

## 브랜치

- `main` ← `dev` ← 작업 브랜치(`feat/*`). PR은 `dev`로 낸다.
- 머지된 `feat/*` 브랜치는 로컬·원격 모두 지운다.

## 향후 확장 (지금은 만들지 않음)

- 센서 상태 패널(GPS/AIS/RADAR/LiDAR/IMU)
- 실시간 데이터 소스 어댑터

## Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
