export interface RankResult {
  keyword: string;
  rank: number | 'Not Found';
  page: number | '-';
  positionOnPage: number | '-';
  rankingUrl: string | '-';
  device: DeviceType | '-';
}

export type CountryCode = 'in' | 'us' | 'uk' | 'ca' | 'au';
export type DeviceType = 'desktop' | 'mobile';

export interface SerpSearchResult {
  position: number;
  title: string;
  displayedUrl: string;
  link: string;
}
