interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  totalSize: number;
  entryCount: number;
  evictions: number;
  averageAccessCount: number;
}

export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0,
    totalSize: 0,
    entryCount: 0,
    evictions: 0,
    averageAccessCount: 0
  };
  
  private readonly maxSize: number;
  private readonly maxEntries: number;
  private readonly defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize: number = 100 * 1024 * 1024, maxEntries: number = 1000, defaultTTL: number = 300000) {
    this.maxSize = maxSize; // 100MB por defecto
    this.maxEntries = maxEntries; // 1000 entradas por defecto
    this.defaultTTL = defaultTTL; // 5 minutos por defecto
    
    this.startCleanup();
  }

  public set(key: string, value: any, ttl: number = this.defaultTTL): boolean {
    try {
      // Serializar el valor para calcular su tamaño
      const serializedValue = JSON.stringify(value);
      const size = Buffer.byteLength(serializedValue, 'utf8');
      
      // Verificar si hay espacio suficiente
      if (size > this.maxSize) {
        console.warn(`Cache entry too large: ${size} bytes for key ${key}`);
        return false;
      }

      // Limpiar espacio si es necesario
      this.evictIfNeeded(size);

      const entry: CacheEntry = {
        key,
        value,
        timestamp: Date.now(),
        ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
        size
      };

      // Si la clave ya existe, restar su tamaño anterior
      const existingEntry = this.cache.get(key);
      if (existingEntry) {
        this.stats.totalSize -= existingEntry.size;
      } else {
        this.stats.entryCount++;
      }

      this.cache.set(key, entry);
      this.stats.totalSize += size;

      return true;
    } catch (error) {
      console.error('Error setting cache entry:', error);
      return false;
    }
  }

  public get(key: string): any | null {
    this.stats.totalRequests++;
    
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Verificar si la entrada ha expirado
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Actualizar estadísticas de acceso
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateHitRate();

    return entry.value;
  }

  public has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  public delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.stats.totalSize -= entry.size;
    this.stats.entryCount--;
    this.cache.delete(key);
    
    return true;
  }

  public clear(): void {
    this.cache.clear();
    this.stats.totalSize = 0;
    this.stats.entryCount = 0;
    this.stats.evictions = 0;
  }

  public clearAll(): void {
    this.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.totalRequests = 0;
    this.stats.hitRate = 0;
    this.stats.averageAccessCount = 0;
  }

  public getStatus(): Record<string, any> {
    return {
      enabled: true,
      maxSize: this.formatBytes(this.maxSize),
      maxEntries: this.maxEntries,
      defaultTTL: `${this.defaultTTL / 1000}s`,
      currentSize: this.formatBytes(this.stats.totalSize),
      entryCount: this.stats.entryCount,
      utilization: `${((this.stats.totalSize / this.maxSize) * 100).toFixed(1)}%`
    };
  }

  public getStats(): CacheStats {
    return { ...this.stats };
  }

  public getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  public getEntries(): CacheEntry[] {
    return Array.from(this.cache.values()).map(entry => ({ ...entry }));
  }

  public getEntryInfo(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (this.isExpired(entry)) {
      this.delete(key);
      return null;
    }
    
    return { ...entry };
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictIfNeeded(newEntrySize: number): void {
    // Si hay espacio suficiente, no hacer nada
    if (this.stats.totalSize + newEntrySize <= this.maxSize && this.stats.entryCount < this.maxEntries) {
      return;
    }

    // Ordenar entradas por último acceso (LRU)
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    let freedSize = 0;
    let freedEntries = 0;

    for (const [key, entry] of entries) {
      // Eliminar entradas expiradas primero
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        freedSize += entry.size;
        freedEntries++;
        this.stats.evictions++;
      } else if (this.stats.totalSize + newEntrySize - freedSize > this.maxSize || 
                 this.stats.entryCount - freedEntries >= this.maxEntries) {
        // Eliminar entradas LRU si aún necesitamos espacio
        this.cache.delete(key);
        freedSize += entry.size;
        freedEntries++;
        this.stats.evictions++;
      } else {
        break;
      }
    }

    this.stats.totalSize -= freedSize;
    this.stats.entryCount -= freedEntries;
  }

  private updateHitRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate = (this.stats.hits / this.stats.totalRequests) * 100;
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Limpiar cada minuto
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedEntries = 0;
    let cleanedSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleanedEntries++;
        cleanedSize += entry.size;
      }
    }

    if (cleanedEntries > 0) {
      this.stats.totalSize -= cleanedSize;
      this.stats.entryCount -= cleanedEntries;
      console.log(`Cache cleanup: removed ${cleanedEntries} expired entries (${this.formatBytes(cleanedSize)})`);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public getDetailedStats(): Record<string, any> {
    const entries = Array.from(this.cache.values());
    const totalAccessCount = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    
    return {
      ...this.stats,
      hitRate: `${this.stats.hitRate.toFixed(2)}%`,
      averageAccessCount: entries.length > 0 ? (totalAccessCount / entries.length).toFixed(2) : '0',
      sizeUtilization: `${((this.stats.totalSize / this.maxSize) * 100).toFixed(1)}%`,
      entryUtilization: `${((this.stats.entryCount / this.maxEntries) * 100).toFixed(1)}%`,
      oldestEntry: entries.length > 0 ? new Date(Math.min(...entries.map(e => e.timestamp))).toISOString() : null,
      newestEntry: entries.length > 0 ? new Date(Math.max(...entries.map(e => e.timestamp))).toISOString() : null,
      mostAccessedEntry: entries.length > 0 ? entries.reduce((max, current) => 
        current.accessCount > max.accessCount ? current : max).key : null
    };
  }

  public stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}