import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { KzmModule } from '@modules/kernel/entities/kzm_kernel_entities';

/**
 * ?쭬 KzmAIModule (v1.8 - Semantic Streaming Protocol)
 * ========================================================
 * AI chat assistant with real-time streaming and map teleportation.
 */
export class KzmAIModule implements KzmModule {
  public id = 'ai-assistant-v1';
  public isSyncMode = true; 
  public isVisible = false; 
  
  private container: HTMLElement | null = null;
  private chatHistory: HTMLElement | null = null;
  private isProcessing = false;

  public mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = 'ai-assistant-v1';
    this.container.className = 'ai-chat-capsule hidden fast-render';

    $broker.registerSync('ai-assistant-v1', 'SIDE_PANEL', this.container, 'kzm_core.css');
    parent.appendChild(this.container);
    
    this.bindGlobalEvents();
  }

  public show(): void {
    if (!this.container) return;
    this.render();
    this.isVisible = true;
    this.container.classList.remove('hidden');
    this.container.classList.add('visible');
    this.container.classList.add('luxe-fade-in');
  }

  public hide(): void {
    if (this.container) {
      this.isVisible = false;
      this.container.classList.remove('visible');
      this.container.classList.add('hidden');
    }
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="ai-chat-body">
          <div class="ai-chat-header">
              <span>MEMORY ASSISTANT [SOVEREIGN]</span>
              <button id="ai-chat-close" class="btn-close-minimal">??/button>
          </div>
          <div class="ai-chat-scroller" id="ai-chat-log">
              <div class="ai-msg bot">Hello. I am your Memory Assistant. Ask me about @Mentions or tagged memories.</div>
          </div>
          <div class="ai-chat-input-row">
              <input type="text" id="ai-chat-prompt" placeholder="Ask anything..." />
              <button id="ai-chat-send">??</button>
          </div>
      </div>
    `;

    this.chatHistory = this.container.querySelector('#ai-chat-log');
    const input = this.container.querySelector('#ai-chat-prompt') as HTMLInputElement;

    this.container.querySelector('#ai-chat-send')?.addEventListener('click', () => {
      if (input.value) this.sendMessage(input.value);
      input.value = "";
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value) {
        this.sendMessage(input.value);
        input.value = "";
      }
      if (e.key === 'Tab') e.preventDefault();
    });

    this.container.querySelector('#ai-chat-close')?.addEventListener('click', () => this.hide());
  }

  private async sendMessage(prompt: string): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.appendMessage('user', prompt);
    const botMsgEl = this.appendMessage('bot', '...');
    try {
      let responseFull = `Analyzing your memory field for "${prompt}". `;
      let currentIdx = 0;
      const streamInterval = setInterval(() => {
        if (currentIdx < responseFull.length) {
          botMsgEl.textContent = responseFull.substring(0, currentIdx + 1);
          currentIdx++;
          if (responseFull.includes('@')) {
            const tagMatch = responseFull.match(/@(\S+)/);
            if (tagMatch) $broker.executeCommand('UI_ATMOSPHERE_HIGHLIGHT', { tag: tagMatch[0] });
          }
        } else {
          clearInterval(streamInterval);
          this.isProcessing = false;
        }
      }, 30);
    } catch (e) {
      botMsgEl.textContent = "AI_STREAM_INTERRUPTED.";
      this.isProcessing = false;
    }
  }

  private appendMessage(role: 'user' | 'bot', text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = `ai-msg ${role}`;
    el.textContent = text;
    this.chatHistory?.appendChild(el);
    this.chatHistory?.scrollTo(0, this.chatHistory.scrollHeight);
    return el;
  }

  private bindGlobalEvents(): void {
    $broker.on('UI_AI_TOGGLE', () => {
        if (this.isVisible) this.hide();
        else this.show();
    });
    $broker.on('UI_GLOBAL_DISMISS', () => this.hide());
  }
}
