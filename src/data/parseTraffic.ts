import Papa from 'papaparse';
import { mapRowsToTraffic, type TrafficMappingResult } from './trafficMapping';

export interface TrafficParseResult extends TrafficMappingResult {
  parseErrors: string[];
  totalRows: number;
}

/** traffic_숫자 CSV(File 또는 문자열)를 읽어 TargetShip[]로 변환한다. parseCsv.ts와 같은 방식. */
export async function parseTrafficCsv(input: File | string): Promise<TrafficParseResult> {
  const text = typeof input === 'string' ? input : await input.text();

  const results = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  return {
    ...mapRowsToTraffic(results.data),
    totalRows: results.data.length,
    parseErrors: results.errors.map((error) =>
      error.row === undefined ? error.message : `${error.row + 1}행: ${error.message}`,
    ),
  };
}

/** 매핑 결과를 사람이 읽는 한 줄 요약으로. */
export function summarizeTrafficParse(result: TrafficParseResult): string {
  if (result.missingRequired.length > 0) {
    return `필수 컬럼을 찾지 못했습니다: ${result.missingRequired.join(', ')}`;
  }
  const parts = [`타선 ${result.ships.length}척`];
  if (result.droppedRows > 0) parts.push(`${result.droppedRows}행 제외(값 없음/형식 오류)`);
  if (result.parseErrors.length > 0) parts.push(`파싱 오류 ${result.parseErrors.length}건`);
  return parts.join(' · ');
}
