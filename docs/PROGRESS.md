# PROGRESS — 작업 로그

여러 컴퓨터를 오가며 작업하기 위한 진행 상황 기록.
세션 시작 시 이 파일을 먼저 읽고, 종료 시 갱신한 뒤 Git에 커밋·푸시할 것.
최신 상태를 맨 위에 둔다.

---

## 현재 상태 (최신)

- **단계**: 구현 순서 1~7번 완료 + **KHOA 전자해도 배경 연동 완료**(브랜치 `feat/khoa-haeareum-map`).
  전자해도 배경 위에 항적/마커/이상표시가 뜨는 것까지 브라우저 확인 끝.
- **마지막으로 건드린 파일**: `src/components/MapView.tsx`(전자해도 WMS 배경), `.env.local`(키, git 제외),
  `.env.example`

### 진행 중 (feat/khoa-haeareum-map 브랜치)

KHOA 개방海 전자해도 배경 연동. **배경은 완료**, 다음은 오버레이:

- ✅ 배경: `BASEMAP_ENC573857`(전자해도, 3857 WMS)를 `L.tileLayer.wms`로. 키는 `VITE_KHOA_KEY`(.env.local),
  없으면 CARTO+OpenSeaMap 폴백. **핵심 gotcha: WMS 파라미터 대문자 필수(`uppercase:true`), ServiceKey는 base URL에.**
  자세한 요청 스펙은 memory의 khoa-openapi-reference 참고
- ⬜ 오버레이(다음): 위험구역·항로·암초/침선·조류 등. WMS(`otmsWmsApi.do?...&Layer=`, **대문자 파라미터 주의**)
  또는 WFS(`otmsWfsApi.do?...&srsName=EPSG:4326`, lat/lon GML). 토글 레이어로.
- ⬜ 커밋/푸시로 집·회사 동기화

### 그다음(원래 남은 것)

- **실제 데이터 확정 시**: `src/data/mapping.ts`의 `FIELD_ALIASES`와 CLAUDE.md/SPEC.md 갱신. EUC-KR 대응
- 다듬기(선택): 이슈 목록 가상화, 품질 임계값(`MAX_SPEED_KNOTS` 등) 조정

색: 마젠타(`--color-alert: #ff3d9a`)는 이상 구간 전용으로 예약. 다른 용도로 쓰지 말 것.

### 알아둘 것

- **검증 습관**: 순수 로직은 임시 스크립트를 만들어 `npx vite-node ./_check.ts`로
  Node에서 돌려보고 지웠음. 7번도 이 방식으로 16개 케이스 확인 후 삭제.
  단, **React 렌더링 버그는 이걸로 못 잡음** — UI 변경은 반드시 브라우저에서 눈으로 볼 것
- 브라우저 확장(Claude in Chrome)이 연결되면 에이전트가 직접 화면을 보고 검증할 수 있다.
  7번은 확장 연결 상태로, dev 서버 → `sample-anomalies.csv` 업로드 → 이슈 7건이
  지도/리본/목록에 뜨는 것까지 스크린샷으로 확인함
- **미해결/대기**:
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