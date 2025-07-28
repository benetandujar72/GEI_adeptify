import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CommunicationTools } from './src/tools/communication-tools.js';

const server = new Server(
  {
    name: 'communication-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const communicationTools = new CommunicationTools();

// Register tools
server.setRequestHandler(communicationTools.listTools);
server.setRequestHandler(communicationTools.callTool);

const transport = new StdioServerTransport();
await server.connect(transport);

console.log('Communication MCP Server started');
