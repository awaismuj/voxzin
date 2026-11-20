import { cache } from 'react';
import type {
  ArticleDetail,
  ArticleFeedbackDto,
  ArticleSummary,
  CategoryDto,
  CountryDto,
  HomeFeed,
  HomepageFeedbackDto,
  Paginated,
  TrendTopicDto,
} from '@voxzin/shared';

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:4000/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, revalidate: number | false = 60): Promise<T> {
  const options = revalidate === false ? { cache: 'no-store' as const } : { next: { revalidate } };
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) throw new ApiError(res.status, `API request failed (${res.status})`);
  return (await res.json()) as T;
}

export const getHome = () => request<HomeFeed>('/home');
export const getHomepageFeedback = () => request<{ items: HomepageFeedbackDto[] }>('/feedback/home', 30);
export const getCategories = () => request<CategoryDto[]>('/categories', 300);
export const getCountries = () => request<CountryDto[]>('/countries', 300);
export const getPublicSettings = () => request<{ brandName: string; tagline: string; contactEmail: string; social?: Record<string, string> }>('/settings', 300);
export const getArticle = cache((slug: string) => request<ArticleDetail>(`/articles/${encodeURIComponent(slug)}`));
export const getArticleFeedback = (slug: string, page = 1) =>
  request<Paginated<ArticleFeedbackDto>>(`/articles/${encodeURIComponent(slug)}/feedback?page=${page}`, 30);
export const getArticles = (params: { category?: string; page?: number }) => {
  const q = new URLSearchParams();
  if (params.category) q.set('category', params.category);
  if (params.page && params.page > 1) q.set('page', String(params.page));
  return request<Paginated<ArticleSummary>>(`/articles?${q.toString()}`);
};

export const getSearch = (q: string, page = 1) =>
  request<Paginated<ArticleSummary>>(`/search?${new URLSearchParams({ q, ...(page > 1 ? { page: String(page) } : {}) })}`, 30);
export const getTrending = (country: string) => request<TrendTopicDto[]>(`/trending?country=${encodeURIComponent(country)}`, 120);
export const getTrendTopic = cache((slug: string, country?: string) =>
  request<TrendTopicDto>(`/trending/${encodeURIComponent(slug)}${country ? `?country=${encodeURIComponent(country)}` : ''}`, 120));
export const getSitemapData = () => request<{
  articles: { slug: string; updatedAt: string; canonicalUrl: string | null; imageUrl: string | null }[];
  trendingTopics: { slug: string; updatedAt: string }[];
  categories: { slug: string; pages: number }[];
  latestPages: number;
}>('/sitemap', 300);
