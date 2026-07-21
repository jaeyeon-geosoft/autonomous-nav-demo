import Papa from 'papaparse';
import { mapRowsToTrack, type MappingResult } from './mapping';

export interface CsvParseResult extends MappingResult {
  /** papaparse가 보고한 행 단위 파싱 오류 */
  parseErrors: string[];
  /** CSV에서 읽은 전체 행 수 (매핑 전) */
  totalRows: number;
}

/**
 * CSV(File 또는 문자열)를 읽어 TrackPoint[]로 변환한다.
 *
 * 값 해석(숫자/시각/각도)은 전부 매핑 레이어가 담당하므로
 * 여기서는 dynamicTyping을 쓰지 않고 원본 문자열을 그대로 넘긴다.
 *
 * File도 직접 넘기지 않고 문자열로 읽어서 파싱한다. papaparse의 File 스트리밍
 * 경로는 브라우저 전용 API를 타서 Node에서 테스트할 수 없고, 항적 CSV 크기라면
 * 통째로 읽어도 부담이 없다. (수백 MB급이 들어오면 스트리밍으로 되돌릴 것)
 */
export async function parseCsv(input: File | string): Promise<CsvParseResult> {
  const text = typeof input === 'string' ? input : await input.text();

  const results = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  return {
    ...mapRowsToTrack(results.data),
    totalRows: results.data.length,
    parseErrors: results.errors.map((error) =>
      error.row === undefined ? error.message : `${error.row + 1}행: ${error.message}`,
    ),
  };
}

/** 매핑 결과를 사람이 읽는 한 줄 요약으로. */
export function summarizeParse(result: CsvParseResult): string {
  if (result.missingRequired.length > 0) {
    return `필수 컬럼을 찾지 못했습니다: ${result.missingRequired.join(', ')}`;
  }
  const parts = [`${result.points.length}개 포인트`];
  if (result.droppedRows > 0) parts.push(`${result.droppedRows}행 제외(값 없음/형식 오류)`);
  if (result.parseErrors.length > 0) parts.push(`파싱 오류 ${result.parseErrors.length}건`);
  return parts.join(' · ');
}
