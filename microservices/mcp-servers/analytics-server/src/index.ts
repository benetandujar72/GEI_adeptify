import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AnalyticsTools } from './src/tools/analytics-tools.js';

const server = new Server(
  {
    name: 'analytics-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const analyticsTools = new AnalyticsTools();

// Register tools
server.setRequestHandler(analyticsTools.listTools);
server.setRequestHandler(analyticsTools.callTool);

const transport = new StdioServerTransport();
await server.connect(transport);

console.log('Analytics MCP Server started');
