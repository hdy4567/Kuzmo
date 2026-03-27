/**
 * 🧪 [v28.5] UI Module Integrity Test (Unit-style Validation)
 * Purpose: Ensure no logic loss during refactoring of Audio/Sketch/Visualizer modules.
 */

import { initAudioPlayer, renderAudioPlayerHTML } from './src/modules/view/ui/components/audio_player.js';
import { initSketchInteraction, renderSketchHTML } from './src/modules/view/ui/components/sketch_preview.js';
import { VisualizerCenter } from './src/modules/view/map/visualizer_center.js';

async function runIntegrityCheck() {
    console.log("🚀 [TEST] UI Module Integrity Check Started...");
    const results = [];

    // 1. Audio Component Test
    try {
        const html = renderAudioPlayerHTML("test.mp3");
        if (html.includes('id="sns-audio-container"') && html.includes('▶')) {
            results.push("✅ Audio Component: HTML Rendering OK");
        } else {
            throw new Error("Audio HTML mismatch");
        }

        // Mock state/DOM
        const div = document.createElement('div');
        div.innerHTML = html;
        const cleanup = initAudioPlayer(div, "test.mp3");
        if (typeof cleanup === 'function') {
            results.push("✅ Audio Component: Init & Lifecycle OK");
            cleanup(); // Test calling cleanup
        }
    } catch (e) {
        results.push(`❌ Audio Component: FAILED (${e.message})`);
    }

    // 2. Sketch Component Test
    try {
        const sketchData = { sketch_ai: { svg: '<svg id="test-svg"></svg>' } };
        const html = renderSketchHTML(sketchData);
        if (html.includes('test-svg')) {
            results.push("✅ Sketch Component: SVG Rendering OK");
        }
    } catch (e) {
        results.push(`❌ Sketch Component: FAILED (${e.message})`);
    }

    // 3. Visualizer Center Test
    try {
        VisualizerCenter.init();
        if (document.getElementById('selection-box')) {
            results.push("✅ Visualizer Center: DOM Singleton OK");
        }
        
        // Logical check
        VisualizerCenter.renderSelectionBox({x:10, y:10}, {x:50, y:50});
        const box = document.getElementById('selection-box');
        // wait for requestAnimationFrame (approx)
        setTimeout(() => {
            if (box.style.display === 'block') {
                console.log("✅ Visualizer Center: Render Logic OK");
            }
        }, 100);
    } catch (e) {
        results.push(`❌ Visualizer Center: FAILED (${e.message})`);
    }

    // 4. Cleanup Check (Ghost file check)
    // - Logic implemented: VisualizerCenter.clearAll()
    try {
        VisualizerCenter.clearAll();
        results.push("✅ System Cleanup: clearAll() Logic OK");
    } catch (e) {
        results.push(`❌ System Cleanup: FAILED (${e.message})`);
    }

    console.log("\n--- TEST SUMMARY ---");
    results.forEach(r => console.log(r));
}

// Global exposure for debugging
window.KuzmoIntegrityTest = runIntegrityCheck;
// Auto-run in test environment if needed
// runIntegrityCheck();
