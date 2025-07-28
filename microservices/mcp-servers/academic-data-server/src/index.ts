import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AcademicDataTools } from './src/tools/academic-data-tools.js';

const server = new Server(
  {
    name: 'academic-data-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const academicTools = new AcademicDataTools();

// Register tools
server.setRequestHandler(academicTools.listTools);
server.setRequestHandler(academicTools.callTool);

const transport = new StdioServerTransport();
await server.connect(transport);

console.log('Academic Data MCP Server started');
