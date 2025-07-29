// Definiciones de tipos globales para el proyecto Adeptify

declare module 'http-proxy-middleware' {
  import { RequestHandler } from 'express';

  export interface ProxyOptions {
    target?: string;
    changeOrigin?: boolean;
    pathRewrite?: { [key: string]: string } | ((path: string, req: any) => string);
    onProxyReq?: (proxyReq: any, req: any, res: any) => void;
    onProxyRes?: (proxyRes: any, req: any, res: any) => void;
    onError?: (err: Error, req: any, res: any) => void;
    logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
    secure?: boolean;
    ws?: boolean;
    xfwd?: boolean;
    headers?: { [key: string]: string };
  }

  export function createProxyMiddleware(
    context: string | string[] | ((pathname: string, req: any) => boolean),
    options?: ProxyOptions
  ): RequestHandler;

  export function createProxyMiddleware(options: ProxyOptions): RequestHandler;
}

// Declaraciones adicionales para otras librerías que puedan necesitar tipos
declare module 'http-proxy' {
  export interface ProxyOptions {
    target?: string;
    changeOrigin?: boolean;
    secure?: boolean;
    ws?: boolean;
    xfwd?: boolean;
  }

  export class Proxy {
    constructor(options?: ProxyOptions);
    web(req: any, res: any, options?: ProxyOptions): void;
    ws(req: any, socket: any, head: any, options?: ProxyOptions): void;
  }
}