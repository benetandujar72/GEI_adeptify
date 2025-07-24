import { test, expect } from '@playwright/test';

test.describe('AI Chatbot E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ai-chatbot');
  });

  test('should load chatbot interface', async ({ page }) => {
    await expect(page.getByText('AI Educational Assistant')).toBeVisible();
    await expect(page.getByPlaceholder('Type your message...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
  });

  test('should create new chat session', async ({ page }) => {
    await page.getByRole('button', { name: 'New Session' }).click();
    
    // Wait for session to be created
    await expect(page.getByText('Session created successfully')).toBeVisible();
  });

  test('should send and receive messages', async ({ page }) => {
    // Create a new session first
    await page.getByRole('button', { name: 'New Session' }).click();
    
    // Type and send a message
    const input = page.getByPlaceholder('Type your message...');
    await input.fill('Hello, I need help with math');
    await page.getByRole('button', { name: 'Send' }).click();
    
    // Wait for AI response
    await expect(page.getByText('Hello, I need help with math')).toBeVisible();
    await expect(page.locator('.ai-message')).toBeVisible();
  });

  test('should handle suggestions', async ({ page }) => {
    // Create a new session
    await page.getByRole('button', { name: 'New Session' }).click();
    
    // Send a message that might trigger suggestions
    const input = page.getByPlaceholder('Type your message...');
    await input.fill('What can you help me with?');
    await page.getByRole('button', { name: 'Send' }).click();
    
    // Wait for suggestions to appear
    await expect(page.locator('.suggestions')).toBeVisible();
    
    // Click on a suggestion
    await page.getByRole('button', { name: /Math Help/ }).click();
    
    // Verify the suggestion was sent as a message
    await expect(page.getByText('Math Help')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    const input = page.getByPlaceholder('Type your message...');
    
    // Focus on input
    await input.focus();
    await expect(input).toBeFocused();
    
    // Type a message and press Enter
    await input.fill('Test message');
    await input.press('Enter');
    
    // Verify message was sent
    await expect(page.getByText('Test message')).toBeVisible();
  });

  test('should show loading state', async ({ page }) => {
    // Create a new session
    await page.getByRole('button', { name: 'New Session' }).click();
    
    // Send a message
    const input = page.getByPlaceholder('Type your message...');
    await input.fill('Test message');
    await page.getByRole('button', { name: 'Send' }).click();
    
    // Check for loading indicator
    await expect(page.getByText('Sending...')).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/ai/chat/messages', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Server error' })
      });
    });
    
    // Create a new session
    await page.getByRole('button', { name: 'New Session' }).click();
    
    // Send a message
    const input = page.getByPlaceholder('Type your message...');
    await input.fill('Test message');
    await page.getByRole('button', { name: 'Send' }).click();
    
    // Check for error message
    await expect(page.getByText('Failed to send message')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify interface is still usable
    await expect(page.getByText('AI Educational Assistant')).toBeVisible();
    await expect(page.getByPlaceholder('Type your message...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
    
    // Test sending a message on mobile
    const input = page.getByPlaceholder('Type your message...');
    await input.fill('Mobile test');
    await page.getByRole('button', { name: 'Send' }).click();
    
    await expect(page.getByText('Mobile test')).toBeVisible();
  });

  test('should maintain chat history', async ({ page }) => {
    // Create a new session
    await page.getByRole('button', { name: 'New Session' }).click();
    
    // Send multiple messages
    const input = page.getByPlaceholder('Type your message...');
    
    await input.fill('First message');
    await page.getByRole('button', { name: 'Send' }).click();
    
    await input.fill('Second message');
    await page.getByRole('button', { name: 'Send' }).click();
    
    await input.fill('Third message');
    await page.getByRole('button', { name: 'Send' }).click();
    
    // Verify all messages are visible
    await expect(page.getByText('First message')).toBeVisible();
    await expect(page.getByText('Second message')).toBeVisible();
    await expect(page.getByText('Third message')).toBeVisible();
  });

  test('should handle session switching', async ({ page }) => {
    // Create first session
    await page.getByRole('button', { name: 'New Session' }).click();
    
    // Send a message in first session
    const input = page.getByPlaceholder('Type your message...');
    await input.fill('Session 1 message');
    await page.getByRole('button', { name: 'Send' }).click();
    
    // Create second session
    await page.getByRole('button', { name: 'New Session' }).click();
    
    // Send a message in second session
    await input.fill('Session 2 message');
    await page.getByRole('button', { name: 'Send' }).click();
    
    // Verify messages are in correct sessions
    await expect(page.getByText('Session 2 message')).toBeVisible();
  });
}); 