import axios from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SearchResult {
  title: string;
  snippet: string;
  link?: string;
}

// ─── In-Memory Cache (24h TTL) ────────────────────────────────────────────────
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  results: SearchResult[];
  expiresAt: number;
}

const searchCache = new Map<string, CacheEntry>();

function getCached(query: string): SearchResult[] | null {
  const entry = searchCache.get(query);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    searchCache.delete(query);
    return null;
  }
  return entry.results;
}

function setCache(query: string, results: SearchResult[]): void {
  searchCache.set(query, {
    results,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ─── Core Search Function ─────────────────────────────────────────────────────
/**
 * Searches the web using Serper API (Google Search).
 * Returns top 3 organic results. Results are cached per query for 24 hours.
 * Returns empty array gracefully if SERPER_API_KEY is not configured.
 */
export async function searchWeb(query: string): Promise<SearchResult[]> {
  // 1. Check cache first
  const cached = getCached(query);
  if (cached) {
    console.log(`[SearchService] Cache HIT for: "${query}"`);
    return cached;
  }

  // 2. Skip if no API key configured (will trigger fallback in calling code)
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.warn('[SearchService] SERPER_API_KEY not set — skipping web search.');
    return [];
  }

  try {
    console.log(`[SearchService] Fetching web results for: "${query}"`);

    const res = await axios.post<any>(
      'https://google.serper.dev/search',
      { q: query, num: 5 },
      {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 second timeout — don't let slow searches block interview flow
      }
    );

    const organic: any[] = (res.data as any)?.organic ?? [];
    const results: SearchResult[] = organic.slice(0, 3).map((r) => ({
      title: r.title ?? '',
      snippet: r.snippet ?? '',
      link: r.link,
    }));

    // 3. Cache successful results
    setCache(query, results);

    return results;
  } catch (err: any) {
    console.error('[SearchService] Search failed:', err?.message ?? err);
    return []; // Graceful degradation — caller should fall back to base prompt
  }
}

// ─── Format Helper ────────────────────────────────────────────────────────────
/**
 * Converts raw search results into a clean context string for Gemini injection.
 */
export function formatSearchContext(results: SearchResult[]): string {
  if (results.length === 0) return '';
  return results
    .map((r) => `• ${r.title}: ${r.snippet}`)
    .join('\n');
}

// ─── Dynamic Query Builder ────────────────────────────────────────────────────
/**
 * Generates an optimized Serper search query for a given job role and stage.
 */
export function buildSearchQuery(category: string, stage: string): string {
  const year = new Date().getFullYear();
  const stageContext: Record<string, string> = {
    Technical: `${category} technical interview questions ${year} latest trends`,
    Scenario: `${category} behavioral scenario interview STAR questions ${year}`,
    HR: `${category} HR culture fit interview questions ${year}`,
    Introduction: `${category} interview introduction questions ${year}`,
    Closing: `${category} interview closing questions candidate tips ${year}`,
  };
  return stageContext[stage] ?? `${category} interview questions trends ${year}`;
}
