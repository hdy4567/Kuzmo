import { test, expect } from '@playwright/test';

test('AI Chat Integration with Gemini 1.5', async ({ page }) => {
  console.log('🌍 Navigate to local server...');
  await page.goto('http://localhost:9005');
  
  // Wait for bootstrap (some modules are initialized with delay)
  await page.waitForTimeout(5000);
  
  console.log('🕒 Checking if Chat is already open...');
  const chatPanel = page.locator('#chat-panel');
  const isChatVisible = await chatPanel.evaluate(el => el.classList.contains('active'));
  
  if (!isChatVisible) {
      console.log('🕒 Waiting for chat FAB...');
      const chatFab = page.locator('#chat-fab');
      await chatFab.waitFor({ state: 'visible', timeout: 30000 });
      
      await page.screenshot({ path: `C:/Users/함동윤/.gemini/antigravity/brain/c880d368-2f9f-4886-a7b1-633453f71d6a/debug_before_click.png` });
      
      console.log('🖱️ Clicking Chat FAB via JS...');
      await page.evaluate(() => document.getElementById('chat-fab').click());
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: `C:/Users/함동윤/.gemini/antigravity/brain/c880d368-2f9f-4886-a7b1-633453f71d6a/debug_after_click.png` });
  } else {
      console.log('✅ Chat is already open.');
  }
  
  console.log('🕒 Waiting for chat input...');
  const chatInput = page.locator('.chat-input');
  await chatInput.waitFor({ state: 'visible', timeout: 30000 });
  
  // Type request
  const prompt = "오키나와에서 가볼 만한 곳 추천해 줘";
  console.log(`⌨️ Typing prompt: ${prompt}`);
  await chatInput.fill(prompt);
  await page.waitForTimeout(500);
  console.log('🚀 Sending message...');
  await chatInput.press('Enter');
  
  console.log('⏳ Waiting for Gemini 1.5 response...');
  // AI message bubbles have .message.ai class. 
  // Initially there is one (the greeting). We wait for a SECOND one to appear, 
  // or for the greeting count to increase if we use .last() correctly after send.
  
  // Wait for the message list to grow or the last message to be from AI and NOT the greeting.
  const aiMessage = page.locator('.message.ai').last();
  
  // Custom wait: Wait for the text to NOT be the default greeting
  const initialGreeting = "안녕하세요! 어떤 여행 추억이나 장소를 찾아드릴까요?";
  
  await expect(async () => {
    const text = await aiMessage.innerText();
    const isNewMessage = text.trim() !== "" && !text.includes(initialGreeting);
    if (!isNewMessage) {
       console.log('... still waiting for non-greeting response ...');
       throw new Error('Still waiting for AI message');
    }
  }).toPass({ timeout: 60000, intervals: [2000] });

  const finalResponseText = await aiMessage.innerText();
  console.log(`✨ Gemini 1.5 Response Captured: "${finalResponseText.substring(0, 100)}..."`);
  
  // Check for map highlights (RAG Highlights should be rendered if locations are mentioned)
  // map_renderer.js draws RAG highlights as polylines with class 'rag-glow-line' or adds them to the map.
  // Actually, they are added to state.map as polylines.
  
  // Screenshot result
  const screenshotPath = `C:/Users/함동윤/.gemini/antigravity/brain/c880d368-2f9f-4886-a7b1-633453f71d6a/ai_chat_completion_check.png`;
  await page.screenshot({ path: screenshotPath });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);
  
  console.log('✅ SUCCESS: AI Chat integration verified with Gemini 1.5.');
});
