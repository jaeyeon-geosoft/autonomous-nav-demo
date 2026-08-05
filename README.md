# 선박 항적 데이터 뷰어

항적 데이터(주로 CSV)를 지도 위에 시간순으로 재생하여, **"이 데이터가 실제로
말이 되는 항적인지"** 를 눈으로 검증하는 프론트엔드 도구입니다.

- 백엔드 없음 · 실시간 스트리밍 없음 — 파일을 로드해서 재생하는 방식
- 지도 위 선박 이동 애니메이션 + 위경도/속도/침로 등 부가 정보 표시
- 데이터 품질 자동 검증(위치 점프·시각 이상·범위 벗어남·결측치)
- STR 시뮬레이션 데이터셋 컬럼 자동 인식 + 위험도/회피/사고 이벤트 표시
- 자선과 별개로 타선/예인선(`traffic_N`) 다중 선박 동시 재생

> 이 README는 **개발자**를 위한 문서입니다.
> 최종 사용자(데이터 분석가)용 사용법은 사내 배포용 docx로 별도 관리합니다.

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
│  ├─ FileLoader.tsx       # 자선 CSV 드래그앤드롭 / 파일 선택
│  ├─ TrafficLoader.tsx    # 타선/예인선 CSV 별도 로드 버튼
│  ├─ MapView.tsx          # Leaflet 지도, 자선·타선 마커 이동/회전, 항적 polyline
│  ├─ StatusPanel.tsx      # 현재 시각의 위경도/속도/침로 + 위험도·외란·타/엔진 패널
│  ├─ IssueList.tsx        # 품질 이슈 + 회피/사고 이벤트 목록(클릭 시 해당 시각으로 이동)
│  ├─ SpeedRibbon.tsx      # 속력 프로파일 리본
│  └─ TransportBar.tsx     # 재생/정지·배속·타임라인
├─ data/                   # ── 데이터 레이어 (화면과 분리) ──
│  ├─ types.ts             # 표준 내부 모델 TrackPoint(자선) / TargetShip(타선)
│  ├─ mapping.ts           # 원본 컬럼 → TrackPoint 매핑(별칭 테이블)
│  ├─ trafficMapping.ts    # 원본 컬럼 → TargetShip 매핑(ID로 선박별 그룹핑)
│  ├─ parseCsv.ts          # papaparse 래퍼(자선)
│  ├─ parseTraffic.ts      # papaparse 래퍼(타선)
│  ├─ mockTrack.ts         # 가짜 자선 항적 generateMockTrack()
│  ├─ mockTargets.ts       # 가짜 타선 항적 generateMockTargets()
│  ├─ interpolate.ts       # 커서 시각의 선박 상태 보간(자선/타선)
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

**자선** — `TrackPoint` (전체 정의는 `src/data/types.ts`)

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

  // STR 데이터셋 대응으로 추가된 선택 필드
  risk?, avoidFlag?, accident?                    // 자율/안전
  windSpeed?, windDir?, waveHeight?, waveDir?, …  // 해상 외란
  rudderCmd?, rudderActual?, engineCmd?, …        // 제어(명령 vs 실제)
}
```

**타선/예인선** — `TargetShip` = `{ id, name?, shipType?, length?, beam?, points: TargetPoint[] }`

`TrackPoint`를 재사용하지 않고 별도 타입으로 뒀습니다. `TrackPoint`는 "자선 표준 모델"이라는
계약이라, 타선 전용 필드(`tugEnable` 등)를 얹으면 그 계약이 흐려집니다.

- timestamp는 내부에서 **항상 유닉스 ms** (표시할 때만 포맷)
- 각도(hdg/cog/yaw)는 **0~360 정규화**
- ISO 문자열 / 유닉스 초 / 유닉스 ms 시각을 모두 자동 판별
- 커서가 데이터 구간 밖일 때 — 자선은 **클램프**(계속 표시), 타선은 **null**(화면에서 사라짐).
  타선은 시나리오 중간에 등장/퇴장하는 게 정상이기 때문입니다.

## 지도 배경 (KHOA 전자해도)

`.env.local`에 KHOA 개방海(해아름) 인증키를 넣으면 전자해도(`BASEMAP_ENC573857`, 3857 WMS)
배경을 씁니다. **키가 없으면 CARTO + OpenSeaMap으로 자동 폴백**하므로, 키 없이도 개발은 됩니다.

```
# .env.local (git 추적 제외)
VITE_KHOA_KEY=발급받은_ServiceKey
```

키 발급 방법은 [`.env.example`](.env.example)에 적어뒀습니다.

- 전자해도에는 항로표지가 이미 들어 있어, KHOA 배경일 때는 OpenSeaMap 오버레이를 얹지 않습니다.
- KHOA WMS는 파라미터를 **대문자로만** 받습니다(Leaflet 기본은 소문자). `uppercase: true` +
  `ServiceKey`는 base URL에 직접 붙여야 합니다 — 안 그러면 빈 화면/503이 납니다.
- 전자해도는 한국 근해만 커버하므로, `MapView.tsx`에서 최소/최대 줌을 제한하고
  위경도 범위 밖 이상치는 지도 범위 계산에서 제외합니다.

## 문서

- [`CLAUDE.md`](CLAUDE.md) — 상시 맥락(아키텍처 원칙·데이터 모델·컨벤션)
- [`docs/SPEC.md`](docs/SPEC.md) — 상세 요구사항
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — 작업 로그(세션 간 이어가기용 단일 기록점)
- `samples/` — 회귀 확인용 샘플 CSV(정상·이상치·데모)
