import JSZip from 'jszip';
import { generateRecordFingerprint } from './crypto.ts';
import { YouTubeRecord, SearchRecord } from './types.ts';

const MAX_TOTAL_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50MB safe ceiling
const MAX_ZIP_ENTRIES = 5000;

export interface TakeoutParseResult {
  sourceType: 'youtube' | 'search' | 'mixed' | 'unknown';
  youtubeRecords: YouTubeRecord[];
  searchRecords: SearchRecord[];
  fileName: string;
  totalParsed: number;
  warnings: string[];
}

/**
 * Safely parse a Takeout file buffer (JSON, HTML, or ZIP)
 */
export async function parseTakeoutBuffer(
  buffer: Buffer,
  fileName: string,
  accountId: string
): Promise<TakeoutParseResult> {
  const lowerName = fileName.toLowerCase();
  const warnings: string[] = [];

  if (lowerName.endsWith('.zip')) {
    return parseTakeoutZip(buffer, fileName, accountId);
  } else if (lowerName.endsWith('.json')) {
    const text = buffer.toString('utf-8');
    return parseTakeoutJsonString(text, fileName, accountId);
  } else if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
    const text = buffer.toString('utf-8');
    return parseTakeoutHtmlString(text, fileName, accountId);
  } else {
    throw new Error('Unsupported Takeout file format. Supported formats: .json, .html, .zip');
  }
}

/**
 * Safe ZIP decompression with path traversal and bomb protection
 */
async function parseTakeoutZip(
  buffer: Buffer,
  zipFileName: string,
  accountId: string
): Promise<TakeoutParseResult> {
  const zip = new JSZip();
  let loadedZip: JSZip;
  try {
    loadedZip = await zip.loadAsync(buffer);
  } catch {
    throw new Error('Corrupt or invalid ZIP archive.');
  }

  const entries = Object.keys(loadedZip.files);
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new Error(`ZIP archive contains too many entries (${entries.length}). Maximum allowed is ${MAX_ZIP_ENTRIES}.`);
  }

  let totalBytesExtracted = 0;
  const youtubeRecords: YouTubeRecord[] = [];
  const searchRecords: SearchRecord[] = [];
  const warnings: string[] = [];

  for (const entryPath of entries) {
    const file = loadedZip.files[entryPath];
    if (file.dir) continue;

    // PATH TRAVERSAL GUARD: Reject entries with '..' or leading slash
    if (entryPath.includes('..') || entryPath.startsWith('/') || entryPath.startsWith('\\')) {
      warnings.push(`Skipped suspicious path traversal entry: ${entryPath}`);
      continue;
    }

    const lowerPath = entryPath.toLowerCase();
    const isYouTubeCandidate =
      lowerPath.includes('watch-history') ||
      lowerPath.includes('youtube') && (lowerPath.endsWith('.json') || lowerPath.endsWith('.html'));
    const isSearchCandidate =
      lowerPath.includes('search') ||
      (lowerPath.includes('my activity') && (lowerPath.endsWith('.json') || lowerPath.endsWith('.html')));

    if (isYouTubeCandidate || isSearchCandidate) {
      const content = await file.async('string');
      totalBytesExtracted += content.length;

      if (totalBytesExtracted > MAX_TOTAL_UNCOMPRESSED_BYTES) {
        throw new Error('Decompression limit exceeded (Decompression bomb protection). Maximum 50MB allowed.');
      }

      const baseName = entryPath.split('/').pop() || entryPath;
      if (lowerPath.endsWith('.json')) {
        const parsed = parseTakeoutJsonString(content, `${zipFileName}::${baseName}`, accountId);
        youtubeRecords.push(...parsed.youtubeRecords);
        searchRecords.push(...parsed.searchRecords);
        warnings.push(...parsed.warnings);
      } else if (lowerPath.endsWith('.html') || lowerPath.endsWith('.htm')) {
        const parsed = parseTakeoutHtmlString(content, `${zipFileName}::${baseName}`, accountId);
        youtubeRecords.push(...parsed.youtubeRecords);
        searchRecords.push(...parsed.searchRecords);
        warnings.push(...parsed.warnings);
      }
    }
  }

  let sourceType: TakeoutParseResult['sourceType'] = 'unknown';
  if (youtubeRecords.length > 0 && searchRecords.length > 0) sourceType = 'mixed';
  else if (youtubeRecords.length > 0) sourceType = 'youtube';
  else if (searchRecords.length > 0) sourceType = 'search';

  return {
    sourceType,
    youtubeRecords,
    searchRecords,
    fileName: zipFileName,
    totalParsed: youtubeRecords.length + searchRecords.length,
    warnings,
  };
}

/**
 * Parse Takeout JSON (both YouTube and Google Search structures)
 */
export function parseTakeoutJsonString(
  jsonText: string,
  sourceName: string,
  accountId: string
): TakeoutParseResult {
  const warnings: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Failed to parse JSON file (${sourceName}): Invalid JSON syntax.`);
  }

  const items = Array.isArray(parsed) ? parsed : [];
  if (!Array.isArray(parsed)) {
    warnings.push(`File ${sourceName} did not contain an array of records.`);
  }

  const youtubeRecords: YouTubeRecord[] = [];
  const searchRecords: SearchRecord[] = [];

  const nowIso = new Date().toISOString();

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;

    const raw = item as Record<string, any>;
    const header = String(raw.header || '').toLowerCase();
    const rawTitle = String(raw.title || '');
    const titleUrl = typeof raw.titleUrl === 'string' ? raw.titleUrl : undefined;
    const timeStr = String(raw.time || nowIso);

    // YouTube detection: header contains youtube, or title starts with 'Watched ', or url is youtube.com
    const isYouTube =
      header.includes('youtube') ||
      rawTitle.startsWith('Watched ') ||
      (titleUrl && (titleUrl.includes('youtube.com') || titleUrl.includes('youtu.be')));

    // Search detection: header contains search, or title starts with 'Searched for '
    const isSearch =
      header.includes('search') ||
      rawTitle.startsWith('Searched for ') ||
      (raw.products && Array.isArray(raw.products) && raw.products.includes('Search'));

    if (isYouTube) {
      const cleanTitle = rawTitle.replace(/^Watched\s+/i, '').trim() || 'Untitled Video';
      let channelTitle: string | undefined;
      let channelUrl: string | undefined;

      if (Array.isArray(raw.subtitles) && raw.subtitles.length > 0 && raw.subtitles[0]) {
        channelTitle = raw.subtitles[0].name;
        channelUrl = raw.subtitles[0].url;
      }

      const watchedAt = parseTakeoutTimestamp(timeStr);
      const recordId = generateRecordFingerprint([accountId, cleanTitle, watchedAt, titleUrl]);

      youtubeRecords.push({
        accountId,
        recordId,
        title: cleanTitle,
        titleUrl,
        channelTitle,
        channelUrl,
        watchedAt,
        importedAt: nowIso,
        source: sourceName,
      });
    } else if (isSearch) {
      const cleanQuery = rawTitle.replace(/^Searched for\s+/i, '').trim();
      if (cleanQuery) {
        const searchedAt = parseTakeoutTimestamp(timeStr);
        const recordId = generateRecordFingerprint([accountId, cleanQuery, searchedAt, titleUrl]);

        searchRecords.push({
          accountId,
          recordId,
          query: cleanQuery,
          searchUrl: titleUrl,
          searchedAt,
          importedAt: nowIso,
          source: sourceName,
        });
      }
    }
  }

  let sourceType: TakeoutParseResult['sourceType'] = 'unknown';
  if (youtubeRecords.length > 0 && searchRecords.length > 0) sourceType = 'mixed';
  else if (youtubeRecords.length > 0) sourceType = 'youtube';
  else if (searchRecords.length > 0) sourceType = 'search';

  return {
    sourceType,
    youtubeRecords,
    searchRecords,
    fileName: sourceName,
    totalParsed: youtubeRecords.length + searchRecords.length,
    warnings,
  };
}

/**
 * Parse Takeout HTML (My Activity / watch-history.html)
 */
export function parseTakeoutHtmlString(
  htmlText: string,
  sourceName: string,
  accountId: string
): TakeoutParseResult {
  const warnings: string[] = [];
  const youtubeRecords: YouTubeRecord[] = [];
  const searchRecords: SearchRecord[] = [];
  const nowIso = new Date().toISOString();

  // Robust regex parser for cell blocks in Google Takeout HTML
  // Matches: <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">...</div>
  const cellRegex = /<div class="[^"]*content-cell[^"]*">([\s\S]*?)<\/div>/gi;
  let match: RegExpExecArray | null;

  while ((match = cellRegex.exec(htmlText)) !== null) {
    const cellContent = match[1];

    // YouTube pattern: Watched <a href="url">Title</a>
    const ytMatch = /Watched\s+<a\s+href="([^"]+)">([^<]+)<\/a>/i.exec(cellContent);
    if (ytMatch) {
      const titleUrl = ytMatch[1];
      const title = decodeHtmlEntities(ytMatch[2].trim());

      // Channel pattern: <br><a href="channelUrl">Channel Name</a>
      const channelMatch = /<br><a\s+href="([^"]+)">([^<]+)<\/a>/i.exec(cellContent);
      const channelUrl = channelMatch ? channelMatch[1] : undefined;
      const channelTitle = channelMatch ? decodeHtmlEntities(channelMatch[2].trim()) : undefined;

      // Date pattern: usually after last <br>
      const parts = cellContent.split(/<br\s*\/?>/i);
      const dateText = parts[parts.length - 1] ? decodeHtmlEntities(parts[parts.length - 1].replace(/<[^>]+>/g, '').trim()) : '';
      const watchedAt = parseTakeoutTimestamp(dateText);
      const recordId = generateRecordFingerprint([accountId, title, watchedAt, titleUrl]);

      youtubeRecords.push({
        accountId,
        recordId,
        title,
        titleUrl,
        channelTitle,
        channelUrl,
        watchedAt,
        importedAt: nowIso,
        source: sourceName,
      });
      continue;
    }

    // Search pattern: Searched for <a href="url">Query</a> or Searched for Query
    const searchMatch = /Searched for\s+(?:<a[^>]*href="([^"]*)"[^>]*>)?([^<]+)(?:<\/a>)?/i.exec(cellContent);
    if (searchMatch) {
      const searchUrl = searchMatch[1] || undefined;
      const query = decodeHtmlEntities(searchMatch[2].trim());

      const parts = cellContent.split(/<br\s*\/?>/i);
      const dateText = parts[parts.length - 1] ? decodeHtmlEntities(parts[parts.length - 1].replace(/<[^>]+>/g, '').trim()) : '';
      const searchedAt = parseTakeoutTimestamp(dateText);
      const recordId = generateRecordFingerprint([accountId, query, searchedAt, searchUrl]);

      searchRecords.push({
        accountId,
        recordId,
        query,
        searchUrl,
        searchedAt,
        importedAt: nowIso,
        source: sourceName,
      });
    }
  }

  let sourceType: TakeoutParseResult['sourceType'] = 'unknown';
  if (youtubeRecords.length > 0 && searchRecords.length > 0) sourceType = 'mixed';
  else if (youtubeRecords.length > 0) sourceType = 'youtube';
  else if (searchRecords.length > 0) sourceType = 'search';

  return {
    sourceType,
    youtubeRecords,
    searchRecords,
    fileName: sourceName,
    totalParsed: youtubeRecords.length + searchRecords.length,
    warnings,
  };
}

function parseTakeoutTimestamp(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch {
    // fallback
  }
  return new Date().toISOString();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
