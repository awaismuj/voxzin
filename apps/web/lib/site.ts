export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://voxzin.com').replace(/\/+$/, '');
export const SITE_NAME = 'VoxZin';
export const SITE_TAGLINE = "The Voice of What's Trending.";

/** Turns /path or an uploaded-image path into a full https://... address (search engines need absolute URLs). */
export const absoluteUrl = (pathOrUrl: string) => new URL(pathOrUrl, `${SITE_URL}/`).toString();
