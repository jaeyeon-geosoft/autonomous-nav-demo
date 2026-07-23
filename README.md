# 선박 항적 데이터 뷰어

항적 데이터(주로 CSV)를 지도 위에 시간순으로 재생하여, **"이 데이터가 실제로
말이 되는 항적인지"** 를 눈으로 검증하는 프론트엔드 도구입니다.

- 백엔드 없음 · 실시간 스트리밍 없음 — 파일을 로드해서 재생하는 방식
- 지도 위 선박 이동 애니메이션 + 위경도/속도/침로 등 부가 정보 표시
- 데이터 품질 자동 검증(위치 점프·시각 이상·범위 벗어남·결측치)

> 최종 사용자(데이터 분석가)용 사용법은 [`선박항적뷰어-사용법.docx`](선박항적뷰어-사용법.docx) 참고.
> 이 README는 **개발자**를 위한 문서입니다.

## 기술 스택

| 영역 | 사용 |
|---|---|
| 프레임워크 | React 19 + TypeScript + Vite |
| 상태관리 | Zustand |
| 스타일 | Tailwind CSS |
| 지도 | Leaflet (+ KHOA 전자해도 / OpenSeaMap 폴백) |
| CSV 파싱 | papaparse |

## 빠른 시작

```bash
npm install      # 의존성 설치 (최초 1회)
npm run dev      # 개발 서버 (기본 http://localhost:5173)
npm run build    # 타입체크(tsc -b) + 프로덕션 빌드
npm run lint     # ESLint
npm run preview  # 빌드 결과 미리보기
```

데이터가 없어도 화면의 **"예시 항적으로 둘러보기"** 로 mock 항적을 재생해 볼 수 있습니다.

## 프로젝트 구조

```
src/
├─ App.tsx                 # 화면 조립 + 파일/mock 로드 진입점
├─ format.ts               # 표시용 숫자/시각 포맷
├─ components/
│  ├─ FileLoader.tsx       # CSV 드래그앤드롭 / 파일 선택
│  ├─ MapView.tsx          # Leaflet 지도, 마커 이동/회전, 항적 polyline
│  ├─ StatusPanel.tsx      # 현재 시각의 위경도/속도/침로 패널
│  ├─ IssueList.tsx        # 데이터 품질 이슈 목록(클릭 시 해당 시각으로 이동)
│  ├─ SpeedRibbon.tsx      # 속력 프로파일 리본
│  └─ TransportBar.tsx     # 재생/정지·배속·타임라인
├─ data/                   # ── 데이터 레이어 (화면과 분리) ──
│  ├─ types.ts             # 표준 내부 모델 TrackPoint
│  ├─ mapping.ts           # 원본 컬럼 → TrackPoint 매핑(별칭 테이블)
│  ├─ parseCsv.ts          # papaparse 래퍼
│  ├─ mockTrack.ts         # 가짜 항적 생성 generateMockTrack()
│  ├─ interpolate.ts       # 커서 시각의 선박 상태 보간
│  └─ quality.ts           # 항적 품질 검증 findIssues()
└─ playback/               # ── 재생 엔진 (화면과 분리) ──
   ├─ playbackStore.ts     # zustand 스토어(커서·배속·재생상태)
   └─ usePlaybackClock.ts  # requestAnimationFrame 시간 진행
```

## 핵심 아키텍처

원칙과 상세는 [`CLAUDE.md`](CLAUDE.md)에 있습니다. 요약:

1. **컬럼 매핑 레이어로 원본 형식을 격리한다.**
   원본 헤더가 `lat`이든 `latitude`든 `위도`든, `data/mapping.ts`의 별칭 테이블 하나가
   표준 모델 `TrackPoint`로 변환한다. 실제 데이터가 확정되면 **이 테이블만** 수정한다.

2. **데이터 없이도 개발 가능하다.**
   `generateMockTrack()`이 그럴듯한 가짜 항적을 만들어, 데이터 없이 지도·재생을 확인할 수 있다.

3. **재생 엔진과 화면을 분리한다.**
   `playback/`은 TrackPoint 배열과 재생 커서만 관리하고, 화면은 "현재 시각의 상태"를
   구독해서 그린다. (재생 중 매 프레임 리렌더를 피하려고 `MapView`는 스토어를 직접 구독해
   Leaflet 객체만 갱신한다 — 코드 주석 참고.)

### 표준 데이터 모델

```typescript
interface TrackPoint {
  timestamp: number;   // 유닉스 ms로 통일 (파싱 시 변환)
  lat: number;         // 위도 decimal degrees
  lon: number;         // 경도 decimal degrees
  sog?: number;        // 대지속력 knots
  cog?: number;        // 대지침로 deg
  hdg?: number;        // 선수방위 deg
  rot?: number;        // 선회율
  status?: string;     // 운항 상태
}
```

- timestamp는 내부에서 **항상 유닉스 ms** (표시할 때만 포맷)
- 각도(hdg/cog)는 **0~360 정규화**
- ISO 문자열 / 유닉스 초 / 유닉스 ms 시각을 모두 자동 판별

## 지도 배경 (KHOA 전자해도)

`.env.local`에 KHOA 개방海(해아름) 인증키를 넣으면 전자해도 배경을 씁니다.
키가 없으면 CARTO + OpenSeaMap으로 자동 폴백합니다.

```
# .env.local (git 추적 제외)
VITE_KHOA_KEY=발급받은_ServiceKey
```

전자해도는 한국 근해만 커버하므로, `MapView.tsx`에서 최소/최대 줌을 제한하고
위경도 범위 밖 이상치는 지도 범위 계산에서 제외합니다.

## 문서

- [`CLAUDE.md`](CLAUDE.md) — 상시 맥락(아키텍처 원칙·데이터 모델·컨벤션)
- [`docs/SPEC.md`](docs/SPEC.md) — 상세 요구사항
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — 작업 로그(세션 간 이어가기용 단일 기록점)
- `samples/` — 회귀 확인용 샘플 CSV(정상·이상치·데모)
