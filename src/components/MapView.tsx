import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { usePlaybackStore } from '../playback/playbackStore';
import { interpolateAt } from '../data/interpolate';
import type { TrackPoint } from '../data/types';
import type { Issue } from '../data/quality';

const BASE_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const SEAMARK_TILES = 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png';

/**
 * 국립해양조사원 개방海 전자해도(해아름) 배경. 표준 EPSG:3857 WMS라 Leaflet에 바로 얹힌다.
 * 키(VITE_KHOA_KEY)가 있으면 이 배경을, 없으면 CARTO+OpenSeaMap으로 폴백한다.
 */
const KHOA_KEY = import.meta.env.VITE_KHOA_KEY as string | undefined;
const KHOA_ENC_WMS = 'https://www.khoa.go.kr/oceanmap/BASEMAP_ENC573857/wmsVectordata.do';

/** 이상 구간 전용 마젠타(--color-alert). 해도 관례색이라 다른 용도로 쓰지 않는다. */
const ALERT_COLOR = '#ff3d9a';

const VESSEL_SVG = `
<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
  <path d="M12 1.5 L19.5 21.5 L12 17.2 L4.5 21.5 Z"
        fill="#35e0c4" stroke="#071119" stroke-width="1.2" stroke-linejoin="round" />
</svg>`;

const toLatLng = (point: TrackPoint): L.LatLngTuple => [point.lat, point.lon];

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const fullTrackRef = useRef<L.Polyline | null>(null);
  const traveledRef = useRef<L.Polyline | null>(null);
  const vesselRef = useRef<L.Marker | null>(null);
  const alertRef = useRef<L.LayerGroup | null>(null);

  const points = usePlaybackStore((state) => state.points);
  const issues = usePlaybackStore((state) => state.issues);
  const [showFullTrack, setShowFullTrack] = useState(true);

  // 지도는 한 번만 만든다.
  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [35.05, 129.1],
      zoom: 11,
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    if (KHOA_KEY) {
      // 전자해도 배경. ENC에 항로표지가 이미 들어 있어 OpenSeaMap 오버레이는 얹지 않는다.
      // KHOA는 WMS 파라미터를 대문자로 요구한다(SERVICE/REQUEST/BBOX…). Leaflet 기본은 소문자라
      // uppercase:true로 맞추고, 대문자화하면 안 되는 ServiceKey는 base URL에 직접 붙인다.
      L.tileLayer
        .wms(`${KHOA_ENC_WMS}?ServiceKey=${KHOA_KEY}`, {
          uppercase: true,
          layers: '',
          format: 'image/png',
          transparent: true,
          version: '1.3.0',
          maxZoom: 19,
          attribution: '&copy; 국립해양조사원 개방海(해아름)',
        })
        .addTo(map);
    } else {
      L.tileLayer(BASE_TILES, {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      L.tileLayer(SEAMARK_TILES, {
        attribution: '&copy; OpenSeaMap',
        maxZoom: 18,
        opacity: 0.9,
      }).addTo(map);
    }

    // 옅은 전체 항적 → 지나온 항적 → 마커 순으로 쌓는다.
    fullTrackRef.current = L.polyline([], {
      color: '#35e0c4',
      weight: 1.5,
      opacity: 0.28,
    }).addTo(map);

    traveledRef.current = L.polyline([], {
      color: '#35e0c4',
      weight: 2.5,
      opacity: 0.95,
    }).addTo(map);

    // 이상 구간 하이라이트. 항적 위, 마커 아래(마커는 별도 pane이라 항상 위).
    alertRef.current = L.layerGroup().addTo(map);

    vesselRef.current = L.marker([35.05, 129.1], {
      icon: L.divIcon({
        className: 'vessel-marker',
        html: `<div class="vessel-rot">${VESSEL_SVG}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      }),
      interactive: false,
      keyboard: false,
    }).addTo(map);

    // flex 레이아웃에서 컨테이너 크기가 나중에 정해지면 타일이 어긋난다.
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 데이터가 바뀌면 전체 항적을 다시 그리고 화면을 맞춘다.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const latLngs = points.map(toLatLng);
    fullTrackRef.current?.setLatLngs(latLngs);
    traveledRef.current?.setLatLngs([]);

    if (latLngs.length === 0) return;

    map.fitBounds(L.latLngBounds(latLngs), { padding: [48, 48] });
    vesselRef.current?.setLatLng(latLngs[0]);
  }, [points]);

  useEffect(() => {
    fullTrackRef.current?.setStyle({ opacity: showFullTrack ? 0.28 : 0 });
  }, [showFullTrack]);

  // 이상 구간을 마젠타로 덧그린다. jump는 튄 구간(선), 나머지는 해당 지점(원).
  useEffect(() => {
    const layer = alertRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;

    layer.clearLayers();
    const marked = new Set<number>();

    for (const issue of issues as Issue[]) {
      const point = points[issue.index];
      if (!point) continue;

      if (issue.kind === 'jump' && points[issue.index - 1]) {
        L.polyline([toLatLng(points[issue.index - 1]), toLatLng(point)], {
          color: ALERT_COLOR,
          weight: 3,
          opacity: 0.9,
        }).addTo(layer);
      }

      if (marked.has(issue.index)) continue;
      marked.add(issue.index);
      L.circleMarker(toLatLng(point), {
        radius: 6,
        color: ALERT_COLOR,
        weight: 2,
        fill: false,
      }).addTo(layer);
    }
  }, [issues, points]);

  /*
   * 커서는 재생 중 매 프레임 바뀐다. React 상태로 구독하면 프레임마다
   * 리렌더가 도므로, 스토어를 직접 구독해 Leaflet 객체만 갱신한다.
   */
  useEffect(() => {
    const update = (state: { points: TrackPoint[]; cursor: number }) => {
      const current = interpolateAt(state.points, state.cursor);
      if (!current) return;

      vesselRef.current?.setLatLng([current.lat, current.lon]);

      const element = vesselRef.current?.getElement()?.querySelector<HTMLElement>('.vessel-rot');
      if (element) element.style.transform = `rotate(${current.heading}deg)`;

      traveledRef.current?.setLatLngs([
        ...state.points.slice(0, current.index + 1).map(toLatLng),
        [current.lat, current.lon] as L.LatLngTuple,
      ]);
    };

    update(usePlaybackStore.getState());
    return usePlaybackStore.subscribe(update);
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {points.length > 0 && (
        <label className="absolute top-3 right-3 z-[400] flex cursor-pointer items-center gap-2 rounded border border-hairline bg-deep/90 px-3 py-2 text-xs text-dim backdrop-blur">
          <input
            type="checkbox"
            checked={showFullTrack}
            onChange={(event) => setShowFullTrack(event.target.checked)}
            className="accent-track"
          />
          전체 항적 미리보기
        </label>
      )}
    </div>
  );
}
