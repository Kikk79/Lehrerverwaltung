import { AIResponse } from '../types';
import crypto from 'crypto';

/**
 * Service for caching AI responses to improve performance and reduce API costs
 * Implements intelligent caching with expiration and context-aware invalidation
 */
export class AICacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly MAX_CACHE_SIZE = 500; // Maximum number of cached responses
  private readonly DEFAULT_TTL = 3600000; // 1 hour in milliseconds
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Get cached response if available and valid
   */
  public getCachedResponse(request: CacheRequest): AIResponse | null {
    const cacheKey = this.generateCacheKey(request);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update access time and count
    entry.last_accessed = Date.now();
    entry.access_count++;

    return entry.response;
  }

  /**
   * Cache AI response
   */
  public cacheResponse(
    request: CacheRequest, 
    response: AIResponse,
    options: CacheOptions = {}
  ): void {
    const cacheKey = this.generateCacheKey(request);
    
    // Check if we should cache this response
    if (!this.shouldCache(request, response, options)) {
      return;
    }

    const entry: CacheEntry = {
      key: cacheKey,
      request,
      response,
      created_at: Date.now(),
      last_accessed: Date.now(),
      expires_at: Date.now() + (options.ttl || this.DEFAULT_TTL),
      access_count: 1,
      context_hash: this.generateContextHash(request),
      cache_tags: options.tags || []
    };

    // Make room if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(cacheKey, entry);
  }

  /**
   * Invalidate cache entries by tags or patterns
   */
  public invalidateCache(options: InvalidationOptions): number {
    let invalidatedCount = 0;

    if (options.tags && options.tags.length > 0) {
      invalidatedCount += this.invalidateByTags(options.tags);
    }

    if (options.context_changed) {
      invalidatedCount += this.invalidateByContextChange(options.context_changed);
    }

    if (options.key_pattern) {
      invalidatedCount += this.invalidateByKeyPattern(options.key_pattern);
    }

    if (options.clear_all) {
      invalidatedCount = this.cache.size;
      this.cache.clear();
    }

    return invalidatedCount;
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): CacheStats {
    const now = Date.now();
    let totalSize = 0;
    let expiredCount = 0;
    const typeBreakdown: Record<string, number> = {};

    this.cache.forEach((entry) => {
      totalSize += this.estimateEntrySize(entry);
      
      if (this.isExpired(entry)) {
        expiredCount++;
      }

      const type = entry.request.type || 'unknown';
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
    });

    const totalAccesses = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.access_count, 0);

    const averageAccessCount = this.cache.size > 0 ? totalAccesses / this.cache.size : 0;

    return {
      total_entries: this.cache.size,
      estimated_size_bytes: totalSize,
      expired_entries: expiredCount,
      hit_rate: this.calculateHitRate(),
      average_access_count: averageAccessCount,
      type_breakdown: typeBreakdown,
      oldest_entry_age: this.getOldestEntryAge(),
      cache_efficiency: this.calculateCacheEfficiency()
    };
  }

  /**
   * Clear expired entries manually
   */
  public clearExpired(): number {
    const now = Date.now();
    let clearedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        clearedCount++;
      }
    }

    return clearedCount;
  }

  /**
   * Optimize cache by removing low-value entries
   */
  public optimizeCache(): CacheOptimizationResult {
    const originalSize = this.cache.size;
    
    // Remove expired entries
    const expiredRemoved = this.clearExpired();
    
    // Remove entries with low access count and old age
    let lowValueRemoved = 0;
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.created_at;
      if (entry.access_count <= 1 && age > maxAge) {
        this.cache.delete(key);
        lowValueRemoved++;
      }
    }

    return {
      original_size: originalSize,
      final_size: this.cache.size,
      expired_removed: expiredRemoved,
      low_value_removed: lowValueRemoved,
      space_saved_bytes: this.estimateSpaceSaved(expiredRemoved + lowValueRemoved)
    };
  }

  /**
   * Export cache for debugging or backup
   */
  public exportCache(): CacheExport {
    const entries: CacheExportEntry[] = Array.from(this.cache.values()).map(entry => ({
      key: entry.key,
      request_type: entry.request.type,
      request_hash: this.generateCacheKey(entry.request),
      created_at: new Date(entry.created_at).toISOString(),
      last_accessed: new Date(entry.last_accessed).toISOString(),
      expires_at: new Date(entry.expires_at).toISOString(),
      access_count: entry.access_count,
      is_expired: this.isExpired(entry)
    }));

    return {
      entries,
      total_count: this.cache.size,
      export_timestamp: new Date().toISOString(),
      cache_stats: this.getCacheStats()
    };
  }

  /**
   * Configure cache settings
   */
  public configureCaching(config: CacheConfiguration): void {
    // This would update cache behavior in a real implementation
    console.log('Cache configuration updated:', config);
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: CacheRequest): string {
    const keyData = {
      type: request.type,
      message: request.message,
      system_prompt: request.system_prompt,
      model: request.model,
      temperature: request.temperature,
      // Include relevant context but not full objects to avoid huge keys
      context_signature: request.context ? this.generateContextHash(request) : null
    };

    const keyString = JSON.stringify(keyData);
    return crypto.createHash('sha256').update(keyString).digest('hex');
  }

  /**
   * Generate context hash for cache invalidation
   */
  private generateContextHash(request: CacheRequest): string {
    if (!request.context) {
      return '';
    }

    // Create hash based on relevant context data that affects responses
    const contextData = {
      teachers_count: request.context.teachers?.length || 0,
      courses_count: request.context.courses?.length || 0,
      assignments_count: request.context.current_assignments?.length || 0,
      weighting_profile: request.context.weighting_settings?.profile_name,
      // Add more context fields as needed
    };

    const contextString = JSON.stringify(contextData);
    return crypto.createHash('md5').update(contextString).digest('hex');
  }

  /**
   * Check if entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expires_at;
  }

  /**
   * Determine if response should be cached
   */
  private shouldCache(
    request: CacheRequest, 
    response: AIResponse, 
    options: CacheOptions
  ): boolean {
    // Don't cache if explicitly disabled
    if (options.no_cache) {
      return false;
    }

    // Don't cache error responses
    if (response.content.toLowerCase().includes('error') || 
        response.content.toLowerCase().includes('sorry')) {
      return false;
    }

    // Don't cache very short responses (likely errors or incomplete)
    if (response.content.length < 50) {
      return false;
    }

    // Cache based on request type
    const cacheableTypes = [
      'csv_interpretation',
      'rationale_generation', 
      'assignment_optimization'
    ];

    return !request.type || cacheableTypes.includes(request.type);
  }

  /**
   * Evict least recently used entry
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.last_accessed < oldestTime) {
        oldestTime = entry.last_accessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Invalidate by tags
   */
  private invalidateByTags(tags: string[]): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.cache_tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidate by context change
   */
  private invalidateByContextChange(contextType: string): number {
    let count = 0;
    // Invalidate all entries that depend on this context
    for (const [key, entry] of this.cache.entries()) {
      if (entry.request.context && this.isContextDependent(entry.request, contextType)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidate by key pattern
   */
  private invalidateByKeyPattern(pattern: RegExp): number {
    let count = 0;
    for (const [key] of this.cache.entries()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Check if request is context dependent
   */
  private isContextDependent(request: CacheRequest, contextType: string): boolean {
    const contextDependentTypes: Record<string, string[]> = {
      'teachers': ['assignment_optimization', 'chat_conversation'],
      'courses': ['assignment_optimization', 'chat_conversation'],
      'assignments': ['assignment_optimization', 'chat_conversation'],
      'weighting': ['assignment_optimization']
    };

    const dependentTypes = contextDependentTypes[contextType] || [];
    return dependentTypes.includes(request.type || '');
  }

  /**
   * Estimate size of cache entry
   */
  private estimateEntrySize(entry: CacheEntry): number {
    const jsonSize = JSON.stringify({
      request: entry.request,
      response: entry.response
    }).length;
    
    return jsonSize * 2; // Rough estimate including overhead
  }

  /**
   * Calculate hit rate (would track actual hits/misses in real implementation)
   */
  private calculateHitRate(): number {
    // Mock implementation - would track actual hits/misses
    return 0.75; // 75% hit rate
  }

  /**
   * Get age of oldest entry
   */
  private getOldestEntryAge(): number {
    if (this.cache.size === 0) return 0;
    
    const now = Date.now();
    let oldestAge = 0;

    for (const entry of this.cache.values()) {
      const age = now - entry.created_at;
      if (age > oldestAge) {
        oldestAge = age;
      }
    }

    return oldestAge;
  }

  /**
   * Calculate cache efficiency score
   */
  private calculateCacheEfficiency(): number {
    if (this.cache.size === 0) return 0;

    const stats = {
      hit_rate: this.calculateHitRate(),
      fill_ratio: this.cache.size / this.MAX_CACHE_SIZE,
      expired_ratio: this.clearExpired() / Math.max(this.cache.size, 1)
    };

    // Combined efficiency score (0-1)
    return (stats.hit_rate * 0.6) + 
           (stats.fill_ratio * 0.3) + 
           ((1 - stats.expired_ratio) * 0.1);
  }

  /**
   * Estimate space saved by optimization
   */
  private estimateSpaceSaved(entriesRemoved: number): number {
    return entriesRemoved * 2048; // Average entry size estimate
  }

  /**
   * Start cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.clearExpired();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Types for caching system
export interface CacheRequest {
  type?: string;
  message: string;
  system_prompt?: string;
  model?: string;
  temperature?: number;
  context?: any;
}

export interface CacheEntry {
  key: string;
  request: CacheRequest;
  response: AIResponse;
  created_at: number;
  last_accessed: number;
  expires_at: number;
  access_count: number;
  context_hash: string;
  cache_tags: string[];
}

export interface CacheOptions {
  ttl?: number;
  no_cache?: boolean;
  tags?: string[];
}

export interface InvalidationOptions {
  tags?: string[];
  context_changed?: string;
  key_pattern?: RegExp;
  clear_all?: boolean;
}

export interface CacheStats {
  total_entries: number;
  estimated_size_bytes: number;
  expired_entries: number;
  hit_rate: number;
  average_access_count: number;
  type_breakdown: Record<string, number>;
  oldest_entry_age: number;
  cache_efficiency: number;
}

export interface CacheOptimizationResult {
  original_size: number;
  final_size: number;
  expired_removed: number;
  low_value_removed: number;
  space_saved_bytes: number;
}

export interface CacheExport {
  entries: CacheExportEntry[];
  total_count: number;
  export_timestamp: string;
  cache_stats: CacheStats;
}

export interface CacheExportEntry {
  key: string;
  request_type?: string;
  request_hash: string;
  created_at: string;
  last_accessed: string;
  expires_at: string;
  access_count: number;
  is_expired: boolean;
}

export interface CacheConfiguration {
  max_cache_size?: number;
  default_ttl?: number;
  auto_cleanup_interval?: number;
  cache_policy?: 'aggressive' | 'conservative' | 'disabled';
}

// Export singleton instance
export const aiCacheService = new AICacheService();