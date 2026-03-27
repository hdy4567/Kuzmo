/**
 * 🌀 KzmSliderLogic (v1.5 - Optimized)
 * =====================================
 * Reusable logic for memory-optimized sliding lists.
 * Max Capacity: 50.
 * Includes Virtual Fragment Injection.
 */
export class KzmSliderLogic {
  /**
   * Renders a list of items into a target container.
   * Optimized with DocumentFragment and capacity capping.
   */
  static renderList(
    container: HTMLElement, 
    items: any[], 
    config: { 
        max: number, 
        onRender?: (el: HTMLElement, data: any) => void 
    } = { max: 50 }
  ): void {
    if (!container) return;

    // 1. Cap at 50 for memory optimization
    const visibleData = items.slice(0, config.max);

    // 2. Fragment Injection (Minimal Reflow)
    const frag = document.createDocumentFragment();
    visibleData.forEach(item => {
        const el = document.createElement('div');
        el.className = 'dock-item animate-in';
        el.dataset.id = item.id;
        el.title = item.title || item.label || '';
        
        if (config.onRender) {
            config.onRender(el, item);
        } else {
            el.innerHTML = `<div class="dock-icon">${item.icon || '🔗'}</div>`;
        }
        
        frag.appendChild(el);
    });

    container.innerHTML = '';
    container.appendChild(frag);
  }
}
