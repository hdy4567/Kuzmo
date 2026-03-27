import { test, expect } from '@playwright/test';

test.describe('🌳 KZM Intelligent Engine Optimization Test', () => {
    test('Windowing strategy validation', async ({ page }) => {
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

        await page.goto('http://localhost:9005');
        await page.waitForTimeout(6000); // 넉넉하게 대기

        const stats = await page.evaluate(() => {
            if (!window.Kuzmo) return { error: 'Kuzmo not found' };
            const state = window.Kuzmo.state;
            return {
                indexSize: state.spatialIndex ? state.spatialIndex.all().length : 0,
                eventCount: state.eventStore.length,
                isSpatialAvailable: !!state.spatialIndex,
                visibleMarkers: document.querySelectorAll('.custom-div-icon').length
            };
        });

        console.log('🌳 Optimization Stats:', stats);
        
        if (stats.error) {
            await page.screenshot({ path: 'tests/error_capture.png' });
        }
        
        expect(stats.error).toBeUndefined();
        expect(stats.isSpatialAvailable).toBeTruthy();
    });
});
