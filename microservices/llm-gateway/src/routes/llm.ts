import { Router } from 'express';
import { LLMController } from '../controllers/llm.controller';
import { validateRequest } from '../middleware/validation';
import { ChatRequestSchema, CompletionRequestSchema, EmbeddingRequestSchema, BatchRequestSchema } from '../types/llm';

const router = Router();
const llmController = new LLMController();

// Chat completions
router.post('/chat', 
  validateRequest(ChatRequestSchema),
  llmController.chat.bind(llmController)
);

// Text completions
router.post('/completions', 
  validateRequest(CompletionRequestSchema),
  llmController.completion.bind(llmController)
);

// Embeddings
router.post('/embeddings', 
  validateRequest(EmbeddingRequestSchema),
  llmController.embedding.bind(llmController)
);

// Batch processing
router.post('/batch', 
  validateRequest(BatchRequestSchema),
  llmController.batch.bind(llmController)
);

// Provider management
router.get('/providers', llmController.getProviders.bind(llmController));
router.get('/providers/:provider/test', llmController.testProvider.bind(llmController));

// Model information
router.get('/models', llmController.getModels.bind(llmController));
router.get('/models/:provider', llmController.getModelsByProvider.bind(llmController));

// Cost tracking
router.get('/costs/summary', llmController.getCostSummary.bind(llmController));
router.get('/costs/history', llmController.getCostHistory.bind(llmController));
router.get('/costs/users', llmController.getTopUsers.bind(llmController));

// Cache management
router.get('/cache/stats', llmController.getCacheStats.bind(llmController));
router.delete('/cache', llmController.clearCache.bind(llmController));
router.delete('/cache/:pattern', llmController.invalidateCache.bind(llmController));

export { router as llmRoutes };