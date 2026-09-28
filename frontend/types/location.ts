export interface HomeArea {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  source: 'gps' | 'map';
}
