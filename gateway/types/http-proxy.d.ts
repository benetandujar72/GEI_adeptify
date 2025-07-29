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