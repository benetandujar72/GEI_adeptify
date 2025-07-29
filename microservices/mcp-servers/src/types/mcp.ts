import { z } from 'zod';

// Enums
export enum MCPServerType {
  FILE_SYSTEM = 'file-system',
  GIT = 'git',
  SEARCH = 'search',
  DATABASE = 'database',
  WEB_BROWSER = 'web-browser',
  IMAGE_GENERATION = 'image-generation',
  TEXT_TO_SPEECH = 'text-to-speech',
  SPEECH_TO_TEXT = 'speech-to-text',
  CALENDAR = 'calendar',
  EMAIL = 'email',
  WEATHER = 'weather',
  NEWS = 'news',
  TRANSLATION = 'translation',
  CODE_ANALYSIS = 'code-analysis',
  DOCUMENT_PROCESSING = 'document-processing'
}

export enum ServerStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

export enum ProtocolVersion {
  V1 = '1.0',
  V2 = '2.0'
}

export enum ResourceType {
  FILE = 'file',
  DIRECTORY = 'directory',
  REPOSITORY = 'repository',
  DATABASE = 'database',
  WEB_PAGE = 'web-page',
  IMAGE = 'image',
  AUDIO = 'audio',
  CALENDAR_EVENT = 'calendar-event',
  EMAIL = 'email',
  WEATHER_DATA = 'weather-data',
  NEWS_ARTICLE = 'news-article',
  TRANSLATION = 'translation',
  CODE_SNIPPET = 'code-snippet',
  DOCUMENT = 'document'
}

export enum OperationType {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  LIST = 'list',
  SEARCH = 'search',
  CREATE = 'create',
  UPDATE = 'update',
  EXECUTE = 'execute',
  GENERATE = 'generate',
  ANALYZE = 'analyze',
  TRANSLATE = 'translate',
  PROCESS = 'process'
}

// Zod Schemas
export const MCPServerConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.nativeEnum(MCPServerType),
  version: z.nativeEnum(ProtocolVersion),
  description: z.string().optional(),
  capabilities: z.array(z.string()),
  endpoints: z.array(z.string().url()),
  authentication: z.object({
    required: z.boolean(),
    methods: z.array(z.string())
  }).optional(),
  rateLimits: z.object({
    requestsPerMinute: z.number().positive(),
    burstLimit: z.number().positive()
  }).optional(),
  metadata: z.record(z.any()).optional()
});

export const ResourceSchema = z.object({
  uri: z.string().uri(),
  name: z.string(),
  type: z.nativeEnum(ResourceType),
  size: z.number().optional(),
  modified: z.date().optional(),
  created: z.date().optional(),
  metadata: z.record(z.any()).optional(),
  content: z.any().optional()
});

export const OperationRequestSchema = z.object({
  operation: z.nativeEnum(OperationType),
  resource: z.string().uri(),
  parameters: z.record(z.any()).optional(),
  context: z.record(z.any()).optional(),
  timeout: z.number().positive().optional()
});

export const OperationResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  timestamp: z.date()
});

export const ServerRegistrationSchema = z.object({
  serverId: z.string().uuid(),
  config: MCPServerConfigSchema,
  status: z.nativeEnum(ServerStatus),
  lastHeartbeat: z.date(),
  load: z.number().min(0).max(1).optional(),
  connections: z.number().nonnegative().optional()
});

export const HeartbeatSchema = z.object({
  serverId: z.string().uuid(),
  timestamp: z.date(),
  status: z.nativeEnum(ServerStatus),
  metrics: z.object({
    cpu: z.number().min(0).max(100),
    memory: z.number().min(0).max(100),
    activeConnections: z.number().nonnegative(),
    requestsPerSecond: z.number().nonnegative()
  }).optional()
});

export const SearchRequestSchema = z.object({
  query: z.string().min(1),
  filters: z.record(z.any()).optional(),
  limit: z.number().positive().optional(),
  offset: z.number().nonnegative().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export const FileOperationSchema = z.object({
  path: z.string(),
  operation: z.enum(['read', 'write', 'delete', 'list', 'create']),
  content: z.any().optional(),
  options: z.record(z.any()).optional()
});

export const GitOperationSchema = z.object({
  repository: z.string(),
  operation: z.enum(['clone', 'pull', 'push', 'commit', 'branch', 'log']),
  parameters: z.record(z.any()).optional()
});

export const DatabaseOperationSchema = z.object({
  database: z.string(),
  operation: z.enum(['query', 'insert', 'update', 'delete', 'schema']),
  query: z.string().optional(),
  data: z.any().optional(),
  options: z.record(z.any()).optional()
});

export const WebBrowserOperationSchema = z.object({
  url: z.string().url(),
  operation: z.enum(['navigate', 'screenshot', 'extract', 'click', 'type']),
  parameters: z.record(z.any()).optional()
});

export const ImageGenerationSchema = z.object({
  prompt: z.string().min(1),
  style: z.string().optional(),
  size: z.enum(['256x256', '512x512', '1024x1024']).optional(),
  quality: z.enum(['standard', 'hd']).optional(),
  parameters: z.record(z.any()).optional()
});

export const TextToSpeechSchema = z.object({
  text: z.string().min(1),
  voice: z.string().optional(),
  language: z.string().optional(),
  speed: z.number().min(0.1).max(10).optional(),
  format: z.enum(['mp3', 'wav', 'ogg']).optional()
});

export const SpeechToTextSchema = z.object({
  audio: z.any(), // File or buffer
  language: z.string().optional(),
  model: z.string().optional(),
  format: z.enum(['mp3', 'wav', 'ogg', 'm4a']).optional()
});

export const TranslationSchema = z.object({
  text: z.string().min(1),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  context: z.string().optional()
});

export const CodeAnalysisSchema = z.object({
  code: z.string().min(1),
  language: z.string(),
  analysis: z.enum(['syntax', 'semantic', 'security', 'performance', 'style']),
  options: z.record(z.any()).optional()
});

export const DocumentProcessingSchema = z.object({
  document: z.any(), // File or buffer
  operation: z.enum(['extract', 'summarize', 'classify', 'translate', 'ocr']),
  options: z.record(z.any()).optional()
});

// TypeScript Interfaces
export interface MCPServerConfig extends z.infer<typeof MCPServerConfigSchema> {}

export interface Resource extends z.infer<typeof ResourceSchema> {}

export interface OperationRequest extends z.infer<typeof OperationRequestSchema> {}

export interface OperationResponse extends z.infer<typeof OperationResponseSchema> {}

export interface ServerRegistration extends z.infer<typeof ServerRegistrationSchema> {}

export interface Heartbeat extends z.infer<typeof HeartbeatSchema> {}

export interface SearchRequest extends z.infer<typeof SearchRequestSchema> {}

export interface FileOperation extends z.infer<typeof FileOperationSchema> {}

export interface GitOperation extends z.infer<typeof GitOperationSchema> {}

export interface DatabaseOperation extends z.infer<typeof DatabaseOperationSchema> {}

export interface WebBrowserOperation extends z.infer<typeof WebBrowserOperationSchema> {}

export interface ImageGeneration extends z.infer<typeof ImageGenerationSchema> {}

export interface TextToSpeech extends z.infer<typeof TextToSpeechSchema> {}

export interface SpeechToText extends z.infer<typeof SpeechToTextSchema> {}

export interface Translation extends z.infer<typeof TranslationSchema> {}

export interface CodeAnalysis extends z.infer<typeof CodeAnalysisSchema> {}

export interface DocumentProcessing extends z.infer<typeof DocumentProcessingSchema> {}

export interface MCPServer {
  id: string;
  config: MCPServerConfig;
  status: ServerStatus;
  start(): Promise<void>;
  stop(): Promise<void>;
  handleRequest(request: OperationRequest): Promise<OperationResponse>;
  getCapabilities(): string[];
  getStatus(): ServerStatus;
  updateConfig(config: Partial<MCPServerConfig>): void;
}

export interface ServerManager {
  registerServer(server: MCPServer): Promise<void>;
  unregisterServer(serverId: string): Promise<void>;
  getServer(serverId: string): MCPServer | undefined;
  getAllServers(): MCPServer[];
  getServersByType(type: MCPServerType): MCPServer[];
  updateServerStatus(serverId: string, status: ServerStatus): void;
  handleHeartbeat(heartbeat: Heartbeat): void;
}

export interface MCPServerMetrics {
  serverId: string;
  timestamp: Date;
  requestsTotal: number;
  requestsSuccess: number;
  requestsError: number;
  averageResponseTime: number;
  activeConnections: number;
  cpuUsage: number;
  memoryUsage: number;
  errors: string[];
}

export interface MCPServerError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  serverId: string;
}

export interface MCPServerEvent {
  type: 'server_started' | 'server_stopped' | 'server_error' | 'request_handled' | 'heartbeat';
  serverId: string;
  timestamp: Date;
  data?: any;
}

// Utility Types
export type ServerCapability = {
  name: string;
  description: string;
  parameters: Record<string, any>;
  returns: any;
};

export type ServerEndpoint = {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  parameters: Record<string, any>;
  responses: Record<string, any>;
};

export type ServerHealth = {
  status: ServerStatus;
  uptime: number;
  lastHeartbeat: Date;
  metrics: MCPServerMetrics;
  errors: MCPServerError[];
};