/**
 * 🧪 Kuzmo Multi-Tier Intelligence Scorers (v13.0 Premium)
 * ==============================================================
 * Individualized evaluation for each service's specific goals.
 */

class KuzmoIntelligenceEvaluator {
    constructor() {
        this.dim = 1536; // Gemini Vector Dim
    }

    /** 🎯 [1] SEARCH_SCORER: Precision & Text Alignment */
    evaluateSearch(results, query) {
        if (!results.length) return { score: "0.00", label: "Precision" };
        const q = String(query).toLowerCase();
        
        const keywordMatch = results.filter(r => 
            (r.title || "").toLowerCase().includes(q) || 
            (r.tags && r.tags.some(t => t.toLowerCase().includes(q)))
        ).length;
        
        const precision = (keywordMatch / results.length) * 100;
        return {
            score: precision.toFixed(2),
            label: "Precision"
        };
    }

    /** 📍 [2] MAP_SCORER: Spatial Focus & Gaussian Fidelity */
    evaluateMap(results, viewport) {
        if (!results.length) return { score: "0.00", label: "Fidelity" };
        const center = {
            lat: (viewport.minLat + viewport.maxLat) / 2,
            lng: (viewport.minLng + viewport.maxLng) / 2
        };

        // How well results fit a 0.05 gaussian (central focus)
        const gaussianFidelity = results.reduce((acc, r) => {
            const dist = Math.sqrt(Math.pow(r.lat - center.lat, 2) + Math.pow(r.lng - center.lng, 2));
            return acc + Math.exp(-dist / 0.05); 
        }, 0) / results.length * 100;

        return {
            score: gaussianFidelity.toFixed(2),
            label: "Fidelity"
        };
    }

    /** 💎 [3] AI_SCORER: Semantic Gain & MMR Diversity */
    evaluateAi(results, allVectors) {
        if (results.length < 2) return { score: "0.00", label: "Diversity" };
        
        // Diversity: 1 - Average Pairwise Similarity
        const diversity = (1 - this._avgPairwiseSimilarity(results.map(r => r.vector))) * 100;
        
        const meanAll = this._calculateMean(allVectors);
        const meanRet = this._calculateMean(results.map(r => r.vector));
        const specificity = (1 - this._cosineSimilarity(meanAll, meanRet)) * 100;

        // SIG = Specificity(40%) + Diversity(60%)
        const sig = (specificity * 0.4 + diversity * 0.6);

        return {
            score: sig.toFixed(2),
            label: "SGI"
        };
    }

    /** 🕸️ [4] GRAPH_SCORER: Connectivity & Link Stability */
    evaluateGraph(results) {
        if (results.length < 2) return { score: "0.00", label: "Cohesion" };
        const cohesion = this._avgPairwiseSimilarity(results.map(r => r.vector)) * 100;
        return {
            score: cohesion.toFixed(2),
            label: "Cohesion"
        };
    }

    // --- High-Performance Helpers ---
    _cosineSimilarity(v1, v2) {
        if (!v1 || !v2 || v1.length !== 1536) return 0.5;
        let dot = 0, n1 = 0, n2 = 0;
        for (let i = 0; i < v1.length; i++) {
            dot += v1[i] * v2[i];
            n1 += v1[i] * v1[i];
            n2 += v2[i] * v2[i];
        }
        const mag = Math.sqrt(n1) * Math.sqrt(n2);
        return mag === 0 ? 0.5 : (dot / mag);
    }

    _calculateMean(vectors) {
        if (!vectors.length) return new Array(1536).fill(0);
        const mean = new Array(1536).fill(0);
        vectors.forEach(v => {
            if (v && v.length === 1536) {
                for (let i = 0; i < 1536; i++) mean[i] += v[i];
            }
        });
        return mean.map(v => v / vectors.length);
    }

    _avgPairwiseSimilarity(vectors) {
        if (vectors.length < 2) return 1;
        let sum = 0, count = 0;
        for (let i = 0; i < vectors.length; i++) {
            for (let j = i + 1; j < vectors.length; j++) {
                sum += (this._cosineSimilarity(vectors[i], vectors[j]) || 0.5);
                count++;
            }
        }
        return sum / (count || 1);
    }
}

export default KuzmoIntelligenceEvaluator;
