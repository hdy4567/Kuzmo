import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { KzmModule } from '@modules/kernel/entities/kzm_kernel_entities';
import { $log } from '@modules/kernel/logic/kzm_kernel_logger';
import { $store } from '@modules/kernel/persistence/kzm_kernel_store';

/**
 * [BRAIN-GOVERNOR] KzmBrainGovernor (v12.0 - Unified Sovereign Intelligence)
 * ========================================================
 * Role: Principal Intelligence Engine for the Kuzmo Kernel.
 * Features: Asynchronous UI Interaction + Semantic Labeling + Canvas Optimization.
 */
export class KzmBrainGovernor implements KzmModule {
  private static instance: KzmBrainGovernor;
  public id = 'intelligence-core';
  public isSyncMode = true;
  public isVisible = false;

  private container: HTMLElement | null = null;
  private isProcessing = false;
  private isActive = false;

  private constructor() {}

  public static get(): KzmBrainGovernor {
    if (!KzmBrainGovernor.instance) KzmBrainGovernor.instance = new KzmBrainGovernor();
    return KzmBrainGovernor.instance;
  }

  /**
   * 🏗️ [MOUNT] Initialize Sovereign Brain UI
   */
  public mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = this.id;
    this.container.className = 'fast-render hidden';
    this.isActive = true;

    try {
      $broker.registerSync(this.id as any, 'SIDE_PANEL', this.container);
      parent.appendChild(this.container);
      this.bindInternalEvents();
      this.render();
      $log.log('INFO', 'BRAIN_GOVERNOR', 'Neural Guard ONLINE.');
    } catch (e) {
      $log.log('FATAL', 'BRAIN_GOVERNOR', 'Initialization Failure', { error: e });
    }
  }

  public show(): void {
    this.isVisible = true;
    this.container?.classList.remove('hidden');
  }

  public hide(): void {
    this.isVisible = false;
    this.container?.classList.add('hidden');
  }

  /**
   * 🤖 [SEMANTIC-PROCESS] Asynchronous Thinking & Labeling
   */
  public async processQuery(query: string): Promise<string> {
    if (this.isProcessing) return "Engine is occupied.";
    this.isProcessing = true;

    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            this.isProcessing = false;
            resolve("Brain timeout. Please simplify the request.");
        }, 8000);

        setTimeout(() => {
            clearTimeout(timer);
            this.isProcessing = false;
            resolve(`Brain analyzed: ${query}. (Unified v12.0)`);
        }, 1200);
    });
  }

  private bindInternalEvents(): void {
    // 1. UI Query Pipeline
    $broker.on('AI_START_QUERY', async (data: any) => {
      const response = await this.processQuery(data.query);
      $broker.emit('AI_RESPONSE_RECEIVED', { response });
    });

    // 2. Semantic Labeling (Merged from Canvas Logic)
    $broker.on('AI_LABEL_BREADCRUMB', (data: any) => {
        const tags = this.extractSemanticTags(data.title + " " + data.content);
        if (tags.length > 0) $broker.emit('AI_TAGS_SUGGESTED', { id: data.id, tags });
    });

    $broker.on('AI_SEMANTIC_SEARCH', (query: string) => {
        const matches = $store.records.filter(r => r.title.includes(query) || r.content.includes(query));
        if (matches.length > 0) $broker.emit('UI_ATMOSPHERE_HIGHLIGHT', { tag: query, count: matches.length });
    });

    $broker.on('UI_GLOBAL_DISMISS', () => this.hide());
  }

  private extractSemanticTags(text: string): string[] {
    const commonTags = ['Seoul', 'Tokyo', 'Travel', 'Food', 'Archive'];
    return commonTags.filter(tag => text.toLowerCase().includes(tag.toLowerCase())).map(t => `@${t}`);
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = `<div class="ai-status">BRAIN: NOMINAL</div>`;
  }
}

export const $brain = KzmBrainGovernor.get();
