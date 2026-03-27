import RBush from 'rbush';
import knn from 'rbush-knn';

// Mock Data
const eventStore = [
    { id: '1', title: 'Seoul 1', lat: 37.5665, lng: 126.9780, tags: ['@Seoul'] },
    { id: '2', title: 'Seoul 2', lat: 37.5670, lng: 126.9790, tags: ['@Seoul'] },
    { id: '3', title: 'Tokyo 1', lat: 35.6762, lng: 139.6503, tags: ['@Tokyo'] },
];

console.log('🌳 Core Logic Test Started...');

// 1. RBush Indexing
const tree = new RBush();
const items = eventStore.map(ev => ({
    minX: ev.lng, minY: ev.lat,
    maxX: ev.lng, maxY: ev.lat,
    id: ev.id
}));
tree.load(items);
console.log('✅ RBush Loaded:', tree.all().length);

// 2. Spatial Query (Windowing Simulation)
const seoulBounds = { minX: 126.977, minY: 37.565, maxX: 126.980, maxY: 37.568 };
const results = tree.search(seoulBounds);
console.log('📍 Spatial Query (Seoul) Results:', results.map(r => r.id));

if (results.length !== 2) {
    console.error('❌ Failed: Expected 2 results for Seoul area, got', results.length);
    process.exit(1);
}

// 3. KNN Search
const nearest = knn(tree, 126.9781, 37.5666, 1);
console.log('🔍 KNN Result (Nearest to Seoul 1):', nearest[0].id);

if (nearest[0].id !== '1') {
    console.error('❌ Failed: Expected Seoul 1 (id: 1) as nearest.');
    process.exit(1);
}

console.log('🎉 All Core Logic Tests Passed!');
