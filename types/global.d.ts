// Declaraciones de tipos globales para resolver problemas de TypeScript
declare module 'http-proxy-middleware' {
  import { RequestHandler } from 'express';
  
  interface ProxyOptions {
    target?: string;
    changeOrigin?: boolean;
    pathRewrite?: { [key: string]: string };
    onProxyReq?: (proxyReq: any, req: any, res: any) => void;
    onProxyRes?: (proxyRes: any, req: any, res: any) => void;
    onError?: (err: any, req: any, res: any) => void;
  }
  
  function createProxyMiddleware(options: ProxyOptions): RequestHandler;
  export = createProxyMiddleware;
}

declare module 'http-proxy' {
  import { Server } from 'http';
  
  interface ProxyOptions {
    target?: string;
    changeOrigin?: boolean;
    ws?: boolean;
    xfwd?: boolean;
  }
  
  class HttpProxy {
    constructor();
    web(req: any, res: any, options: ProxyOptions, callback?: (err: any) => void): void;
    ws(req: any, socket: any, head: any, options: ProxyOptions, callback?: (err: any) => void): void;
  }
  
  export = HttpProxy;
}