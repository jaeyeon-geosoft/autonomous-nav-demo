# PROGRESS — 작업 로그

여러 컴퓨터를 오가며 작업하기 위한 진행 상황 기록.
세션 시작 시 이 파일을 먼저 읽고, 종료 시 갱신한 뒤 Git에 커밋·푸시할 것.
최신 상태를 맨 위에 둔다.

---

## 현재 상태 (최신)

- **단계**: 구현 순서 1~7번 + KHOA 전자해도 배경 완료 + **STR 데이터셋 대응(1차) 완료** +
  **다중 선박(traffic_N) 지원 완료** + **타선 꼬리선(전체/지나온 항적) 완료** +
  **풍부한 샘플 데이터셋(자선 30분/타선 10척) 추가 완료** + **재생 컨트롤 바 UX 수정 완료** +
  **품질·이벤트 목록 구간 묶음 표시 완료** + **타선 UI 다듬기(이름 없으면 id 툴팁, 사이드바
  목록) 완료**.
  전부 `dev` 브랜치에 커밋·푸시 완료. `main`은 `dev`보다 15커밋 뒤(PR #1 이후로 `main` 미갱신).
  분석가가 준 `str 데이터 분석.xlsx`(실 데이터 아님, 컬럼 사전) 기반. 브라우저 확인 끝.
  **실제 STR CSV는 아직 안 옴** — 다음 진전은 그게 와야 가능.
- **마지막으로 건드린 파일**: `src/components/MapView.tsx` / `src/components/TargetList.tsx`(신규) /
  `src/App.tsx`
- **결정**: `samples/`의 샘플 CSV들은 실 데이터가 아니라 검증용 소품이라, 앞으로
  코드가 바뀌어도 굳이 맞춰 다시 만들지 않는다(사용자 확인). 필요할 때만 손댈 것.

### 타선 꼬리선(전체/지나온 항적) — 완료

다듬기 항목 3개(이슈 목록 가상화/품질 임계값 조정/타선 꼬리선) 중 근거가 명확한 이것만 선택해서 진행.
나머지 둘은 실제 데이터 없이는 추측성 작업이라 보류.

- `interpolate.ts`: `TargetState`에 `index` 추가(자선의 `TrackState.index`와 같은 용도 — 꼬리선을
  어디까지 그릴지 판단)
- `MapView.tsx`: 타선마다 `{ marker, full, traveled }` 세 개를 한 세트로 관리(기존엔 마커만).
  자선과 같은 시각 언어(옅은 전체경로 → 진한 지나온경로)를 쓰되 색은 파란색으로, 선은 자선보다 얇게(`weight: 1`/`1.8`
  vs 자선 `1.5`/`2.5`) 그려서 위계 유지. "전체 항적 미리보기" 토글도 타선에 같이 적용
  - **주의**: 토글 값을 프레임 구독 콜백 안에서 읽어야 해서(마커 쪽과 같은 이유로 리렌더 회피) `showFullTrackRef`로
    최신값을 유지. 새 타선이 재생 중간에 처음 나타날 때도 이 ref로 현재 토글 상태를 반영해 생성
- 검증: `tsc -b`/`eslint .`/`npm run build` 통과. 브라우저에서 mock 근접상황 구간 확대 →
  자선 항적을 가로지르는 파란색 타선 궤적 확인, 토글 끄면 타선의 옅은 전체경로도 같이 사라지고
  지나온 부분(진한 선)은 남는 것까지 확인

### 다중 선박(traffic_N) 지원 — 완료

`str 데이터 분석.xlsx`가 요청한 4번째 항목. `traffic_숫자` 테이블(주변 타선 + 예인선)은 InstData와 별개 파일이고
ID 컬럼으로 여러 척이 한 파일에 섞여 있는 구조. 자선(`TrackPoint`)과는 별개 모델로 분리해서 구현.

- `types.ts`: `TargetPoint`(한 시점 상태: lat/lon/yaw/turningRate/tugEnable) + `TargetShip`(id/name/
  shipType/length/beam + points). **결정**: `TrackPoint`를 재사용하지 않고 별도 타입으로 뺌 — TrackPoint는
  CLAUDE.md가 "자선 표준 모델"로 정의해둔 계약이라, 타선 전용 필드(tugEnable 등)를 얹으면 그 계약이 흐려짐
- `trafficMapping.ts`(신규) + `parseTraffic.ts`(신규): `mapping.ts`와 같은 패턴(별칭 테이블 + 헤더 정규화)이지만
  ID 컬럼으로 행을 선박별로 그룹핑하는 점이 다름. `normalizeHeader`/`parseNumber`/`parseTimestamp`는
  `mapping.ts`에서 export해 재사용(중복 안 함)
- `interpolate.ts`: `interpolateTargetAt()` 신규 — 자선의 `interpolateAt()`과 달리 **클램프하지 않고
  범위 밖이면 null**을 반환. 시나리오 중간에 등장/퇴장하는 배를 표현하려면 이게 맞음(자선은 등장/퇴장이
  없어서 클램프가 맞았던 것)
- `playbackStore.ts`: `targets`/`setTargets` 추가. `useCurrentTargets()` 훅도 추가했지만 **MapView에서는 안 씀**
  — 커서가 매 프레임 바뀌는데 훅으로 구독하면 리렌더가 돎(기존 자선 마커와 같은 이유로 회피)
- `MapView.tsx`: 기존 "스토어 직접 구독" 갱신 함수를 확장해 타선 마커(Map<id, L.Marker>)를 매 프레임
  생성/갱신/제거. **버그 하나 잡음**: 처음엔 자선 마커처럼 `interactive: false`로 만들었더니 `bindTooltip`
  호버가 아예 안 뜸(상호작용 꺼지면 마우스 이벤트 자체가 안 걸림) → 타선 마커만 `interactive: true`로 수정
  - **동기화 순서 주의**: 타선 목록을 ref에 캐시해 읽으면 안 됨 — `setTargets` 직후 이 구독 콜백이 React
    렌더보다 먼저 동기 실행돼 구 목록을 보게 됨. `usePlaybackStore.subscribe(update)`의 `state` 인자에서
    직접 읽어야 항상 최신
  - 자선 마커에 `zIndexOffset: 1000` 추가 — 둘 다 같은 markerPane이라, 안 하면 타선이 자선을 가릴 수 있음
- `TrafficLoader.tsx`(신규): `FileLoader`의 compact 변형과 같은 패턴. 헤더에 "타선 데이터" 버튼.
  자선 항적이 새로 로드되면(`load()`) 이전 타선은 `setTargets([])`로 같이 리셋(다른 시나리오라 안 맞음)
- `mockTargets.ts`(신규): `generateMockTrack()`의 근접상황 구간(40~55%)에 맞춰 배 1척이 자선 항로를
  가로질러 지나가게(등장→근접→퇴장) 만든 mock. "예시 항적" 버튼 누르면 자동으로 같이 뜸
- 지도 배지: 우상단에 "타선 N척 로드됨" 표시(전체 로드 수, 현재 화면에 보이는 수 아님 — 프레임마다
  안 바뀌어야 리렌더가 안 도므로 일부러 필터링 안 함)
- 검증: `tsc -b`/`eslint .`/`npm run build` 통과. 브라우저에서 (1) mock 항적 → 근접상황 구간에서만 파란색
  타선 마커 등장, 구간 밖에서는 사라짐, 호버 시 "DEMO TARGET" 툴팁 확인. (2) 문서의 실제 traffic 컬럼명
  (`ID`, `ShipName`, `Latitude[deg]`, `Yaw[deg]`, `TugEnable` 등)으로 만든 2척(어선/예인선) 샘플 CSV를
  자선 CSV와 함께 업로드 → "타선 2척 로드됨" + 지도에 두 마커가 각자 방향으로 정확히 뜨는 것 확인

### STR 데이터셋 대응(1차) — 완료

`str 데이터 분석.xlsx`는 "FWHanban STR" 시뮬레이션 데이터셋(InstData/traffic_N/Command/Environ/Ownship 5개 테이블)의
**컬럼 사전**(실제 CSV 아님). InstData 한 행 안에 위치+환경+제어+자율안전 정보가 다 있어서 기존 단일 항적
구조에 그대로 편입 가능한 부분만 이번에 반영. 다중 선박(traffic_N)은 별도 모델이라 위 항목으로 분리.

- `types.ts`: `TrackPoint`에 `risk/avoidFlag/accident`(자율·안전), `windSpeed/windDir/waveHeight/waveDir/
  currentSpeed/currentDir`(해상외란), `rudderCmd/rudderActual/engineCmd/engineActual`(제어 명령 vs 실제) 추가
- `mapping.ts`: `FIELD_ALIASES`에 문서에 나온 실제 컬럼명을 리터럴로 등록
  (`Latitude[deg]`, `GyroHeading[deg]`, `TurningRate[deg/s]`, `Time(sec)`, `Wind(m/sec)` 등).
  **결정**: 대괄호/소괄호를 정규식으로 벗기는 범용 방식은 안 씀 — Environ 테이블의 `Wind(m/sec)`/`Wind(deg)`처럼
  같은 베이스명에 단위만 다른 컬럼이 있어서, 벗기면 정규화 후 문자열이 충돌해 한쪽 데이터가 유실됨.
  그래서 원본 표기를 그대로 살린 리터럴 별칭을 추가하는 쪽으로 감
  - 다축 타/엔진(P/S/C)은 대표값 하나로 축약: Center 우선, 없으면 Port(`rudderCmd`/`rudderActual`/`engineCmd`/
    `engineActual`). InstData에 C가 없는 2축 선박(Command 테이블 등)은 자동으로 Port 값을 씀
  - `AutoCourse[deg]`(자율운항의 목표 침로)는 `cog`(실제 대지침로)에 매핑하지 않음 — 의미가 다른 값이라
    섣불리 합치면 잘못된 정보가 됨. 필요해지면 별도 필드로
- `quality.ts`/`IssueList.tsx`: `accident`/`avoid`를 기존 `IssueKind`에 추가해 재사용
  (사고·회피 지점도 "클릭하면 그 시점으로 이동"이 그대로 필요해서). `MapView.tsx`는 무수정 —
  이슈 마커 루프가 kind를 안 가리고 범용으로 동작해서 자동으로 지도에 뜸.
  패널 라벨은 "데이터 품질" → "품질 · 이벤트"로(사고/회피는 데이터 결함이 아니라 시뮬레이션 이벤트라서)
- `StatusPanel.tsx`: Risk 리드아웃 + Accident/AvoidFlag 뱃지 + "해상 외란"/"타·엔진" 섹션.
  두 섹션은 데이터셋에 해당 필드가 하나도 없으면 통째로 숨김(대부분의 CSV는 이 필드가 없으므로)
- `mockTrack.ts`: 새 필드 데모용 값 추가(진행 40~55% 구간에 위험도 상승 + AvoidFlag 근접상황 흉내).
  **accident는 mock에서 항상 false** — 결정론적 예시 항적이 "사고"로 보이면 다른 사람에게 보여줄 때 오해 소지
- 검증: `tsc -b`/`eslint .`/`npm run build` 통과. 브라우저에서 (1) mock 항적 → Risk/외란/제어 값,
  AvoidFlag 구간의 지도 마젠타 마커·이슈 목록·상태 뱃지 확인, (2) 문서의 실제 컬럼명(`Latitude[deg]` 등)으로
  만든 5행 샘플 CSV 업로드 → 위경도/HDG/Risk/외란/제어 전부 정확히 매핑되는 것 확인

### KHOA 전자해도 배경 — 완료

- ✅ 배경: `BASEMAP_ENC573857`(전자해도, 3857 WMS)를 `L.tileLayer.wms`로. 키는 `VITE_KHOA_KEY`(.env.local),
  없으면 CARTO+OpenSeaMap 폴백. **핵심 gotcha: WMS 파라미터 대문자 필수(`uppercase:true`), ServiceKey는 base URL에.**
  자세한 요청 스펙은 memory의 khoa-openapi-reference 참고
- **오버레이(위험구역·항로)는 보류 결정**. 이유: 공식 OpenAPI 오버레이는 백엔드 없는 클라이언트에서 사실상 불가
  (`otmsWmsApi.do` http 전용+eval-JS, https 변형 404, WFS http 전용+CORS). 되는 건 사이트 내부 프록시
  `cmm/proxyRun.do`(무키·회색지대)뿐이라 안 씀. 게다가 **전자해도 배경에 항로·통항분리대·위험물(암초/침선)이
  이미 그려져 있어** 실익이 행정구역선(사격/훈련구역) 정도로 제한적. 나중에 필요하면 그때 재검토.

### 그다음(원래 남은 것)

- **실제 STR CSV를 받으면**: 문서 기반으로 추가한 `FIELD_ALIASES`/`TRAFFIC_ALIASES` 리터럴이 실제 헤더와
  정확히 일치하는지 확인(대소문자·공백 표기가 문서와 다를 수 있음). EUC-KR 대응도 그때. 품질 임계값
  (`MAX_SPEED_KNOTS`/`GAP_FACTOR` 등)도 실 데이터 보고 나서 맞는지 재검토 — 지금은 감으로 바꿀 근거가 없어 보류
- 다듬기(선택, 보류): 이슈 목록 가상화(이슈 수천 건 이상일 때만 의미 있음, 아직 그 정도 데이터 없음)

색: 마젠타(`--color-alert: #ff3d9a`)는 이상 구간 전용으로 예약. 다른 용도로 쓰지 말 것.

### 알아둘 것

- **검증 습관**: 순수 로직은 임시 스크립트를 만들어 `npx vite-node ./_check.ts`로
  Node에서 돌려보고 지웠음. 7번도 이 방식으로 16개 케이스 확인 후 삭제.
  단, **React 렌더링 버그는 이걸로 못 잡음** — UI 변경은 반드시 브라우저에서 눈으로 볼 것
- 브라우저 확장(Claude in Chrome)이 연결되면 에이전트가 직접 화면을 보고 검증할 수 있다.
  7번은 확장 연결 상태로, dev 서버 → `sample-anomalies.csv` 업로드 → 이슈 7건이
  지도/리본/목록에 뜨는 것까지 스크린샷으로 확인함
- **미해결/대기**:
    - 실제 데이터 파일은 아직 없음. 분석가가 `str 데이터 분석.xlsx`(컬럼 사전)만 줬고,
      이걸로 매핑/필드를 선반영함(위 "STR 데이터셋 대응" 참고). **실제 CSV가 오면 컬럼명이
      문서와 정확히 일치하는지 재확인 필요** → 다르면 CLAUDE.md 데이터 모델 + SPEC.md 갱신
    - **인코딩**: 현재 UTF-8로만 읽음. 분석가가 EUC-KR CSV를 주면 한글 헤더(위도/경도)가
      깨져서 매핑 실패함. 실제 데이터 받고 나서 필요하면 대응

---

## 로그

### 2026-08-07 (계속 2) — 타선 UI 다듬기: 이름 fallback + 사이드바 목록

실 데이터 대기 중 UI 다듬기 연장. 코드를 훑어보고 후보 4개(이름 없는 타선 툴팁,
타선 목록 부재, 에러 배너 닫기 버튼 없음, 대용량 CSV 로딩 표시 없음)를 찾아 보고,
사용자가 앞 두 개를 골라 진행. 뒤 두 개는 보류(급하지 않음/이미 알려진 이슈).

- `src/components/MapView.tsx`: 타선 마커 툴팁을 `ship.name ?? ship.id`로 바인딩.
  기존엔 `shipname` 컬럼이 없는 데이터셋이면 호버해도 아무 정보가 안 떴음
- `src/components/TargetList.tsx`(신규): 로드된 타선 목록(이름/id + 선종)을
  사이드바에 표시. `StatusPanel`/`IssueList`와 같은 라벨+리스트 패턴. 지금까진
  지도 우상단 "타선 N척 로드됨" 개수만 있어서 뭐가 있는지 마커를 일일이
  호버해야 알 수 있었음. `App.tsx`의 aside에 `IssueList` 다음 순서로 연결
- 검증: `tsc -b`/`eslint src`/`npm run build` 통과. 브라우저에서 (1) shipname 컬럼이
  없는 임시 CSV로 툴팁에 `traffic_1`이 뜨는 것 확인, (2) `sample-traffic-10.csv`로
  사이드바에 10척 이름+선종이 전부 나열되는 것 확인

### 2026-08-07 (계속) — 품질·이벤트 목록 구간 묶음 표시

실 데이터 대기 중이라 UI 다듬기 방향으로 계속. 근접상황처럼 같은 이슈가 연속된
포인트에 걸리면(예: 30분 샘플의 AvoidFlag 26포인트) 목록에 한 줄씩 26번 반복돼서
읽기 어려운 걸 브라우저로 직접 보고 발견.

- `src/components/IssueList.tsx`: `groupIssues()` 추가 — 종류(kind)별로 먼저 묶고
  포인트 `index`가 연속(차이 ≤1)이면 하나의 구간으로 합침. 최종적으로 시작 시각
  기준 정렬해 원래 시간순 표시를 유지. `quality.ts`(핵심 검증 로직)는 안 건드림 —
  화면 표시만 바꾸는 문제라 그쪽에서 처리
  - 단발성 이슈(점프/범위/결측 등)는 count===1이라 기존과 동일하게 렌더 → 회귀 없음
  - 구간이면 `"09:12:10~09:16:20 회피 동작 지속 · 26건"`처럼 한 줄, 클릭 시 구간 시작
    시각으로 seek. active 하이라이트도 커서가 구간 안에 있으면 켜지게 확장
- 검증: `tsc -b`/`eslint src`/`npm run build` 통과. 브라우저에서 (1) `sample-demo-30min.csv`
  → 27건이 "회피 동작 지속 · 26건" 1줄 + "사고 발생" 1줄로 표시되는 것 확인, (2) 기존
  `sample-anomalies.csv`(7건, 점프 3건 중 2건만 연속)로 회귀 없음 확인 — 연속된 점프 2건만
  묶이고 나머지 단발 이슈 4개는 그대로 개별 표시됨
- **결정(사용자)**: `samples/`의 샘플 CSV는 실 데이터가 아닌 검증용 소품이라, 코드가
  바뀔 때마다 맞춰 다시 만들 필요 없음. 앞으로 UI를 더 다듬어도 샘플 데이터는 그대로 둘 것

### 2026-08-07 — 샘플 데이터셋 확충 + 재생 컨트롤 바 UX 수정

실제 STR CSV가 아직 없는 상태에서, 화면 검증/데모용 샘플 데이터를 더 풍부하게 만들고
재생 중 발견된 UI 흔들림 버그를 고쳤다.

- **샘플 데이터**(`samples/`):
    - `sample-traffic-10.csv`: 기존 `sample-demo-60s.csv`(60초 자선 항적) 짝으로 타선 10척
      (교차/마주오는 배/추월/정박/예인선/평행항주/반대편 교차/근접 소형선/순찰선/피예인선) 추가
    - `sample-demo-30min.csv`: `TrackPoint` 전 필드(위험도/외란/제어 명령↔실제 등)를 채운 30분
      자선 항적. 근접상황 구간(AvoidFlag) 26포인트 + 사고(Accident) 1포인트를 의도적으로 심어
      "품질·이벤트" 패널이 정확히 27건으로 잡히는지 확인용으로 씀(시간역전/점프 같은 실제 이상은
      안 섞음 — 그건 이미 있는 `sample-anomalies.csv` 역할이라 이 파일은 "깨끗하지만 완전한" 데이터로 감)
    - `sample-traffic-10-30min.csv`: 위 30분 항적 짝. 처음엔 일부 배가 특정 구간에만 존재해
      재생 중 중간에 나타났다 사라졌는데(`traffic_1/5/7/8/10`), **사용자 피드백으로 전체 구간
      내내 존재**하도록 수정(근접/사고 시점 근처를 지나가는 경로 자체는 유지 — 등장 구간만 늘림)
    - 생성 스크립트는 스크래치패드에 파이썬으로 짜서 실행 후 버림(재생 엔진/보간 로직과 동일한
      물리 모델을 참고해 `mockTrack.ts`와 궤가 맞게)
    - 브라우저(Claude in Chrome)로 실제 업로드해서 "타선 10척 로드됨", "품질·이벤트 27건",
      시작/끝 시점 모두 마커 유지되는 것까지 확인함
- **재생 컨트롤 바 UX 버그**(`src/format.ts`, `src/components/TransportBar.tsx`):
    - 증상: 우측 시간 텍스트가 "1초"→"10초"→"8분 4초"처럼 자릿수가 들쭉날쭉했는데, 같은 줄의
      `SpeedRibbon`(`flex-1`)이 매 프레임 남은 폭을 다시 계산해서 재생 중 리본이 계속 흔들리고
      움직임
    - `formatDuration(ms, includeHours)`로 시그니처를 바꿔 항상 자릿수 고정 `MM:SS`(1시간
      이상이면 `HH:MM:SS`)를 반환하게 함. `TransportBar`에서 elapsed/total에 같은 `includeHours`를
      넘겨서 재생 중 절대 폭이 안 바뀜
    - 겸사겸사 정보 중복도 정리: 벽시계 시각(`formatClock(cursor)`)은 상태 패널의 "현재 시각"과
      중복이라 TransportBar에서 뺐고, `경과 / 전체`(예: `01:22 / 30:00`) 하나만 남김
    - `formatDuration`은 이 컴포넌트에서만 쓰여서 시그니처를 안전하게 바꿀 수 있었음(다른 호출부 없음)
- 검증: 세 가지 모두 브라우저에서 10x 배속 재생하며 눈으로 확인(리본 안 흔들림, 시간 표시
  자릿수 고정, 타선 10척 전 구간 유지). 커밋 3개로 분리해서 올림.

### 2026-08-05 — PR #1 dev 머지 + 브랜치/문서 정리
- PR #1(`feat/str-dataset-fields` → `dev`) 머지 완료(`78f5fd9`).
  머지된 작업 브랜치 2개(`feat/str-dataset-fields`, `feat/khoa-haeareum-map`) 로컬·원격 삭제
- 문서를 코드와 대조해 정리. 실제로 틀렸던 것들:
    - `README.md`: 존재하지 않는 `선박항적뷰어-사용법.docx` 링크(깨짐) 삭제.
      프로젝트 구조 트리에 신규 5개 파일 누락(`TrafficLoader`/`trafficMapping`/`parseTraffic`/`mockTargets`) 반영.
      TrackPoint 스니펫이 STR 확장 필드 이전 버전이었음 → 갱신 + `TargetShip` 추가
    - `CLAUDE.md`: 스택의 지도 항목이 "Leaflet + OpenSeaMap"에 머물러 있었음 → KHOA 전자해도 반영.
      "향후 확장"에 남아 있던 **"KHOA 전자해도로 교체"는 이미 완료된 일이라 삭제**.
      저장소 루트가 "한 단계 중첩(`autonomous-nav-demo/autonomous-nav-demo/`)"이라고 적혀 있었으나 실제로는 아님 → 정정.
      브랜치 규칙(PR은 dev로, 머지된 feat는 삭제) 추가
    - `docs/SPEC.md`: 지도 섹션에 KHOA/폴백 반영. STR·타선 대응 내용이 아예 없어서 섹션 2개 추가.
      구현 순서 1~7 완료 표시
    - `docs/PROGRESS.md`: "dev 미머지"·"git remote 없음"이 사실과 달라 정정.
      타선 색을 아직 호박색으로 적어둔 곳들(`b875400`/`b3ed6a7`에서 파란색으로 바뀜) 수정
- **KHOA 확인 결과**: 쓰고 있음. 단 이 컴퓨터엔 `.env.local`이 없어 로컬은 CARTO+OpenSeaMap 폴백으로 뜸.
  전자해도로 보려면 키를 `.env.local`에 넣어야 함

### 2026-07-22 — KHOA 전자해도 배경 연동 (feat/khoa-haeareum-map)
- 방향: 무료·프론트엔드 유지하며 개방海로 최대한(배경 전자해도 + 향후 오버레이). 실시간 AIS·공식 항해용 ENC는 제외
- CARTO 배경 → **KHOA 개방海 `BASEMAP_ENC573857`(전자해도 3857 WMS)** 로 교체. `MapView.tsx`에서 키 있으면 전자해도,
  없으면 기존 CARTO+OpenSeaMap 폴백. 키는 `.env.local`의 `VITE_KHOA_KEY`(*.local이라 git 제외), `.env.example` 추가
- **삽질 로그(다음에 시간 아끼려고 기록)**:
    - 개방海 소개 문서만 보고 "공식 API는 배경지도 미제공(V-World 위 오버레이)"이라 잘못 결론냄 → 사용자가 '오픈API 신청'
      페이지 지적해 정정. 실제론 배경지도 OpenAPI 제공(전자해도 3857 포함)
    - 배경은 OpenLayers 라이브러리 방식이라 타일 URL이 문서에 없음 → 공식 예제(baseMapTest) 받아 로컬 서버로 띄우고
      **네트워크 캡처**로 실제 타일 요청 확보: `.../BASEMAP_ENC573857/wmsVectordata.do?...GetMap`
    - 처음 붙였을 때 빈 화면/503 → 원인은 **WMS 파라미터 대소문자**. KHOA는 대문자만 받음(Leaflet 기본 소문자).
      `uppercase:true` + `ServiceKey`는 base URL에 직접 → 200 PNG 정상. 브라우저에서 전자해도 배경 확인 완료
- 검증: `tsc -b`/`eslint src`/`npm run build` 통과. 브라우저에서 전자해도 배경 위 항적/마커/이상표시 렌더 확인

### 2026-07-22 — 구현 순서 7번 (데이터 품질 검증 + 이슈 목록/하이라이트)
- `src/data/quality.ts`: 순수 함수 `findIssues(points): Issue[]` + `countByKind()`
    - 4종 검사: 위치 점프(haversine 역산 속력 > 60kn), 결측치, 시각 이상(역전/중복/큰 공백),
      범위 벗어남(위경도/속도 음수/각도)
    - **결측치 소음 방지**: 데이터셋에 절반 이상 존재하는 선택 필드만 결측 검사.
      아예 제공 안 된 컬럼(예: cog 전무)을 매 포인트 결측으로 보고하면 목록이 뒤덮임
    - **큰 공백**은 절대값이 아니라 간격 중앙값의 8배 기준(데이터마다 정상 간격이 달라서)
    - 시각 역전/중복은 매핑 단계에서 정렬돼 실제로는 거의 안 뜨지만 방어적으로 검사
- `issues`를 playbackStore에 넣음 → `setPoints` 시 1회 계산. 지도/리본/목록이 각자 구독
- `src/components/IssueList.tsx`: 품질 요약(유형별 개수) + 목록. 클릭 시 `seek`.
  이상 0건이면 청록 "이상 없음" 한 줄만(정상은 조용하게)
- `MapView`: 이상 구간 마젠타 하이라이트. jump는 튄 구간(선), 나머지는 지점(원).
  `L.layerGroup`로 묶어 issues 바뀔 때 clear/재생성
- `SpeedRibbon.tsx`(신규)로 스크러버 교체 — **이 도구의 시그니처**. 속력 프로파일 SVG 위에
  이상 지점을 마젠타 눈금으로 얹음. 커서선은 매 프레임 움직여서 React 상태 대신
  스토어 직접 구독 + SVG 명령형 갱신(MapView와 같은 이유). role="slider"+키보드도 유지
- `samples/sample-anomalies.csv` 추가 — 점프/결측/음수속력/큰공백/범위밖을 한 파일에.
  실제로 이상 7건(점프3·시각1·범위2·결측1)이 뜨는 걸 확인용으로 고정
- 검증: Node 16케이스(빈배열/단일/mock정상0건/점프/결측/없는컬럼/역전·중복/공백/범위/합계)
  통과 후 스크립트 삭제. `tsc -b`/`eslint src`/`npm run build` 통과.
  **브라우저**에서 mock=이상없음, `sample-anomalies.csv`=7건이 지도·리본·목록에 뜨고
  이슈 클릭 시 해당 시점으로 seek+활성 하이라이트되는 것까지 확인(콘솔 에러 없음)

### 2026-07-21 — 구현 순서 4번 (+ 5·6번 대부분)
- 디자인 방향 확정. 레퍼런스 2장은 *운항 모니터링*용인데 이 도구는 *데이터 검증*용이라,
  시각 언어만 가져오고 정보 위계는 "정상은 조용하게, 이상은 튀게"로 잡음
    - 팔레트: 야간 전자해도 톤. 항적 청록(`#35e0c4`), **이상 구간 마젠타(`#ff3d9a`)**.
      마젠타는 해도에서 주의 표시에 쓰는 관례색이라 이상 구간 전용으로 예약. 다른 데 쓰지 말 것
    - 타이포: IBM Plex Sans KR + IBM Plex Mono(수치 전용). 한글 + 계기판 성격 둘 다 필요해서
    - 토큰은 `src/index.css`의 `@theme`에 정의(Tailwind v4 방식)
- `src/components/MapView.tsx`
    - **결정**: react-leaflet 안 쓰고 raw Leaflet + 스토어 직접 구독.
      커서가 재생 중 매 프레임 바뀌는데 React 상태로 구독하면 프레임마다 리렌더가 돔.
      Leaflet 객체만 명령형으로 갱신하면 리렌더 0회
    - 베이스맵은 CARTO dark_matter + OpenSeaMap seamark 오버레이.
      CLAUDE.md에 "실선박 연동 시 KHOA 전자해도로 교체" 적혀 있으니 잠정 선택
    - 마커 회전은 divIcon 안의 svg에 CSS transform. 전체 항적 토글, fitBounds 포함
    - flex 레이아웃에서 컨테이너 크기가 늦게 정해져 타일이 어긋나는 문제 →
      ResizeObserver로 invalidateSize
- `StatusPanel`(SPEC 6번 항목 전부), `TransportBar`(재생/배속/스크러버/처음으로),
  `FileLoader`에 compact 변형 추가(헤더용)
- 시각 표시는 브라우저 로컬 기준(`src/format.ts`). 타임존 없는 CSV는 파싱도 로컬로
  해석되므로 기준을 맞춤
- 검증: `tsc -b` / `eslint src` / `npm run build` 통과.
  빌드 산출물에서 커스텀 색 토큰·반응형 유틸리티가 실제로 생성됐는지 확인.
  브라우저에서 지도·마커 회전·항적·재생 동작 확인 완료

### 2026-07-21 — 구현 순서 3번
- `src/data/interpolate.ts`: `interpolateAt()` + `lerpAngle()` + `bearing()`
    - 각도는 0도 경계를 최단 경로로 넘김(359°→1°은 2°만 이동). 단순 선형 보간이면
      반대로 358°를 도는 버그가 생김
    - 마커 방향은 hdg → cog → 진행 방향 순으로 폴백(SPEC 그대로)
    - 구간 밖 시각은 양 끝으로 클램프, 같은 timestamp 중복도 방어
- `src/playback/playbackStore.ts`: zustand 스토어(points/cursor/playing/speed)
    - 커서는 항상 데이터의 실제 유닉스 ms. 배속은 경과 시간에 곱해서 전진
    - 끝에 닿으면 자동 정지, 끝에서 재생하면 처음부터
- `src/playback/usePlaybackClock.ts`: rAF로 실제 경과 시간만 스토어에 전달.
  시간 진행은 여기서만 일으키고 스토어는 계산만 함(테스트 가능하게)
- `src/App.tsx`: 3번 확인용으로 재생/배속/스크러버 + 현재 상태 표시 추가
- 검증: Node에서 38개 케이스 전부 통과(보간, 각도 경계, 방위각, 클램프, 폴백,
  빈 배열/단일 포인트/timestamp 중복, 스토어 상태 전이).
  `tsc -b` / `eslint src` / `npm run build` 통과
- **주의**: `bearing()`은 대권항로 초기 방위각이라 위도 35°에서 정동쪽이 89.7°로 나옴.
  처음엔 이걸 버그로 보고 테스트를 짰다가, 공식을 직접 계산해 정상임을 확인함.
  적도에서는 정확히 90°. 코드에 주석으로 근거를 남겨둠

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
- 브라우저에서 mock 버튼 + `samples/sample-track.csv` 드래그앤드롭 확인 완료
  (매핑 5개, 정렬 복원, hdg 370→10, 빈 timestamp 행 제외까지 화면에서 확인)
- `samples/sample-track.csv` 추가 — 헤더 표기 혼재/역순/각도 초과/빈 값을 한 파일에
  모아둔 회귀 확인용. 실제 데이터 오기 전까지 이걸로 확인
- mock 출항 가속을 9분 → 3분으로 단축(`RAMP_UP_SEC`). 초반이 정지 화면처럼 보여서

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