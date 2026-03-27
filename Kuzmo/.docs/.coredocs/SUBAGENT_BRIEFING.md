# 🛰️ Kuzmo Subagent Briefing (v2.4 Refactor)

## 1. Core Architecture Refactoring
As of 2026-03-27, the Kuzmo platform has undergone a major clean architecture refactoring to maintain performance and modularity.

### 1.1 Store & Scorer Modularization
- **`KzmStore.ts`**: Now focuses purely on state management, reactivity, and record storage. (~150 lines)
- **`KzmScorer.ts`**: Optimized ranking and scoring logic. Handles `SEARCH`, `MAP`, `AI`, and `GRAPH` query types.
- **Why?**: To keep the central store lean and allow for independent scaling of semantic ranking algorithms.

### 1.2 Map Engine & Painter Modularization
- **`KzmMapEngine.ts`**: Focuses on Leaflet initialization, marker lifecycle, and event handling. (~180 lines)
- **`KzmMapPainter.ts`**: Specialized in drawing complex map layers like Knowledge Graph Edges (`drawGraph`).
- **Why?**: Separation of concerns between map state management and visual rendering/painting.

### 1.3 UI Orchestration
- **`KzmUIOrchestrator.ts`**: Coordinates between Map, Locker, and AI side panels. 
- Integrated a **SNS-style Vertical Flow** for detail views and **Infinite Scrolling** (Batch 50) for the Memory Vault.

## 2. Global State & Events
- **Shared Event Bus**: Use `window.dispatchEvent` for UI-to-UI communication (e.g., `kzm-view-detail`).
- **Subscription**: Use `$store.subscribe(cb)` for reacting to data changes but avoid heavy logic in subscribers.

## 3. Directory Structure (Clean Status)
- `/src/modules/store/`: `kzm_store.ts`, `kzm_scorer.ts`, `kzm_graph_engine.ts`
- `/src/modules/map/`: `kzm_map_engine.ts`, `kzm_map_painter.ts`, `kzm_map_styles.css`
- `/src/modules/locker/`: `kzm_locker.ts`, `kzm_detail_sheet.ts`
- `/src/modules/ui/`: `kzm_ui_orchestrator.ts`, `kzm_ui_styles.css`

## 4. Current Blockers (N/A)
- Build Status: Success (tsc checked).
- Lint Status: Clean.
