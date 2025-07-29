import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { 
  MCPServer, 
  MCPServerConfig, 
  ServerStatus, 
  MCPServerType, 
  ProtocolVersion,
  ResourceType,
  OperationType,
  OperationRequest,
  OperationResponse,
  Resource,
  FileOperation
} from '@/types/mcp';
import { 
  logFileOperation, 
  logServerStart, 
  logServerStop, 
  logServerError,
  logMCPOperation 
} from '@/utils/logger';

export class FileSystemServer implements MCPServer {
  public id: string;
  public config: MCPServerConfig;
  public status: ServerStatus;
  private basePath: string;
  private allowedExtensions: string[];
  private maxFileSize: number;

  constructor(config?: Partial<MCPServerConfig>) {
    this.id = config?.id || uuidv4();
    this.config = {
      id: this.id,
      name: config?.name || 'File System MCP Server',
      type: MCPServerType.FILE_SYSTEM,
      version: ProtocolVersion.V2,
      description: 'MCP Server for file system operations',
      capabilities: [
        'read',
        'write',
        'delete',
        'list',
        'create',
        'search',
        'copy',
        'move',
        'compress',
        'extract'
      ],
      endpoints: [
        'file://localhost:3010/api/files',
        'file://localhost:3010/api/directories',
        'file://localhost:3010/api/search'
      ],
      authentication: {
        required: true,
        methods: ['jwt', 'api-key']
      },
      rateLimits: {
        requestsPerMinute: 1000,
        burstLimit: 100
      },
      metadata: {
        supportedFormats: ['txt', 'json', 'xml', 'csv', 'md', 'html', 'css', 'js', 'ts', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'php', 'rb', 'pl', 'sh', 'bat', 'ps1'],
        maxFileSize: '100MB',
        compressionSupported: true,
        encryptionSupported: false
      }
    };
    this.status = ServerStatus.OFFLINE;
    this.basePath = process.env.FILE_SERVER_BASE_PATH || './data/files';
    this.allowedExtensions = [
      'txt', 'json', 'xml', 'csv', 'md', 'html', 'css', 'js', 'ts', 
      'py', 'java', 'cpp', 'c', 'go', 'rs', 'php', 'rb', 'pl', 
      'sh', 'bat', 'ps1', 'yml', 'yaml', 'toml', 'ini', 'conf'
    ];
    this.maxFileSize = 100 * 1024 * 1024; // 100MB
  }

  async start(): Promise<void> {
    try {
      // Ensure base directory exists
      await fs.mkdir(this.basePath, { recursive: true });
      
      this.status = ServerStatus.ONLINE;
      logServerStart(this.id, this.config.type);
      logMCPOperation(this.id, 'start', { basePath: this.basePath });
    } catch (error) {
      this.status = ServerStatus.ERROR;
      logServerError(this.id, `Failed to start file system server: ${error}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.status = ServerStatus.OFFLINE;
      logServerStop(this.id, this.config.type);
      logMCPOperation(this.id, 'stop', {});
    } catch (error) {
      logServerError(this.id, `Failed to stop file system server: ${error}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async handleRequest(request: OperationRequest): Promise<OperationResponse> {
    const startTime = Date.now();
    
    try {
      logMCPOperation(this.id, request.operation, { resource: request.resource });

      let response: OperationResponse;

      switch (request.operation) {
        case OperationType.READ:
          response = await this.handleRead(request);
          break;
        case OperationType.WRITE:
          response = await this.handleWrite(request);
          break;
        case OperationType.DELETE:
          response = await this.handleDelete(request);
          break;
        case OperationType.LIST:
          response = await this.handleList(request);
          break;
        case OperationType.CREATE:
          response = await this.handleCreate(request);
          break;
        case OperationType.SEARCH:
          response = await this.handleSearch(request);
          break;
        default:
          response = {
            success: false,
            error: `Unsupported operation: ${request.operation}`,
            timestamp: new Date()
          };
      }

      const duration = Date.now() - startTime;
      logFileOperation(this.id, request.operation, request.resource, response.success);
      
      return {
        ...response,
        metadata: {
          ...response.metadata,
          duration,
          serverId: this.id,
          operation: request.operation
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logServerError(this.id, `Request failed: ${error}`, error instanceof Error ? error.stack : undefined);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        metadata: {
          duration,
          serverId: this.id,
          operation: request.operation
        }
      };
    }
  }

  getCapabilities(): string[] {
    return this.config.capabilities;
  }

  getStatus(): ServerStatus {
    return this.status;
  }

  updateConfig(config: Partial<MCPServerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private async handleRead(request: OperationRequest): Promise<OperationResponse> {
    const filePath = this.resolvePath(request.resource);
    
    try {
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        return {
          success: false,
          error: 'Resource is not a file',
          timestamp: new Date()
        };
      }

      if (stats.size > this.maxFileSize) {
        return {
          success: false,
          error: 'File size exceeds maximum allowed size',
          timestamp: new Date()
        };
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const resource: Resource = {
        uri: request.resource,
        name: path.basename(filePath),
        type: ResourceType.FILE,
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime,
        content,
        metadata: {
          extension: path.extname(filePath),
          mimeType: this.getMimeType(filePath)
        }
      };

      return {
        success: true,
        data: resource,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error}`,
        timestamp: new Date()
      };
    }
  }

  private async handleWrite(request: OperationRequest): Promise<OperationResponse> {
    const filePath = this.resolvePath(request.resource);
    const content = request.parameters?.content as string;
    
    if (!content) {
      return {
        success: false,
        error: 'Content is required for write operation',
        timestamp: new Date()
      };
    }

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // Validate file extension
      const extension = path.extname(filePath).toLowerCase().slice(1);
      if (!this.allowedExtensions.includes(extension)) {
        return {
          success: false,
          error: `File extension .${extension} is not allowed`,
          timestamp: new Date()
        };
      }

      await fs.writeFile(filePath, content, 'utf-8');
      
      const stats = await fs.stat(filePath);
      const resource: Resource = {
        uri: request.resource,
        name: path.basename(filePath),
        type: ResourceType.FILE,
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime,
        metadata: {
          extension,
          mimeType: this.getMimeType(filePath)
        }
      };

      return {
        success: true,
        data: resource,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write file: ${error}`,
        timestamp: new Date()
      };
    }
  }

  private async handleDelete(request: OperationRequest): Promise<OperationResponse> {
    const filePath = this.resolvePath(request.resource);
    
    try {
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        return {
          success: false,
          error: 'Resource is not a file',
          timestamp: new Date()
        };
      }

      await fs.unlink(filePath);

      return {
        success: true,
        data: { deleted: true, path: filePath },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete file: ${error}`,
        timestamp: new Date()
      };
    }
  }

  private async handleList(request: OperationRequest): Promise<OperationResponse> {
    const dirPath = this.resolvePath(request.resource);
    
    try {
      const stats = await fs.stat(dirPath);
      
      if (!stats.isDirectory()) {
        return {
          success: false,
          error: 'Resource is not a directory',
          timestamp: new Date()
        };
      }

      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const resources: Resource[] = [];

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        const entryStats = await fs.stat(entryPath);
        
        const resource: Resource = {
          uri: `file://${entryPath}`,
          name: entry.name,
          type: entry.isDirectory() ? ResourceType.DIRECTORY : ResourceType.FILE,
          size: entryStats.size,
          modified: entryStats.mtime,
          created: entryStats.birthtime,
          metadata: {
            isDirectory: entry.isDirectory(),
            extension: entry.isFile() ? path.extname(entry.name) : undefined,
            mimeType: entry.isFile() ? this.getMimeType(entryPath) : undefined
          }
        };
        
        resources.push(resource);
      }

      return {
        success: true,
        data: resources,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list directory: ${error}`,
        timestamp: new Date()
      };
    }
  }

  private async handleCreate(request: OperationRequest): Promise<OperationResponse> {
    const resourcePath = this.resolvePath(request.resource);
    const isDirectory = request.parameters?.isDirectory as boolean || false;
    
    try {
      if (isDirectory) {
        await fs.mkdir(resourcePath, { recursive: true });
        
        const stats = await fs.stat(resourcePath);
        const resource: Resource = {
          uri: request.resource,
          name: path.basename(resourcePath),
          type: ResourceType.DIRECTORY,
          modified: stats.mtime,
          created: stats.birthtime,
          metadata: {
            isDirectory: true
          }
        };

        return {
          success: true,
          data: resource,
          timestamp: new Date()
        };
      } else {
        // Create empty file
        await fs.writeFile(resourcePath, '');
        
        const stats = await fs.stat(resourcePath);
        const resource: Resource = {
          uri: request.resource,
          name: path.basename(resourcePath),
          type: ResourceType.FILE,
          size: 0,
          modified: stats.mtime,
          created: stats.birthtime,
          metadata: {
            extension: path.extname(resourcePath),
            mimeType: this.getMimeType(resourcePath)
          }
        };

        return {
          success: true,
          data: resource,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to create resource: ${error}`,
        timestamp: new Date()
      };
    }
  }

  private async handleSearch(request: OperationRequest): Promise<OperationResponse> {
    const searchPath = this.resolvePath(request.resource);
    const query = request.parameters?.query as string;
    const pattern = request.parameters?.pattern as string;
    
    if (!query && !pattern) {
      return {
        success: false,
        error: 'Search query or pattern is required',
        timestamp: new Date()
      };
    }

    try {
      const results: Resource[] = [];
      await this.searchRecursive(searchPath, query, pattern, results);

      return {
        success: true,
        data: results,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search: ${error}`,
        timestamp: new Date()
      };
    }
  }

  private async searchRecursive(dirPath: string, query?: string, pattern?: string, results: Resource[] = []): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.searchRecursive(entryPath, query, pattern, results);
        } else if (entry.isFile()) {
          let match = false;
          
          if (query && entry.name.toLowerCase().includes(query.toLowerCase())) {
            match = true;
          }
          
          if (pattern && new RegExp(pattern).test(entry.name)) {
            match = true;
          }
          
          if (match) {
            const stats = await fs.stat(entryPath);
            const resource: Resource = {
              uri: `file://${entryPath}`,
              name: entry.name,
              type: ResourceType.FILE,
              size: stats.size,
              modified: stats.mtime,
              created: stats.birthtime,
              metadata: {
                extension: path.extname(entry.name),
                mimeType: this.getMimeType(entryPath)
              }
            };
            results.push(resource);
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be accessed
      return;
    }
  }

  private resolvePath(uri: string): string {
    // Remove file:// protocol and resolve relative to base path
    const cleanPath = uri.replace(/^file:\/\//, '');
    return path.resolve(this.basePath, cleanPath);
  }

  private getMimeType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.csv': 'text/csv',
      '.md': 'text/markdown',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.py': 'text/x-python',
      '.java': 'text/x-java-source',
      '.cpp': 'text/x-c++src',
      '.c': 'text/x-csrc',
      '.go': 'text/x-go',
      '.rs': 'text/x-rust',
      '.php': 'application/x-httpd-php',
      '.rb': 'text/x-ruby',
      '.pl': 'text/x-perl',
      '.sh': 'application/x-sh',
      '.bat': 'application/x-msdos-program',
      '.ps1': 'application/x-powershell',
      '.yml': 'application/x-yaml',
      '.yaml': 'application/x-yaml',
      '.toml': 'application/toml',
      '.ini': 'text/plain',
      '.conf': 'text/plain'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }
}