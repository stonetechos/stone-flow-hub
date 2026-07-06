/**
 * Market pricing service interface. Future-ready — swap the provider without
 * touching consumers. The default provider forwards to the Lovable AI Gateway
 * estimator via the `marketPrice` server function.
 */

export type MarketPriceQuery = {
  stone_type: string;
  colour?: string;
  finish?: string;
  thickness_mm?: number;
  origin?: string;
  unit?: string;
};

export type MarketPriceResult = {
  low: number;
  average: number;
  high: number;
  unit: string;
  confidence: number;
  last_updated: string;
  source: string;
  notes?: string;
};

export interface MarketPriceProvider {
  price(q: MarketPriceQuery): Promise<MarketPriceResult | null>;
}
