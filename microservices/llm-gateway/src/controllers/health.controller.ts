import { Request, Response } from 'express';
import { llmProviderManager } from '../services/llm-providers';
import { cacheService } from '../services/cache';
import { costTrackingService } from '../services/cost-tracking';
import { logger } from '../utils/logger';

export class HealthController {
  async health(req: Request, res: Response): Promise<void> {
    try {
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      
      res.json({
        success: true,
        data: {
          status: 'healthy',
          service: 'LLM Gateway',
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          uptime: {
            seconds: Math.floor(uptime),
            formatted: this.formatUptime(uptime)
          },
          memory: {
            rss: this.formatBytes(memoryUsage.rss),
            heapUsed: this.formatBytes(memoryUsage.heapUsed),
            heapTotal: this.formatBytes(memoryUsage.heapTotal),
            external: this.formatBytes(memoryUsage.external)
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      logger.error('Health check error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Health check failed',
          code: 'HEALTH_CHECK_ERROR'
        }
      });
    }
  }

  async detailedHealth(req: Request, res: Response): Promise<void> {
    try {
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Verificar servicios críticos
      const services = await this.checkServices();
      
      res.json({
        success: true,
        data: {
          status: services.overall ? 'healthy' : 'degraded',
          service: 'LLM Gateway',
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          uptime: {
            seconds: Math.floor(uptime),
            formatted: this.formatUptime(uptime)
          },
          memory: {
            rss: this.formatBytes(memoryUsage.rss),
            heapUsed: this.formatBytes(memoryUsage.heapUsed),
            heapTotal: this.formatBytes(memoryUsage.heapTotal),
            external: this.formatBytes(memoryUsage.external),
            percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          },
          services,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      logger.error('Detailed health check error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Detailed health check failed',
          code: 'HEALTH_CHECK_ERROR'
        }
      });
    }
  }

  async dependenciesHealth(req: Request, res: Response): Promise<void> {
    try {
      const dependencies = await this.checkDependencies();
      
      res.json({
        success: true,
        data: {
          dependencies,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      logger.error('Dependencies health check error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Dependencies health check failed',
          code: 'HEALTH_CHECK_ERROR'
        }
      });
    }
  }

  async providersHealth(req: Request, res: Response): Promise<void> {
    try {
      const providers = llmProviderManager.getAvailableProviders();
      const healthChecks = await Promise.all(
        providers.map(async (provider) => {
          try {
            const isHealthy = await llmProviderManager.testProvider(provider);
            return {
              provider,
              status: isHealthy ? 'healthy' : 'unhealthy',
              timestamp: new Date().toISOString()
            };
          } catch (error) {
            return {
              provider,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString()
            };
          }
        })
      );

      const overallStatus = healthChecks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded';
      
      res.json({
        success: true,
        data: {
          status: overallStatus,
          providers: healthChecks,
          count: {
            total: providers.length,
            healthy: healthChecks.filter(check => check.status === 'healthy').length,
            unhealthy: healthChecks.filter(check => check.status === 'unhealthy').length,
            error: healthChecks.filter(check => check.status === 'error').length
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      logger.error('Providers health check error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Providers health check failed',
          code: 'HEALTH_CHECK_ERROR'
        }
      });
    }
  }

  async cacheHealth(req: Request, res: Response): Promise<void> {
    try {
      const stats = cacheService.getStats();
      
      res.json({
        success: true,
        data: {
          status: stats.redisConnected || stats.strategy === 'memory' ? 'healthy' : 'degraded',
          strategy: stats.strategy,
          memory: {
            keys: stats.memoryKeys,
            hits: stats.memoryHits,
            misses: stats.memoryMisses,
            hitRatio: stats.memoryHits / (stats.memoryHits + stats.memoryMisses) || 0
          },
          redis: {
            connected: stats.redisConnected
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      logger.error('Cache health check error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Cache health check failed',
          code: 'HEALTH_CHECK_ERROR'
        }
      });
    }
  }

  async costTrackingHealth(req: Request, res: Response): Promise<void> {
    try {
      // Verificar si el servicio de cost tracking está habilitado
      const isEnabled = process.env.COST_TRACKING_ENABLED === 'true';
      
      if (!isEnabled) {
        res.json({
          success: true,
          data: {
            status: 'disabled',
            message: 'Cost tracking is disabled',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Intentar obtener un resumen de costos para verificar conectividad
      try {
        const summary = await costTrackingService.getCostSummary('daily');
        
        res.json({
          success: true,
          data: {
            status: 'healthy',
            enabled: true,
            summary: {
              total: summary.total,
              currency: summary.period
            },
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        res.json({
          success: true,
          data: {
            status: 'degraded',
            enabled: true,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (error: any) {
      logger.error('Cost tracking health check error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Cost tracking health check failed',
          code: 'HEALTH_CHECK_ERROR'
        }
      });
    }
  }

  private async checkServices(): Promise<{
    overall: boolean;
    providers: boolean;
    cache: boolean;
    costTracking: boolean;
  }> {
    const providers = llmProviderManager.getAvailableProviders().length > 0;
    const cache = cacheService.getStats().redisConnected || cacheService.getStats().strategy === 'memory';
    const costTracking = process.env.COST_TRACKING_ENABLED === 'true' ? true : false;

    return {
      overall: providers && cache,
      providers,
      cache,
      costTracking
    };
  }

  private async checkDependencies(): Promise<{
    redis: boolean;
    database?: boolean;
    externalApis: boolean;
  }> {
    const redis = cacheService.getStats().redisConnected;
    const externalApis = llmProviderManager.getAvailableProviders().length > 0;

    return {
      redis,
      externalApis
    };
  }

  private formatUptime(uptime: number): string {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}