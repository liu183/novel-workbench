export interface BookSearchResult {
  id: string;
  title: string;
  author: string;
  source: string;
  provider: string;
  cover?: string;
  intro?: string;
  formats: string[];
  downloadUrl?: string;
  detailUrl?: string;
}

/** 统一书源接口。新增来源只需实现此接口并注册。 */
export interface BookSource {
  id: string;
  name: string;
  type: 'catalog' | 'open';
  enabled: boolean;
  search(query: string): Promise<BookSearchResult[]>;
  download?(result: BookSearchResult): Promise<string>;
}
