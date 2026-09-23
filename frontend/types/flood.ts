export type FloodStatus = 'normal' | 'alert' | 'minor' | 'major' | 'unknown';

/** A gauging station, from the Irrigation Department's static station reference table. */
export interface FloodStation {
  station: string;
  basin: string;
  alertLevel: number | null;
  minorFloodLevel: number | null;
  majorFloodLevel: number | null;
  unit: string;
}

/** One reading (current or historical) for a station. */
export interface FloodReading {
  gauge: string;
  basin: string;
  waterLevel: number;
  rainFall: number | null;
  alertLevel: number | null;
  minorFloodLevel: number | null;
  majorFloodLevel: number | null;
  timestamp: number; // epoch ms
}
