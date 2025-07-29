import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  LLMProvider, 
  ChatRequest, 
  CompletionRequest, 
  EmbeddingRequest,
  ChatResponse,
  CompletionResponse,
  EmbeddingResponse,
  LLMError,
  ProviderConfig
} from '../types/llm';
import { logger, llmLogger } from '../utils/logger';

export abstract class BaseLLMProvider {
  protected config: ProviderConfig;
  protected provider: LLMProvider;

  constructor(provider: LLMProvider, config: ProviderConfig) {
    this.provider = provider;
    this.config = config;
  }

  abstract chat(request: ChatRequest): Promise<ChatResponse>;
  abstract completion(request: CompletionRequest): Promise<CompletionResponse>;
  abstract embedding(request: EmbeddingRequest): Promise<EmbeddingResponse>;

  protected createError(message: string, code: string, statusCode: number, retryable: boolean = false): LLMError {
    const error = new Error(message) as LLMError;
    error.provider = this.provider;
    error.code = code;
    error.statusCode = statusCode;
    error.retryable = retryable;
    return error;
  }

  protected logRequest(type: string, model: string, tokens: number, userId?: string) {
    llmLogger.info('LLM Request', {
      provider: this.provider,
      type,
      model,
      tokens,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  protected logResponse(type: string, model: string, tokens: number, responseTime: number, cost: number, userId?: string) {
    llmLogger.info('LLM Response', {
      provider: this.provider,
      type,
      model,
      tokens,
      responseTime,
      cost,
      userId,
      timestamp: new Date().toISOString()
    });
  }
}

export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    super(LLMProvider.OPENAI, config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 3,
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      this.logRequest('chat', request.model, this.estimateTokens(request.messages), request.user);

      const response = await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        response_format: request.response_format === 'json' ? { type: 'json_object' } : undefined,
        stream: request.stream,
        functions: request.functions,
        function_call: request.function_call,
        user: request.user,
      });

      const responseTime = Date.now() - startTime;
      const cost = this.calculateCost(response.usage!, request.model);

      this.logResponse('chat', request.model, response.usage!.total_tokens, responseTime, cost, request.user);

      return {
        id: response.id,
        object: 'chat.completion',
        created: response.created,
        model: response.model,
        provider: this.provider,
        choices: response.choices.map(choice => ({
          index: choice.index,
          message: choice.message,
          finish_reason: choice.finish_reason || 'stop'
        })),
        usage: {
          prompt_tokens: response.usage!.prompt_tokens,
          completion_tokens: response.usage!.completion_tokens,
          total_tokens: response.usage!.total_tokens
        },
        cost: {
          amount: cost,
          currency: 'USD',
          provider: this.provider
        },
        cached: false,
        response_time: responseTime
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('OpenAI Chat Error', { error: error.message, responseTime, model: request.model });
      
      throw this.createError(
        error.message,
        error.code || 'OPENAI_ERROR',
        error.status || 500,
        this.isRetryableError(error)
      );
    }
  }

  async completion(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    
    try {
      this.logRequest('completion', request.model, this.estimateTokens([{ role: 'user', content: request.prompt }]), request.user);

      const response = await this.client.completions.create({
        model: request.model,
        prompt: request.prompt,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        stop: request.stop,
        stream: request.stream,
        user: request.user,
      });

      const responseTime = Date.now() - startTime;
      const cost = this.calculateCost(response.usage!, request.model);

      this.logResponse('completion', request.model, response.usage!.total_tokens, responseTime, cost, request.user);

      return {
        id: response.id,
        object: 'text_completion',
        created: response.created,
        model: response.model,
        provider: this.provider,
        choices: response.choices.map(choice => ({
          text: choice.text,
          index: choice.index,
          logprobs: choice.logprobs,
          finish_reason: choice.finish_reason || 'stop'
        })),
        usage: {
          prompt_tokens: response.usage!.prompt_tokens,
          completion_tokens: response.usage!.completion_tokens,
          total_tokens: response.usage!.total_tokens
        },
        cost: {
          amount: cost,
          currency: 'USD',
          provider: this.provider
        },
        cached: false,
        response_time: responseTime
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('OpenAI Completion Error', { error: error.message, responseTime, model: request.model });
      
      throw this.createError(
        error.message,
        error.code || 'OPENAI_ERROR',
        error.status || 500,
        this.isRetryableError(error)
      );
    }
  }

  async embedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    
    try {
      const inputArray = Array.isArray(request.input) ? request.input : [request.input];
      this.logRequest('embedding', request.model, this.estimateTokens(inputArray.map(text => ({ role: 'user', content: text }))), request.user);

      const response = await this.client.embeddings.create({
        model: request.model,
        input: request.input,
        user: request.user,
      });

      const responseTime = Date.now() - startTime;
      const cost = this.calculateCost(response.usage!, request.model);

      this.logResponse('embedding', request.model, response.usage!.total_tokens, responseTime, cost, request.user);

      return {
        object: 'list',
        data: response.data.map((item, index) => ({
          object: 'embedding',
          embedding: item.embedding,
          index
        })),
        model: response.model,
        provider: this.provider,
        usage: {
          prompt_tokens: response.usage!.prompt_tokens,
          total_tokens: response.usage!.total_tokens
        },
        cost: {
          amount: cost,
          currency: 'USD',
          provider: this.provider
        },
        cached: false,
        response_time: responseTime
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('OpenAI Embedding Error', { error: error.message, responseTime, model: request.model });
      
      throw this.createError(
        error.message,
        error.code || 'OPENAI_ERROR',
        error.status || 500,
        this.isRetryableError(error)
      );
    }
  }

  private estimateTokens(messages: any[]): number {
    // Estimación simple de tokens (4 caracteres por token aproximadamente)
    return messages.reduce((total, msg) => total + Math.ceil(msg.content.length / 4), 0);
  }

  private calculateCost(usage: any, model: string): number {
    // Precios por 1K tokens (aproximados)
    const prices: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'text-embedding-ada-002': { input: 0.0001, output: 0 }
    };

    const price = prices[model] || { input: 0.002, output: 0.002 };
    return (usage.prompt_tokens * price.input + usage.completion_tokens * price.output) / 1000;
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = ['rate_limit_exceeded', 'server_error', 'timeout'];
    return retryableCodes.includes(error.code) || error.status >= 500;
  }
}

export class AnthropicProvider extends BaseLLMProvider {
  private client: Anthropic;

  constructor(config: ProviderConfig) {
    super(LLMProvider.ANTHROPIC, config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      this.logRequest('chat', request.model, this.estimateTokens(request.messages), request.user);

      const response = await this.client.messages.create({
        model: request.model,
        max_tokens: request.max_tokens || 4096,
        messages: request.messages,
        temperature: request.temperature,
        top_p: request.top_p,
        system: request.messages.find(m => m.role === 'system')?.content,
      });

      const responseTime = Date.now() - startTime;
      const cost = this.calculateCost(response.usage, request.model);

      this.logResponse('chat', request.model, response.usage.input_tokens + response.usage.output_tokens, responseTime, cost, request.user);

      return {
        id: response.id,
        object: 'chat.completion',
        created: Date.now(),
        model: response.model,
        provider: this.provider,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response.content[0].text
          },
          finish_reason: response.stop_reason || 'stop'
        }],
        usage: {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens
        },
        cost: {
          amount: cost,
          currency: 'USD',
          provider: this.provider
        },
        cached: false,
        response_time: responseTime
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('Anthropic Chat Error', { error: error.message, responseTime, model: request.model });
      
      throw this.createError(
        error.message,
        error.code || 'ANTHROPIC_ERROR',
        error.status || 500,
        this.isRetryableError(error)
      );
    }
  }

  async completion(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    
    try {
      this.logRequest('completion', request.model, this.estimateTokens([{ role: 'user', content: request.prompt }]), request.user);

      const response = await this.client.completions.create({
        model: request.model,
        max_tokens_to_sample: request.max_tokens || 4096,
        prompt: request.prompt,
        temperature: request.temperature,
        top_p: request.top_p,
      });

      const responseTime = Date.now() - startTime;
      const cost = this.calculateCost(response.usage, request.model);

      this.logResponse('completion', request.model, response.usage.input_tokens + response.usage.output_tokens, responseTime, cost, request.user);

      return {
        id: response.id,
        object: 'text_completion',
        created: Date.now(),
        model: request.model,
        provider: this.provider,
        choices: [{
          text: response.completion,
          index: 0,
          logprobs: null,
          finish_reason: response.stop_reason || 'stop'
        }],
        usage: {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens
        },
        cost: {
          amount: cost,
          currency: 'USD',
          provider: this.provider
        },
        cached: false,
        response_time: responseTime
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('Anthropic Completion Error', { error: error.message, responseTime, model: request.model });
      
      throw this.createError(
        error.message,
        error.code || 'ANTHROPIC_ERROR',
        error.status || 500,
        this.isRetryableError(error)
      );
    }
  }

  async embedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    throw this.createError('Embeddings not supported by Anthropic', 'NOT_SUPPORTED', 400);
  }

  private estimateTokens(messages: any[]): number {
    return messages.reduce((total, msg) => total + Math.ceil(msg.content.length / 4), 0);
  }

  private calculateCost(usage: any, model: string): number {
    const prices: Record<string, { input: number; output: number }> = {
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 }
    };

    const price = prices[model] || { input: 0.003, output: 0.015 };
    return (usage.input_tokens * price.input + usage.output_tokens * price.output) / 1000;
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = ['rate_limit_exceeded', 'server_error', 'timeout'];
    return retryableCodes.includes(error.code) || error.status >= 500;
  }
}

export class GoogleProvider extends BaseLLMProvider {
  private client: GoogleGenerativeAI;

  constructor(config: ProviderConfig) {
    super(LLMProvider.GOOGLE, config);
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      this.logRequest('chat', request.model, this.estimateTokens(request.messages), request.user);

      const model = this.client.getGenerativeModel({ model: request.model });
      const chat = model.startChat({
        generationConfig: {
          temperature: request.temperature,
          topP: request.top_p,
          maxOutputTokens: request.max_tokens,
        },
      });

      const userMessage = request.messages.find(m => m.role === 'user')?.content || '';
      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      const text = response.text();

      const responseTime = Date.now() - startTime;
      const cost = this.calculateCost(text.length, request.model);

      this.logResponse('chat', request.model, this.estimateTokens([{ role: 'user', content: userMessage }]) + this.estimateTokens([{ role: 'assistant', content: text }]), responseTime, cost, request.user);

      return {
        id: `google_${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model: request.model,
        provider: this.provider,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: text
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: this.estimateTokens([{ role: 'user', content: userMessage }]),
          completion_tokens: this.estimateTokens([{ role: 'assistant', content: text }]),
          total_tokens: this.estimateTokens([{ role: 'user', content: userMessage }]) + this.estimateTokens([{ role: 'assistant', content: text }])
        },
        cost: {
          amount: cost,
          currency: 'USD',
          provider: this.provider
        },
        cached: false,
        response_time: responseTime
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('Google Chat Error', { error: error.message, responseTime, model: request.model });
      
      throw this.createError(
        error.message,
        error.code || 'GOOGLE_ERROR',
        error.status || 500,
        this.isRetryableError(error)
      );
    }
  }

  async completion(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    
    try {
      this.logRequest('completion', request.model, this.estimateTokens([{ role: 'user', content: request.prompt }]), request.user);

      const model = this.client.getGenerativeModel({ model: request.model });
      const result = await model.generateContent(request.prompt);
      const response = await result.response;
      const text = response.text();

      const responseTime = Date.now() - startTime;
      const cost = this.calculateCost(text.length, request.model);

      this.logResponse('completion', request.model, this.estimateTokens([{ role: 'user', content: request.prompt }]) + this.estimateTokens([{ role: 'assistant', content: text }]), responseTime, cost, request.user);

      return {
        id: `google_${Date.now()}`,
        object: 'text_completion',
        created: Date.now(),
        model: request.model,
        provider: this.provider,
        choices: [{
          text,
          index: 0,
          logprobs: null,
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: this.estimateTokens([{ role: 'user', content: request.prompt }]),
          completion_tokens: this.estimateTokens([{ role: 'assistant', content: text }]),
          total_tokens: this.estimateTokens([{ role: 'user', content: request.prompt }]) + this.estimateTokens([{ role: 'assistant', content: text }])
        },
        cost: {
          amount: cost,
          currency: 'USD',
          provider: this.provider
        },
        cached: false,
        response_time: responseTime
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('Google Completion Error', { error: error.message, responseTime, model: request.model });
      
      throw this.createError(
        error.message,
        error.code || 'GOOGLE_ERROR',
        error.status || 500,
        this.isRetryableError(error)
      );
    }
  }

  async embedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    
    try {
      const inputArray = Array.isArray(request.input) ? request.input : [request.input];
      this.logRequest('embedding', request.model, this.estimateTokens(inputArray.map(text => ({ role: 'user', content: text }))), request.user);

      const model = this.client.getGenerativeModel({ model: request.model });
      const embeddings = await Promise.all(
        inputArray.map(async (text, index) => {
          const result = await model.embedContent(text);
          return {
            object: 'embedding',
            embedding: result.embedding,
            index
          };
        })
      );

      const responseTime = Date.now() - startTime;
      const cost = this.calculateCost(inputArray.reduce((total, text) => total + text.length, 0), request.model);

      this.logResponse('embedding', request.model, this.estimateTokens(inputArray.map(text => ({ role: 'user', content: text }))), responseTime, cost, request.user);

      return {
        object: 'list',
        data: embeddings,
        model: request.model,
        provider: this.provider,
        usage: {
          prompt_tokens: this.estimateTokens(inputArray.map(text => ({ role: 'user', content: text }))),
          total_tokens: this.estimateTokens(inputArray.map(text => ({ role: 'user', content: text })))
        },
        cost: {
          amount: cost,
          currency: 'USD',
          provider: this.provider
        },
        cached: false,
        response_time: responseTime
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error('Google Embedding Error', { error: error.message, responseTime, model: request.model });
      
      throw this.createError(
        error.message,
        error.code || 'GOOGLE_ERROR',
        error.status || 500,
        this.isRetryableError(error)
      );
    }
  }

  private estimateTokens(messages: any[]): number {
    return messages.reduce((total, msg) => total + Math.ceil(msg.content.length / 4), 0);
  }

  private calculateCost(characters: number, model: string): number {
    // Precios aproximados por 1K caracteres
    const prices: Record<string, number> = {
      'gemini-pro': 0.0005,
      'gemini-pro-vision': 0.0005,
      'embedding-001': 0.0001
    };

    const price = prices[model] || 0.0005;
    return (characters * price) / 1000;
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = ['rate_limit_exceeded', 'server_error', 'timeout'];
    return retryableCodes.includes(error.code) || error.status >= 500;
  }
}

export class LLMProviderManager {
  private providers: Map<LLMProvider, BaseLLMProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.providers.set(LLMProvider.OPENAI, new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL,
        timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000'),
        maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
      }));
    }

    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.set(LLMProvider.ANTHROPIC, new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: process.env.ANTHROPIC_BASE_URL,
        timeout: parseInt(process.env.ANTHROPIC_TIMEOUT || '60000'),
        maxRetries: parseInt(process.env.ANTHROPIC_MAX_RETRIES || '3'),
      }));
    }

    // Google
    if (process.env.GOOGLE_API_KEY) {
      this.providers.set(LLMProvider.GOOGLE, new GoogleProvider({
        apiKey: process.env.GOOGLE_API_KEY,
        timeout: parseInt(process.env.GOOGLE_TIMEOUT || '60000'),
        maxRetries: parseInt(process.env.GOOGLE_MAX_RETRIES || '3'),
      }));
    }

    logger.info(`LLM Providers inicializados: ${Array.from(this.providers.keys()).join(', ')}`);
  }

  getProvider(provider: LLMProvider): BaseLLMProvider {
    const llmProvider = this.providers.get(provider);
    if (!llmProvider) {
      throw new Error(`Provider ${provider} no está configurado`);
    }
    return llmProvider;
  }

  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.providers.keys());
  }

  async testProvider(provider: LLMProvider): Promise<boolean> {
    try {
      const llmProvider = this.getProvider(provider);
      await llmProvider.chat({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'test',
        max_tokens: 10
      });
      return true;
    } catch (error) {
      logger.error(`Error testing provider ${provider}:`, error);
      return false;
    }
  }
}

export const llmProviderManager = new LLMProviderManager();