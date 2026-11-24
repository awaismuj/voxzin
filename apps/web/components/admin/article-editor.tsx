'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import { canTransition, getYouTubeVideoId, TRANSITIONS, type ArticleStatus, type Role } from '@voxzin/shared';
import { adminFetch } from '@/lib/admin-client';
import { StoryFrame } from '@/components/story-frame';
import { RichEditor } from './rich-editor';
import { MediaPicker } from './media-picker';
import { btn, btnGhost, card, input, label } from './ui';

export interface ArticleDoc {
  id?: string; title?: string; subtitle?: string; excerpt?: string; content?: string; category?: string; author?: string;
  tags?: string[]; sources?: { title: string; url: string }[]; featuredImage?: { url: string; alt: string };
  youtubeUrl?: string | null;
  seoTitle?: string; metaDescription?: string; socialTitle?: string; socialDescription?: string; focusKeyword?: string; canonicalUrl?: string; isFeatured?: boolean; isBreaking?: boolean;
  status?: ArticleStatus; slug?: string; aiAssisted?: boolean;
}
type Opt = { _id: string; name: string };
type TagSuggestion = { tag: string; topic: string; updatedAt: string; trendMetric: string | null };

const parseSources = (text: string) =>
  text
    .replace(/```(?:text)?\s*/gi, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^Sources$/i.test(line) && !/^---+$/.test(line))
    .flatMap((line) => {
      const match = line.match(/^(.*?)\s*\|\s*(https:\/\/\S+)\s*$/i);
      return match ? [{ title: match[1]!.trim(), url: match[2]!.trim() }] : [];
    });

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function markdownToArticleHtml(markdown: string) {
  const source = markdown.trim();
  if (!source) return '';

  const links: string[] = [];
  const withLinks = source.replace(/!?\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi, (_match, text: string, url: string) => {
    const token = `VOXZINLINKTOKEN${links.length}VOXZINEND`;
    links.push(`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`);
    return token;
  });

  const inline = (value: string) => {
    let output = escapeHtml(value);
    output = output.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    output = output.replace(/__(.+?)__/g, '<strong>$1</strong>');
    output = output.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    output = output.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
    output = output.replace(/VOXZINLINKTOKEN(\d+)VOXZINEND/g, (_match, index: string) => links[Number(index)] ?? '');
    return output;
  };

  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (listType) html.push(`</${listType}>`);
    listType = null;
  };

  for (const rawLine of withLinks.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }
    const heading = line.match(/^\*\*(.+)\*\*$/);
    if (heading) {
      flushParagraph();
      closeList();
      html.push(`<h3>${inline(heading[1]!)}</h3>`);
      continue;
    }
    const unordered = line.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (listType !== 'ul') { closeList(); html.push('<ul>'); listType = 'ul'; }
      html.push(`<li>${inline(unordered[1]!)}</li>`);
      continue;
    }
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (listType !== 'ol') { closeList(); html.push('<ol>'); listType = 'ol'; }
      html.push(`<li>${inline(ordered[1]!)}</li>`);
      continue;
    }
    closeList();
    paragraph.push(line);
  }
  flushParagraph();
  closeList();
  return html.join('\n');
}

function getLabeledValue(text: string, labels: string[]) {
  const fieldLabels = [
    'Headline', 'Subtitle', 'Excerpt', 'Category', 'Tags', 'Featured Image Alt Text',
    'Featured Image URL', 'YouTube', 'YouTube URL', 'Focus Phrase', 'SEO Title',
    'Meta Description', 'Social Share Title', 'Social Share Description', 'Canonical URL',
    'Sources', 'SEO', 'SEO & Sharing', 'Body',
  ];
  const normalizeLabel = (line: string) =>
    line.trim().replace(/^#+\s*/, '').replace(/^\*{1,2}|\*{1,2}$/g, '').replace(/:$/, '').trim().toLocaleLowerCase();
  const lines = text.replace(/\r/g, '').split('\n');
  const wanted = new Set(labels.map((label) => label.toLocaleLowerCase()));
  const start = lines.findIndex((line) => wanted.has(normalizeLabel(line)));
  if (start < 0) return '';

  const nextField = lines.findIndex((line, index) =>
    index > start && fieldLabels.some((label) => normalizeLabel(line) === label.toLocaleLowerCase()),
  );
  const end = nextField < 0 ? lines.length : nextField;
  const section = lines.slice(start + 1, end);
  while (section.length && /^-{3,}$/.test(section[0]!.trim())) section.shift();
  while (section.length && /^-{3,}$/.test(section.at(-1)!.trim())) section.pop();
  const value = section.join('\n').trim();
  if (labels.some((label) => label.toLocaleLowerCase() === 'sources')) {
    return value.replace(/^text\s*\n/i, '').replace(/^```(?:text)?\s*\n?/i, '').replace(/\n?```$/i, '').trim();
  }
  return value;
}

function getInlineLabeledValue(text: string, labels: string[]) {
  const lines = text.replace(/\r/g, '').split('\n');
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const pattern = new RegExp(
      `^\\s*(?:[-*]\\s*)?\\*{0,2}${escaped}(?:\\s*\\([^)]*\\))?\\s*:?\\*{0,2}\\s*:?\\s*(.*?)\\s*$`,
      'i',
    );
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) return match[1]!.trim().replace(/^`(.*)`$/, '$1');
    }
  }
  return '';
}

function stripImportCodeFence(text: string) {
  return text.trim().replace(/^```(?:text|md|markdown)?\s*\n?/i, '').replace(/\n?```$/i, '').trim();
}

function resolveCategory(categoryName: string, categories: Opt[]) {
  const normalize = (value: string) => value.toLocaleLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(news|culture)\b/g, '')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const choices = categoryName.split(/\s*\(or\s*/i).map((choice) => normalize(choice));
  for (const wanted of choices) {
    const category = categories.find((item) => normalize(item.name) === wanted)
      ?? categories.find((item) => wanted && new RegExp(`\\b${wanted.replace(/\s+/g, '\\s+')}\\b`).test(normalize(item.name)))
      ?? (wanted === 'cricket' ? categories.find((item) => normalize(item.name) === 'sports') : undefined);
    if (category) return category._id;
  }
  return '';
}

function articleText(html: string) {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|#160);/gi, ' ')
    .replace(/&(?:amp|lt|gt|quot|#39);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function ArticleEditor({ initial, categories, authors, role }: { initial?: ArticleDoc; categories: Opt[]; authors: Opt[]; role: Role }) {
  const router = useRouter();
  const [f, setF] = useState<ArticleDoc>({ tags: [], sources: [], isFeatured: false, isBreaking: false, ...initial });
  const [sourcesText, setSourcesText] = useState((initial?.sources ?? []).map((s) => `${s.title} | ${s.url}`).join('\n'));
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(', '));
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [warnings, setWarnings] = useState<{ id: string; title: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [when, setWhen] = useState('');
  const [aiTask, setAiTask] = useState<'headlines' | 'outline' | 'summary' | 'seo' | 'readability'>('headlines');
  const [aiOut, setAiOut] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const [tagSuggestionsBusy, setTagSuggestionsBusy] = useState(false);
  const [tagSuggestionsMessage, setTagSuggestionsMessage] = useState<{ kind: 'status' | 'error'; text: string } | null>(null);
  const [importText, setImportText] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const set = <K extends keyof ArticleDoc>(k: K, v: ArticleDoc[K]) => setF((p) => ({ ...p, [k]: v }));
  const status = f.status ?? 'draft';
  const isAuthor = role === 'author';
  const locked = isAuthor && !['research', 'idea', 'draft'].includes(status) && Boolean(f.id);

  const payload = () => ({
    title: f.title, subtitle: f.subtitle || undefined, excerpt: f.excerpt, content: f.content,
    categoryId: f.category, authorId: f.author || undefined,
    tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
    sources: parseSources(sourcesText),
    featuredImage: f.featuredImage?.url ? { url: f.featuredImage.url, alt: f.featuredImage.alt || f.title } : undefined,
    youtubeUrl: f.youtubeUrl?.trim() || null,
    seoTitle: f.seoTitle || undefined, metaDescription: f.metaDescription || undefined,
    socialTitle: f.socialTitle || undefined, socialDescription: f.socialDescription || undefined,
    focusKeyword: f.focusKeyword || undefined, canonicalUrl: f.canonicalUrl || undefined,
    isFeatured: Boolean(f.isFeatured), isBreaking: Boolean(f.isBreaking), aiAssisted: Boolean(f.aiAssisted),
  });

  async function save() {
    setBusy(true); setMsg(null);
    try {
      if (f.id) {
        const r = await adminFetch<{ warnings: { id: string; title: string }[] }>(`/admin/articles/${f.id}`, { method: 'PATCH', body: payload() });
        setWarnings(r.warnings ?? []);
        setMsg({ kind: 'ok', text: 'Saved.' });
        router.refresh();
      } else {
        const r = await adminFetch<{ id: string }>('/admin/articles', { method: 'POST', body: payload() });
        router.replace(`/admin/articles/${r.id}`);
      }
    } catch (e) { setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Save failed' }); } finally { setBusy(false); }
  }

  async function move(to: ArticleStatus) {
    setBusy(true); setMsg(null);
    try {
      await adminFetch(`/admin/articles/${f.id}/transition`, { method: 'POST', body: { status: to, scheduledAt: to === 'scheduled' && when ? new Date(when).toISOString() : undefined } });
      set('status', to);
      setMsg({ kind: 'ok', text: `Moved to ${to.replace('_', ' ')}.` });
      router.refresh();
    } catch (e) { setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not change status' }); } finally { setBusy(false); }
  }

  async function runAi() {
    setAiOut('Thinking…');
    try {
      const text = (f.content ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || `${f.title ?? ''}. ${f.excerpt ?? ''}`;
      const r = await adminFetch<{ text: string }>('/admin/ai/assist', { method: 'POST', body: { task: aiTask, text } });
      setAiOut(r.text);
      set('aiAssisted', true);
    } catch (e) { setAiOut(e instanceof Error ? e.message : 'AI request failed'); }
  }

  function pickImage(image: { url: string; alt: string }) {
    set('featuredImage', image);
  }

  function buildImportedArticle(): {
    title: string;
    subtitle?: string;
    excerpt: string;
    content: string;
    categoryId?: string;
    tags: string[];
    sources: { title: string; url: string }[];
    featuredImage?: { url: string; alt: string };
    youtubeUrl?: string | null;
    seoTitle?: string;
    metaDescription?: string;
    socialTitle?: string;
    socialDescription?: string;
    focusKeyword?: string;
    canonicalUrl?: string;
  } | null {
    setImportOpen(false);
    setMsg(null);
    const text = stripImportCodeFence(importText);
    if (!text) {
      setMsg({ kind: 'error', text: 'Paste article fields or JSON before importing.' });
      setImportOpen(true);
      return null;
    }

    let imported: Record<string, unknown> | null = null;
    if (text.startsWith('{')) {
      try { imported = JSON.parse(text) as Record<string, unknown>; } catch {
        setMsg({ kind: 'error', text: 'The pasted JSON is invalid.' });
        setImportOpen(true);
        return null;
      }
    }

    const get = (jsonKey: string, labels: string[]) => {
      if (imported && typeof imported[jsonKey] === 'string') return imported[jsonKey] as string;
      return getLabeledValue(text, labels) || getInlineLabeledValue(text, labels);
    };

    const title = get('title', ['Headline']);
    const subtitle = get('subtitle', ['Subtitle']);
    const excerpt = get('excerpt', ['Excerpt']);
    const body = get('content', ['Body']).replace(/^```(?:html|md|markdown)?\s*\n?/i, '').replace(/\n?```$/i, '').trim();
    const categoryName = get('category', ['Category']);
    const tags = get('tags', ['Tags']);
    const sources = get('sources', ['Sources']);
    const seoTitle = get('seoTitle', ['SEO title', 'SEO Title']);
    const metaDescription = get('metaDescription', ['Meta description', 'Meta Description']);
    const rawSocialTitle = get('socialTitle', ['Social share title', 'Social Share Title']);
    const socialTitle = rawSocialTitle.length > 70 ? rawSocialTitle.slice(0, 70).trimEnd() : rawSocialTitle;
    const socialDescription = get('socialDescription', ['Social share description', 'Social Share Description']);
    const focusKeyword = get('focusKeyword', ['Focus phrase', 'Focus Phrase']);
    const youtubeUrl = get('youtubeUrl', ['YouTube video', 'YouTube URL', 'YouTube']);
    const canonicalUrl = get('canonicalUrl', ['Canonical URL']);
    const nestedImage = imported?.featuredImage;
    const imageUrl = get('featuredImageUrl', ['Featured Image URL'])
      || (typeof nestedImage === 'object' && nestedImage && typeof (nestedImage as { url?: unknown }).url === 'string'
        ? (nestedImage as { url: string }).url
        : '');
    const imageAlt = get('featuredImageAlt', ['Featured Image Alt Text', 'Featured image alt text'])
      || (typeof nestedImage === 'object' && nestedImage && typeof (nestedImage as { alt?: unknown }).alt === 'string'
        ? (nestedImage as { alt: string }).alt
        : '');

    const missingFields = [
      !title && 'Headline',
      !excerpt && 'Excerpt',
      !body && 'Body',
    ].filter((field): field is string => Boolean(field));
    if (missingFields.length) {
      setMsg({ kind: 'error', text: `Could not find ${missingFields.join(', ')}. Check that each field label is on its own line.` });
      setImportOpen(true);
      return null;
    }

    const categoryId = resolveCategory(categoryName, categories) || f.category || undefined;
    const tagsValue = Array.isArray(imported?.tags)
      ? (imported.tags as unknown[]).filter((tag): tag is string => typeof tag === 'string').join(', ')
      : tags;
    const sourcesValue = Array.isArray(imported?.sources)
      ? (imported.sources as { title?: string; url?: string }[]).map((source) => `${source.title ?? ''}${source.url ? ` | ${source.url}` : ''}`).join('\n')
      : sources;
    const importedTags = tagsValue.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 10);
    const importedSources = parseSources(sourcesValue);
    const featuredImage = imageUrl
      ? { url: imageUrl, alt: imageAlt || title }
      : imageAlt && f.featuredImage?.url
        ? { url: f.featuredImage.url, alt: imageAlt }
        : f.featuredImage?.url
          ? { ...f.featuredImage }
          : undefined;
    const content = markdownToArticleHtml(body);

    setF((current) => ({
      ...current,
      title,
      subtitle: subtitle || undefined,
      excerpt,
      content,
      category: categoryId,
      youtubeUrl: youtubeUrl.trim() || null,
      seoTitle: seoTitle || undefined,
      metaDescription: metaDescription || undefined,
      socialTitle: socialTitle || undefined,
      socialDescription: socialDescription || undefined,
      focusKeyword: focusKeyword || undefined,
      canonicalUrl: canonicalUrl || undefined,
      featuredImage,
    }));
    setTagsText(importedTags.join(', '));
    setSourcesText(sourcesValue);
    setTab('edit');
    setMsg({
      kind: 'ok',
      text: rawSocialTitle.length > 70
        ? 'Article fields imported. The social share title was shortened to its 70-character limit; review before saving.'
        : 'Article fields imported. Review them before saving.',
    });
    return {
      title,
      subtitle: subtitle || undefined,
      excerpt,
      content,
      categoryId,
      tags: importedTags,
      sources: importedSources,
      featuredImage,
      youtubeUrl: youtubeUrl.trim() || null,
      seoTitle: seoTitle || undefined,
      metaDescription: metaDescription || undefined,
      socialTitle: socialTitle || undefined,
      socialDescription: socialDescription || undefined,
      focusKeyword: focusKeyword || undefined,
      canonicalUrl: canonicalUrl || undefined,
    };
  }

  function applyImport() {
    buildImportedArticle();
  }

  async function importAndCreateDraft() {
    const imported = buildImportedArticle();
    if (!imported) return;
    if (!imported.categoryId) {
      setMsg({ kind: 'error', text: 'Choose a valid Category such as Sports or add it to the category list first.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await adminFetch<{ id: string }>('/admin/articles', {
        method: 'POST',
        body: { ...imported, aiAssisted: false, isFeatured: Boolean(f.isFeatured), isBreaking: Boolean(f.isBreaking) },
      });
      router.replace(`/admin/articles/${r.id}`);
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not create draft' });
    } finally {
      setBusy(false);
    }
  }

  const next = f.id ? TRANSITIONS[status].filter((to) => canTransition(role, status, to)) : [];
  const youtubeId = f.youtubeUrl ? getYouTubeVideoId(f.youtubeUrl) : null;
  const bodyText = articleText(f.content ?? '');
  const tagQuery = [f.title, f.excerpt, bodyText].filter(Boolean).join(' ').slice(0, 2000);
  const selectedTagKeys = new Set(tagsText.split(',').map((tag) => tag.trim().toLocaleLowerCase()).filter(Boolean));
  const visibleTagSuggestions = tagSuggestions.filter((suggestion) => !selectedTagKeys.has(suggestion.tag.toLocaleLowerCase()));
  const wordCount = bodyText ? bodyText.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)?.length ?? 0 : 0;
  const seoTitle = f.seoTitle?.trim() || f.title?.trim() || '';
  const metaDescription = f.metaDescription?.trim() || f.excerpt?.trim() || '';
  const socialTitle = f.socialTitle?.trim() || seoTitle;
  const socialDescription = f.socialDescription?.trim() || metaDescription;
  const focusKeyword = f.focusKeyword?.trim().toLocaleLowerCase() ?? '';
  const containsFocusKeyword = (value: string) => Boolean(focusKeyword && value.toLocaleLowerCase().includes(focusKeyword));
  const hasHeading = /<h[2-3]\b/i.test(f.content ?? '');
  const hasInternalLink = [...(f.content ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
    .some(([, href]) => href!.startsWith('/') && !href!.startsWith('//') || /^https?:\/\/(?:www\.)?voxzin\.com(?:\/|$)/i.test(href!));
  const openingParagraph = articleText((f.content ?? '').match(/<p\b[^>]*>[\s\S]*?<\/p>/i)?.[0] ?? '');
  const checks = [
    ...(focusKeyword ? [
      { label: 'Use the focus phrase in the headline', ready: containsFocusKeyword(f.title ?? '') },
      { label: 'Use the focus phrase in the SEO title', ready: containsFocusKeyword(seoTitle) },
      { label: 'Use the focus phrase naturally in the opening paragraph', ready: containsFocusKeyword(openingParagraph) },
      { label: 'Use the focus phrase naturally in the article', ready: containsFocusKeyword(bodyText) },
    ] : []),
    { label: 'SEO title is no longer than 60 characters (a useful target)', ready: seoTitle.length > 0 && seoTitle.length <= 60 },
    { label: 'Description is a useful length (120–160 characters is a guide)', ready: metaDescription.length >= 120 && metaDescription.length <= 160 },
    { label: 'Article has a clear section heading (H2 or H3)', ready: hasHeading },
    { label: 'Article has at least 300 words for a substantial story', ready: wordCount >= 300 },
    { label: 'Link to a relevant VoxZin article where useful', ready: hasInternalLink },
    { label: 'Add descriptive featured-image alt text', ready: Boolean(f.featuredImage?.url && f.featuredImage.alt.trim()) },
    { label: 'Add at least one source', ready: parseSources(sourcesText).length > 0 },
  ];
  const readyChecks = checks.filter((check) => check.ready).length;

  async function suggestTags() {
    if (tagQuery.trim().length < 20) {
      setTagSuggestions([]);
      setTagSuggestionsMessage({ kind: 'status', text: 'Add a headline and more article text to get relevant suggestions.' });
      return;
    }
    setTagSuggestionsBusy(true);
    setTagSuggestions([]);
    setTagSuggestionsMessage(null);
    try {
      const query = new URLSearchParams({ q: tagQuery });
      const result = await adminFetch<{ items: TagSuggestion[] }>(`/admin/articles/tag-suggestions?${query}`);
      setTagSuggestions(result.items);
      if (result.items.length === 0) {
        setTagSuggestionsMessage({ kind: 'status', text: 'No matching approved trends from the last 30 days. Add tags manually if they help readers.' });
      }
    } catch (e) {
      setTagSuggestionsMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Could not load trending tag suggestions.' });
    } finally {
      setTagSuggestionsBusy(false);
    }
  }

  function addTagSuggestion(tag: string) {
    const selected = tagsText.split(',').map((value) => value.trim()).filter(Boolean);
    if (selected.some((value) => value.toLocaleLowerCase() === tag.toLocaleLowerCase())) return;
    if (selected.length >= 10) {
      setTagSuggestionsMessage({ kind: 'error', text: 'Articles can have up to 10 tags.' });
      return;
    }
    setTagsText([...selected, tag].join(', '));
    setTagSuggestionsMessage({ kind: 'status', text: `Added “${tag}”. Review the tag before saving.` });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <section className={card}>
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            aria-expanded={importOpen}
            onClick={() => setImportOpen((open) => !open)}
          >
            <span>
              <span className="block font-semibold">Import article fields</span>
              <span className="mt-1 block text-xs text-muted">Paste one article template or JSON, then fill every field in one click.</span>
            </span>
            <span className="text-xl" aria-hidden="true">{importOpen ? '−' : '+'}</span>
          </button>
          {importOpen && (
            <div className="mt-3 space-y-3">
              <label className={label} htmlFor="article-import">Article template / JSON</label>
              <textarea
                id="article-import"
                rows={14}
                className={input}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={'**Headline**\nYour headline\n**Subtitle**\nYour subtitle\n**Excerpt**\nYour summary\n**Category**\nSports\n**Tags**\nCricket, Trending\n\n**Body**\nYour article body'}
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnGhost} onClick={applyImport} disabled={!importText.trim()}>
                  Import fields
                </button>
                <button type="button" className={btn} onClick={() => void importAndCreateDraft()} disabled={!importText.trim() || busy}>
                  Import and create draft
                </button>
              </div>
            </div>
          )}
        </section>
        <div className="flex gap-2" role="tablist">
          {(['edit', 'preview'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`${btnGhost} ${tab === t ? 'ring-1 ring-accent' : ''}`}>{t === 'edit' ? 'Write' : 'Preview'}</button>
          ))}
        </div>
        {tab === 'preview' ? (
          <article className="rounded-md border border-line bg-surface p-6">
            <h1 className="font-serif text-4xl font-semibold">{f.title}</h1>
            {f.subtitle && <p className="mt-2 font-serif text-xl text-muted">{f.subtitle}</p>}
            {f.featuredImage?.url && (
              <StoryFrame image={f.featuredImage} sizes="(min-width: 896px) 896px, 100vw" mode="card" className="mt-6 rounded-xl" />
            )}
            {youtubeId && (
              <div className="mt-6 aspect-video overflow-hidden rounded-xl bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                  title={`YouTube video: ${f.title || 'article video'}`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="size-full"
                />
              </div>
            )}
            <div className="article-body mt-6" dangerouslySetInnerHTML={{ __html: f.content ?? '' }} />
          </article>
        ) : (
          <fieldset disabled={locked} className="space-y-4">
            <div><label className={label} htmlFor="title">Headline</label><input id="title" className={input} value={f.title ?? ''} maxLength={200} onChange={(e) => set('title', e.target.value)} /></div>
            <div><label className={label} htmlFor="sub">Subtitle</label><input id="sub" className={input} value={f.subtitle ?? ''} maxLength={300} onChange={(e) => set('subtitle', e.target.value)} /></div>
            <div><label className={label} htmlFor="exc">Excerpt</label><textarea id="exc" rows={2} className={input} value={f.excerpt ?? ''} maxLength={400} onChange={(e) => set('excerpt', e.target.value)} /></div>
            <div>
              <label className={label} htmlFor="youtubeUrl">YouTube video (optional)</label>
              <input
                id="youtubeUrl"
                type="url"
                className={input}
                value={f.youtubeUrl ?? ''}
                onChange={(e) => set('youtubeUrl', e.target.value || null)}
                placeholder="https://www.youtube.com/watch?v=..."
                aria-describedby="youtube-help"
              />
              <p id="youtube-help" className="mt-1 text-xs text-muted">Paste a YouTube watch, youtu.be, Shorts, or live link. It appears below the featured image and above the article text.</p>
              {f.youtubeUrl && !youtubeId && <p role="alert" className="mt-1 text-xs text-red-600">Enter a valid HTTPS YouTube video URL.</p>}
            </div>
            <div><span className={label}>Body</span><RichEditor value={f.content ?? ''} onChange={(h) => set('content', h)} /></div>
            <div><label className={label} htmlFor="src">Sources (one per line: Title | https://link)</label>
              <textarea id="src" rows={4} className={input} value={sourcesText} onChange={(e) => setSourcesText(e.target.value)} />
              <p className="mt-1 text-xs text-muted">At least one source is required before an article can be scheduled or published.</p></div>
          </fieldset>
        )}
      </div>

      <aside className="space-y-4">
        <section className={card}>
          <p className="text-sm text-muted">Status</p>
          <p className="text-lg font-semibold capitalize">{f.id ? status.replace('_', ' ') : 'New'}</p>
          <button onClick={save} disabled={busy || locked} className={`${btn} mt-3 w-full`}>{busy ? 'Working…' : 'Save'}</button>
          {next.length > 0 && (
            <div className="mt-4 space-y-2">
              {next.includes('scheduled') && <input type="datetime-local" aria-label="Publish time" className={input} value={when} onChange={(e) => setWhen(e.target.value)} />}
              {next.map((to) => <button key={to} disabled={busy || (to === 'scheduled' && !when)} onClick={() => move(to)} className={`${btnGhost} w-full capitalize`}>{to === 'published' && status === 'published' ? 'Unpublish' : `Move to ${to.replace('_', ' ')}`}</button>)}
            </div>
          )}
          {locked && <p className="mt-3 text-sm text-muted">This article is with an editor, so it’s read-only for you.</p>}
          {msg && <p role={msg.kind === 'error' ? 'alert' : 'status'} className={`mt-3 text-sm ${msg.kind === 'error' ? 'text-red-600' : 'text-green-700 dark:text-green-400'}`}>{msg.text}</p>}
          {warnings.length > 0 && (
            <div className="mt-3 rounded border border-amber-400 bg-amber-50 p-2 text-sm text-amber-900">
              Possible duplicate coverage: {warnings.map((w) => w.title).join('; ')}
            </div>
          )}
        </section>

        <section className={`${card} space-y-3`}>
          <div><label className={label} htmlFor="cat">Category</label>
            <select id="cat" className={input} value={f.category ?? ''} onChange={(e) => set('category', e.target.value)}>
              <option value="">Choose…</option>{categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select></div>
          {!isAuthor && (
            <div><label className={label} htmlFor="auth">Author</label>
              <select id="auth" className={input} value={f.author ?? ''} onChange={(e) => set('author', e.target.value)}>
                <option value="">Me</option>{authors.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select></div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className={label} htmlFor="tags">Tags (comma separated)</label>
              <button type="button" className={`${btnGhost} px-2 py-1 text-xs`} onClick={() => void suggestTags()} disabled={tagSuggestionsBusy || locked}>
                {tagSuggestionsBusy ? 'Finding…' : 'Suggest trending tags'}
              </button>
            </div>
            <input id="tags" className={input} value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
            <p className="text-xs text-muted">Suggestions match this draft to recently approved VoxZin trends. Tags are editorial labels, not a Google ranking shortcut; review before adding.</p>
            {visibleTagSuggestions.length > 0 && (
              <div className="rounded-md border border-line p-3">
                <p className="text-xs font-medium text-muted">Relevant trend suggestions</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {visibleTagSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.tag}-${suggestion.topic}`}
                      type="button"
                      className="rounded-full border border-line px-2.5 py-1 text-xs hover:border-accent hover:text-accent-ink"
                      onClick={() => addTagSuggestion(suggestion.tag)}
                      disabled={locked || selectedTagKeys.size >= 10}
                      aria-label={`Add suggested tag ${suggestion.tag} from trending topic ${suggestion.topic}`}
                      title={`Trending topic: ${suggestion.topic}${suggestion.trendMetric ? ` · ${suggestion.trendMetric}` : ''}`}
                    >
                      + {suggestion.tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tagSuggestionsMessage && <p role={tagSuggestionsMessage.kind === 'error' ? 'alert' : 'status'} className={`text-xs ${tagSuggestionsMessage.kind === 'error' ? 'text-red-600' : 'text-muted'}`}>{tagSuggestionsMessage.text}</p>}
          </div>
          <div>
            <span className={label}>Featured image</span>
            <div className="mt-1"><MediaPicker triggerLabel={f.featuredImage?.url ? 'Change featured image' : 'Choose featured image'} onSelect={pickImage} /></div>
            <p className="mt-1 text-xs text-muted">Shown in a consistent 16:9 frame on the homepage and article page. Add images inside the story from the body editor toolbar.</p>
            {f.featuredImage?.url && (
              <>
                <StoryFrame image={f.featuredImage} sizes="(min-width: 768px) 50vw, 100vw" mode="card" className="mt-2 rounded" />
                <input aria-label="Image description" placeholder="Describe the image" className={`${input} mt-2`} value={f.featuredImage.alt} onChange={(e) => set('featuredImage', { url: f.featuredImage!.url, alt: e.target.value })} />
              </>
            )}
          </div>
          {!isAuthor && (
            <>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(f.isFeatured)} onChange={(e) => set('isFeatured', e.target.checked)} /> Featured on the homepage</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(f.isBreaking)} onChange={(e) => set('isBreaking', e.target.checked)} /> Show in breaking ticker</label>
            </>
          )}
        </section>

        <section className={`${card} space-y-3`}>
          <div>
            <h2 className="font-semibold">SEO &amp; sharing</h2>
            <p className="mt-1 text-xs text-muted">Make this story clear and useful for readers in search and when shared. These editorial checks are not a ranking score or guarantee.</p>
          </div>
          <div>
            <label className={label} htmlFor="focus-keyword">Focus phrase (optional)</label>
            <input id="focus-keyword" maxLength={80} className={input} value={f.focusKeyword ?? ''} onChange={(e) => set('focusKeyword', e.target.value)} placeholder="The main topic readers may search for" />
            <p className="mt-1 text-xs text-muted">Use one natural phrase to guide the checks below. Avoid repeating it unnaturally.</p>
          </div>
          <div>
            <label className={label} htmlFor="seot">SEO title</label>
            <input id="seot" maxLength={70} className={input} value={f.seoTitle ?? ''} onChange={(e) => set('seoTitle', e.target.value)} placeholder={f.title || 'Search result headline'} />
            <p className="mt-1 text-xs text-muted">{(f.seoTitle || f.title || '').length}/70 characters · Google may rewrite titles; prioritize accuracy and clarity.</p>
          </div>
          <div>
            <label className={label} htmlFor="seod">Meta description</label>
            <textarea id="seod" rows={3} maxLength={170} className={input} value={f.metaDescription ?? ''} onChange={(e) => set('metaDescription', e.target.value)} placeholder={f.excerpt || 'Summarize what readers will learn'} />
            <p className="mt-1 text-xs text-muted">{(f.metaDescription || f.excerpt || '').length}/170 characters · describe this story specifically; Google may show a different snippet.</p>
          </div>
          <div>
            <label className={label} htmlFor="social-title">Social share title (optional)</label>
            <input id="social-title" maxLength={70} className={input} value={f.socialTitle ?? ''} onChange={(e) => set('socialTitle', e.target.value)} placeholder={seoTitle || 'Title shown when shared'} />
            <p className="mt-1 text-xs text-muted">Leave blank to reuse the SEO title.</p>
          </div>
          <div>
            <label className={label} htmlFor="social-description">Social share description (optional)</label>
            <textarea id="social-description" rows={3} maxLength={200} className={input} value={f.socialDescription ?? ''} onChange={(e) => set('socialDescription', e.target.value)} placeholder={metaDescription || 'Description shown when shared'} />
            <p className="mt-1 text-xs text-muted">{(f.socialDescription || metaDescription).length}/200 characters · leave blank to reuse the search description.</p>
          </div>
          <div aria-label="Search result preview" className="overflow-hidden rounded-lg border border-line shadow-sm">
            <div className="flex items-center justify-between border-b border-line bg-bg px-3 py-2">
              <span className="text-xs font-semibold">Search preview</span>
              <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">Google</span>
            </div>
            <div className="bg-white p-4 text-[#202124]">
              <p className="text-xs text-[#5f6368]">voxzin.com › articles › {f.slug || 'article-url'}</p>
              <p className="mt-1 line-clamp-1 text-xl leading-snug text-[#1a0dab]">{f.seoTitle || f.title || 'Search result title'}</p>
              <p className="mt-1 line-clamp-2 text-sm text-[#4d5156]">{f.metaDescription || f.excerpt || 'A concise summary of this article will appear here.'}</p>
            </div>
          </div>
          <div aria-label="Social sharing preview" className="overflow-hidden rounded-lg border border-line shadow-sm">
            <div className="flex items-center justify-between border-b border-line bg-bg px-3 py-2">
              <span className="text-xs font-semibold">Social share preview</span>
              <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">Open Graph</span>
            </div>
            {f.featuredImage?.url && <div className="relative aspect-[1.91/1] bg-bg"><Image src={f.featuredImage.url} alt="" fill sizes="(min-width: 1024px) 25vw, 100vw" className="object-cover" /></div>}
            <div className="space-y-1 bg-surface p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">voxzin.com</p>
              <p className="line-clamp-2 text-sm font-semibold">{socialTitle || 'Story headline'}</p>
              <p className="line-clamp-2 text-xs text-muted">{socialDescription || 'Story summary shown when shared.'}</p>
            </div>
          </div>
          <div className="rounded-md border border-line p-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <h3 className="font-medium">Content readiness</h3>
              <span className="text-muted">{readyChecks}/{checks.length} checks</span>
            </div>
            <ul className="mt-2 space-y-2 text-xs">
              {checks.map((check) => (
                <li key={check.label} className="flex items-start gap-2">
                  <span aria-hidden="true" className={check.ready ? 'text-green-700 dark:text-green-400' : 'text-amber-700'}>{check.ready ? '✓' : '·'}</span>
                  <span className={check.ready ? 'text-muted' : 'text-ink'}>{check.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">{wordCount} words · {parseSources(sourcesText).length} source{parseSources(sourcesText).length === 1 ? '' : 's'}. Recommendations are guidance, not Google requirements.</p>
            {!focusKeyword && <p className="mt-2 text-xs text-muted">Add a focus phrase above to enable topic-relevance checks.</p>}
          </div>
          {f.featuredImage?.url && !f.featuredImage.alt.trim() && <p className="text-xs text-amber-700">Add descriptive alt text to the featured image.</p>}
          <div>
            <label className={label} htmlFor="canon">Canonical URL (optional)</label>
            <input id="canon" type="url" className={input} value={f.canonicalUrl ?? ''} onChange={(e) => set('canonicalUrl', e.target.value)} />
            <p className="mt-1 text-xs text-muted">Use the original URL only when this article republishes content from another page. Otherwise, leave blank so VoxZin is canonical.</p>
          </div>
          {f.slug && <p className="text-xs text-muted">URL slug is fixed after creation: /articles/{f.slug}</p>}
        </section>

        <section className={`${card} space-y-3`}>
          <h2 className="font-semibold">AI assistant</h2>
          <p className="text-xs text-muted">Suggestions only. Check every fact against your sources. Nothing is applied automatically.</p>
          <select aria-label="AI task" className={input} value={aiTask} onChange={(e) => setAiTask(e.target.value as typeof aiTask)}>
            <option value="headlines">Suggest headlines</option><option value="outline">Outline from notes</option><option value="summary">Summarise text</option>
            <option value="seo">SEO title and description</option><option value="readability">Readability notes</option>
          </select>
          <button type="button" onClick={runAi} className={`${btnGhost} w-full`}>Ask</button>
          {aiOut && <pre className="whitespace-pre-wrap rounded bg-bg p-2 text-xs">{aiOut}</pre>}
        </section>
      </aside>
    </div>
  );
}
