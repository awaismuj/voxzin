export interface RawTrend {
  title: string;
  country: string;
  source: string;
  sourceUrl?: string;
  sourcePublishedAt?: Date;
  /** Only a value the source itself reported (e.g. "200K+"). Never computed or guessed. */
  trendMetric?: string;
}

/** Add a provider by implementing this. Providers must only read sources we are permitted to use. */
export interface TrendProvider {
  readonly name: string;
  fetch(country: string): Promise<RawTrend[]>;
}
