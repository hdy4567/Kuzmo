import { Kzm } from '../db/kzm_memo_entities';

/**
 * 🏢 KzmMemoContentFactory (v1.0 - Universal Content Orchestrator)
 * ========================================================
 * Role: Dynamically generates the appropriate View/Logic for different memo types.
 * Specs: Handles Text, Drawing, Audio (10s), and Photos.
 */
export class KzmMemoContentFactory {

  public static render(record: Kzm.Record): HTMLElement {
    const container = document.createElement('div');
    container.className = `memo-content-luxe type-${record.category.toLowerCase()}`;

    switch (record.category) {
      case 'DRAWING':
        return this.renderDrawing(record);
      case 'PHOTO':
        return this.renderPhoto(record);
      case 'VOICE':
        return this.renderAudio(record);
      case 'NOTE':
      case 'MEMO':
      default:
        return this.renderText(record);
    }
  }

  private static renderText(record: Kzm.Record): HTMLElement {
    const el = document.createElement('div');
    el.className = 'memo-body-text';
    el.innerHTML = record.content; // Should be sanitized or use a MD renderer
    return el;
  }

  private static renderDrawing(record: Kzm.Record): HTMLElement {
    const container = document.createElement('div');
    container.className = 'memo-body-drawing';

    // In view mode, show just the image. In edit mode, we'd swap for a Canvas.
    const img = document.createElement('img');
    img.src = record.content;
    img.style.maxWidth = '100%';
    container.appendChild(img);
    return container;
  }

  private static renderPhoto(record: Kzm.Record): HTMLElement {
    const container = document.createElement('div');
    container.className = 'memo-body-photo';

    // 📸 SPEC: Only use address and thumbnail parsing
    const img = document.createElement('img');
    img.src = record.metadata.thumbnail || record.content;
    img.className = 'photo-luxe-preview';

    const addr = document.createElement('div');
    addr.className = 'photo-location-tag';
    addr.textContent = record.location || 'Unknown Coordinates';

    container.appendChild(img);
    container.appendChild(addr);
    return container;
  }

  private static renderAudio(record: Kzm.Record): HTMLElement {
    const container = document.createElement('div');
    container.className = 'memo-body-audio';

    // 🎧 SPEC: Max 10s constraint reflected in UI
    const audio = document.createElement('audio');
    audio.src = record.content;
    audio.controls = true;

    const durationLabel = document.createElement('span');
    durationLabel.textContent = `Duration: ${record.metadata.duration}s (Max 10s)`;

    container.appendChild(audio);
    container.appendChild(durationLabel);
    return container;
  }
}
