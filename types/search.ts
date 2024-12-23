export interface SearchResult {
  hits: Array<{
    document: {
      attributes: {
        click_count: number;
        created_at: string;
        description: string;
        externalId: string;
        icon: string;
        image: string;
        originalUrl: string;
        shortUrl: string;
        socialPreview: {
          image: string;
          title: string;
        };
        title: string;
      };
      created_at: number;
      creator_id: string;
      external_id: string;
      id: string;
      tags: string[];
      type: string;
      updated_at: number;
    };
    highlight: any;
    text_match: number;
  }>;
  found: number;
} 