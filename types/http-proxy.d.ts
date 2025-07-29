// Declaraciones de tipos para http-proxy y http-proxy-middleware
declare module 'http-proxy-middleware' {
  import { RequestHandler } from 'express';
  
  interface ProxyOptions {
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
    router?: { [key: string]: string } | ((req: any) => string);
    ignorePath?: boolean;
    prependPath?: boolean;
    autoRewrite?: boolean;
    protocolRewrite?: string | number;
    cookieDomainRewrite?: { [key: string]: string } | string | false;
    cookiePathRewrite?: { [key: string]: string } | string | false;
    preserveHeaderKeyCase?: boolean;
    selfHandleResponse?: boolean;
    buffer?: any;
  }
  
  function createProxyMiddleware(
    context: string | string[] | ((pathname: string, req: any) => boolean),
    options?: ProxyOptions
  ): RequestHandler;
  
  function createProxyMiddleware(options: ProxyOptions): RequestHandler;
  
  export = createProxyMiddleware;
}

declare module 'http-proxy' {
  import { Server } from 'http';
  
  interface ProxyOptions {
    target?: string;
    changeOrigin?: boolean;
    secure?: boolean;
    ws?: boolean;
    xfwd?: boolean;
    prependPath?: boolean;
    ignorePath?: boolean;
    autoRewrite?: boolean;
    protocolRewrite?: string | number;
    headers?: { [key: string]: string };
    preserveHeaderKeyCase?: boolean;
    selfHandleResponse?: boolean;
    buffer?: any;
    router?: { [key: string]: string } | ((req: any) => string);
    pathRewrite?: { [key: string]: string } | ((path: string, req: any) => string);
    onProxyReq?: (proxyReq: any, req: any, res: any) => void;
    onProxyRes?: (proxyRes: any, req: any, res: any) => void;
    onError?: (err: Error, req: any, res: any) => void;
    onOpen?: (proxySocket: any) => void;
    onClose?: (res: any, socket: any, head: any) => void;
  }
  
  class HttpProxy {
    constructor(options?: ProxyOptions);
    web(req: any, res: any, options?: ProxyOptions, callback?: (err: any) => void): void;
    ws(req: any, socket: any, head: any, options?: ProxyOptions, callback?: (err: any) => void): void;
    listen(port: number): void;
    close(): void;
  }
  
  export = HttpProxy;
}