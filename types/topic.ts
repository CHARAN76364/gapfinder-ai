export interface Topic {
  id: string;
  userId: string;
  docId: string;
  unit: string;
  name: string;
  order: number;
  keywords: string[];
  paperHits: number;
}
