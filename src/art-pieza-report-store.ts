// src/art-pieza-report-store.ts

export type ArtPiezaReportRow = { artPieza: string; count: number };

let report: ArtPiezaReportRow[] = [];
const listeners = new Set<() => void>();

export function getArtPiezaReport(): ArtPiezaReportRow[] {
  return report;
}

export function subscribeArtPiezaReport(fn: () => void) {
  listeners.add(fn);
  // opcional pero recomendable
  return () => listeners.delete(fn);
}

export function setArtPiezaReport(data: ArtPiezaReportRow[]) {
  report = data;
  listeners.forEach((fn) => fn());
}
