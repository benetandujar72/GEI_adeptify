import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ResourceManagementTools } from './src/tools/resource-management-tools.js';

const server = new Server(
  {
    name: 'resource-management-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const resourceTools = new ResourceManagementTools();

// Register tools
server.setRequestHandler(resourceTools.listTools);
server.setRequestHandler(resourceTools.callTool);

const transport = new StdioServerTransport();
await server.connect(transport);

console.log('Resource Management MCP Server started');
