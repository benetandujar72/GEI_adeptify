import { Request, Response } from 'express';
import { MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class MCPRouter {
  private clients: Map<string, MCPClient> = new Map();
  private contextManager: ContextManager;
  private aiCoordinator: AIAgentCoordinator;

  constructor() {
    this.contextManager = new ContextManager();
    this.aiCoordinator = new AIAgentCoordinator();
    this.initializeClients();
  }

  private async initializeClients() {
    // Academic Data MCP Server
    const academicClient = new MCPClient(
      new StdioClientTransport({
        command: 'node',
        args: ['../mcp-servers/academic-data-server/dist/index.js']
      })
    );
    await academicClient.connect();
    this.clients.set('academic', academicClient);

    // Resource Management MCP Server
    const resourceClient = new MCPClient(
      new StdioClientTransport({
        command: 'node',
        args: ['../mcp-servers/resource-management-server/dist/index.js']
      })
    );
    await resourceClient.connect();
    this.clients.set('resource', resourceClient);

    // Communication MCP Server
    const communicationClient = new MCPClient(
      new StdioClientTransport({
        command: 'node',
        args: ['../mcp-servers/communication-server/dist/index.js']
      })
    );
    await communicationClient.connect();
    this.clients.set('communication', communicationClient);

    // Analytics MCP Server
    const analyticsClient = new MCPClient(
      new StdioClientTransport({
        command: 'node',
        args: ['../mcp-servers/analytics-server/dist/index.js']
      })
    );
    await analyticsClient.connect();
    this.clients.set('analytics', analyticsClient);
  }

  async routeRequest(req: Request, res: Response) {
    try {
      const { service, action, data, context } = req.body;
      
      // Get context from context manager
      const enrichedContext = await this.contextManager.getContext(context);
      
      // Route to appropriate MCP server
      const client = this.clients.get(service);
      if (!client) {
        return res.status(404).json({ error: 'Service not found' });
      }

      // Execute request with AI coordination
      const result = await this.aiCoordinator.executeRequest(client, action, data, enrichedContext);
      
      res.json(result);
    } catch (error) {
      console.error('MCP Router Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAvailableTools(req: Request, res: Response) {
    try {
      const tools = [];
      for (const [service, client] of this.clients) {
        const serverInfo = await client.listTools();
        tools.push({
          service,
          tools: serverInfo.tools
        });
      }
      res.json({ tools });
    } catch (error) {
      console.error('Error getting tools:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
