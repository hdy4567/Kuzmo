/**
 * 🛰️ [v26.0] Sketch Preview SVG Component
 * Handles high-fidelity rendering of SVG sketch data and optional interaction.
 */

export function renderSketchHTML(data) {
    if (!data.sketch_ai || !data.sketch_ai.svg) return '';
    return `<div class="sns-sketch-preview">${data.sketch_ai.svg}</div>`;
}

export function initSketchInteraction(container) {
    if (!container) return;
    
    // Future expansion: zoom, pan, or edit trigger
    const svg = container.querySelector('svg');
    if (svg) {
        svg.style.transition = 'transform 0.3s ease';
        container.onmouseover = () => { svg.style.transform = 'scale(1.02)'; };
        container.onmouseout = () => { svg.style.transform = 'scale(1)'; };
    }
}
