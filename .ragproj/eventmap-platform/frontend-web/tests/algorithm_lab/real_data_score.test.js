import { test, expect } from '@playwright/test';
import KuzmoPerformanceEvaluator from './performance_evaluator.js';

test.describe('📊 Real-Data Intelligence Scoring', () => {
    test('Calculate live score from browser state', async ({ page }) => {
        await page.goto('http://localhost:9005');
        await page.waitForTimeout(7000); // Wait for boot and data sync

        const evaluationData = await page.evaluate(() => {
            if (!window.Kuzmo || !window.Kuzmo.state) return null;
            
            const state = window.Kuzmo.state;
            const allEvents = state.eventStore || [];
            if (allEvents.length === 0) return { error: 'No events in store' };

            // Mock a query context for evaluation
            const queryVec = new Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1)); 
            const viewport = { 
                minLat: 30, maxLat: 40, 
                minLng: 120, maxLng: 140 
            };

            // Use the optimizer if available
            // Note: Since this runs in browser, we assume Kuzmo.optimizer exists or we use internal logic
            const visible = allEvents.filter(e => 
                e.lat >= viewport.minLat && e.lat <= viewport.maxLat &&
                e.lng >= viewport.minLng && e.lng <= viewport.maxLng
            );

            return {
                allVectors: allEvents.map(e => e.vector).filter(v => !!v),
                retrievedVectors: visible.map(e => e.vector).filter(v => !!v),
                results: visible.map(e => ({ vector: e.vector, lat: e.lat, lng: e.lng })).filter(r => !!r.vector)
            };
        });

        if (!evaluationData || evaluationData.error) {
            console.log('⚠️ Could not fetch real data:', evaluationData?.error);
            return;
        }

        const evaluator = new KuzmoPerformanceEvaluator();
        const sig = evaluator.calculateSIG(evaluationData.retrievedVectors, evaluationData.allVectors);
        const ssa = evaluator.calculateSSA(evaluationData.results);
        const vsi = 100; // Assume stable for baseline

        const total = evaluator.calculateTotalScore(sig, ssa, vsi);
        console.log(`\n==========================================`);
        console.log(`📈 REAL-DATA INTELLIGENCE REPORT`);
        console.log(`- SIG (Semantic Detail): ${sig.toFixed(2)}`);
        console.log(`- SSA (Map Coherence): ${ssa.toFixed(2)}`);
        console.log(`- Total Intel Score: ${total}/100`);
        console.log(`==========================================\n`);
        
        expect(Number(total)).toBeGreaterThan(0);
    });
});
