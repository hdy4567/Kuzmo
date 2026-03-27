import L from 'leaflet';
import 'leaflet.markercluster';
import { Kzm } from '../domain/kzm_entities';
import { $store } from '../store/kzm_store';
import { KzmMapPainter } from './kzm_map_painter';
import { KzmSpatialSearchService } from './services/kzm_spatial_search_service';
import { KzmMarkerHandler } from './handlers/kzm_marker_handler';
import './kzm_map_styles.css';

/**
 * 🗺️ KzmMapEngine (v4.0 - Clean Orchestrator)
 * ========================================
 * High-Performance Viewport Windowing & UI Orchestration.
 * Powered by KzmSpatialSearchService and KzmMarkerHandler.
 */
export class KzmMapEngine {
  private static instance: KzmMapEngine;
  public map: L.Map | null = null;
  
  private clusterGroup: L.MarkerClusterGroup | null = null;
  private edgeLayer: L.LayerGroup | null = null;
  private selectionBox: L.Rectangle | null = null;

  // 🧱 [INTERNAL-MODULES] Architecture Splitting
  private spatialService = new KzmSpatialSearchService();
  private markerHandler = new KzmMarkerHandler();

  private visibilityFlags = { tourist: true, memory: true };
  private activeQuery: { category?: string, tag?: string, search?: string } = { category: 'ALL' };

  private constructor() {
    console.log("🗺️ Map Engine Operational - Orchestrator mode.");
  }

  static get(): KzmMapEngine {
    if (!KzmMapEngine.instance) KzmMapEngine.instance = new KzmMapEngine();
    return KzmMapEngine.instance;
  }

  public init(containerId: string): void {
    if (this.map) return;

    this.map = L.map(containerId, {
      zoomControl: false,
      attributionControl: false
    }).setView([37.5665, 126.9780], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.clusterGroup = L.markerClusterGroup({
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div class="kzm-cluster-icon">${count}</div>`,
          className: 'custom-cluster',
          iconSize: [40, 40]
        });
      }
    });

    this.map.addLayer(this.clusterGroup);
    this.edgeLayer = L.layerGroup().addTo(this.map);

    this.setupMapEvents();

    // 🏗️ Global Subscription (KzmStore)
    $store.subscribe((event: string) => {
      if (event === 'SELECTION_CHANGED') this.markerHandler.updateHighlights($store.selectedIds);
      else if (event === 'RECORDS_UPDATED') {
          this.spatialService.rebuildIndex($store.records);
          this.refreshAll();
      }
      else this.refreshAll();
    });

    this.map.on('moveend', () => this.refreshAll());
    this.map.on('zoomend', () => this.refreshAll());

    setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 150);
    this.spatialService.rebuildIndex($store.records);
    this.refreshAll();
  }

  private setupMapEvents(): void {
    if (!this.map) return;
    let startCoord: L.LatLng | null = null;

    this.map.on('mousedown', (e: any) => {
      if (e.originalEvent.altKey) {
        startCoord = e.latlng;
        e.originalEvent.preventDefault();
        (this.map as any).dragging.disable();
        if (this.selectionBox) this.selectionBox.remove();
        if (startCoord) {
          this.selectionBox = L.rectangle([[startCoord.lat, startCoord.lng], [startCoord.lat, startCoord.lng]], {
              color: '#9D50FF', weight: 2, fillOpacity: 0.15, fillColor: '#9D50FF'
          }).addTo(this.map!);
        }
      }
    });

    this.map.on('mousemove', (e: any) => {
      if (startCoord && this.selectionBox) this.selectionBox.setBounds([startCoord, e.latlng]);
    });

    this.map.on('mouseup', () => {
      if (this.selectionBox) {
        this.performSelection(this.selectionBox.getBounds());
        this.selectionBox.remove();
        this.selectionBox = null;
        startCoord = null;
        (this.map as any).dragging.enable();
      }
    });

    this.map.on('click', () => $store.clearSelection());
    this.map.on('contextmenu', (e: any) => this.createAt(e.latlng));
  }

  /**
   * 🧼 [ORCHESTRATION] Refresh all visual layers on the map.
   */
  public refreshAll(): void {
    if (!this.map || !this.clusterGroup || !this.edgeLayer) return;

    const bounds = this.map.getBounds();
    const viewportInboundIds = this.spatialService.getViewportInboundIds(bounds);

    const query = this.activeQuery;
    const finalFiltered = $store.records.filter((r: Kzm.Record) => {
      // 1. Viewport filter (RBush)
      if (!viewportInboundIds.has(r.id)) return false;

      // 2. Metadata & Visibility filters
      const isTourist = r.category !== 'MEMO';
      if (isTourist && !this.visibilityFlags.tourist) return false;
      if (!isTourist && !this.visibilityFlags.memory) return false;
      
      if (query.category && query.category !== 'ALL') {
        if (query.category === 'MEMO' && r.category !== 'MEMO') return false;
        else if ((query.category === 'KR' || query.category === 'JP') && r.region !== query.category) return false;
      }
      
      if (query.tag) {
        const queryTags = Array.isArray(query.tag) ? query.tag : (query.tag as string).split(',');
        if (!queryTags.some(t => r.tags.includes(t))) return false;
      }
      
      if (query.search && !r.title.toLowerCase().includes(query.search.toLowerCase())) return false;
      
      return true;
    });

    // 📍 Marker Delegate
    this.markerHandler.refreshMarkers(finalFiltered, this.clusterGroup, (id: string) => {
        window.dispatchEvent(new CustomEvent('kzm-view-detail', { detail: { id } }));
    });

    this.edgeLayer.clearLayers();
    this.drawGraphEdges();
    this.markerHandler.updateHighlights($store.selectedIds);
  }

  public createAt(latlng: L.LatLng): void {
    const newRecord = $store.createRecord({
      title: '새로운 핀',
      coord: latlng,
      category: 'MEMO',
      region: 'Seoul',
      tags: ['@핀']
    });
    window.dispatchEvent(new CustomEvent('kzm-view-detail', { detail: { id: newRecord.id } }));
  }

  public filterVisibility(flags: { showTourist: boolean, showMemory: boolean }): void {
    this.visibilityFlags.tourist = flags.showTourist;
    this.visibilityFlags.memory = flags.showMemory;
    this.refreshAll();
  }

  public filter(query: { category?: string, tag?: string, search?: string }): void {
    this.activeQuery = { ...this.activeQuery, ...query };
    this.refreshAll();
  }

  private performSelection(bounds: L.LatLngBounds): void {
    const ids = this.markerHandler.getIdsInBounds(bounds);
    $store.setSelection(ids);
  }

  private drawGraphEdges(): void {
    if (!this.edgeLayer) return;
    KzmMapPainter.drawGraph(this.edgeLayer, $store.records, $store.graph.edges);
  }

  public drawConstellation(targetRecords: Kzm.Record[]): void {
    if (!this.edgeLayer) return;
    this.edgeLayer.clearLayers();
    KzmMapPainter.drawGraph(this.edgeLayer, $store.records, $store.graph.edges);
    KzmMapPainter.drawConstellation(this.edgeLayer, targetRecords);
  }

  public getMarkerElement(id: string): HTMLElement | null {
    return this.markerHandler.getMarkerElement(id);
  }
}

export const $map = KzmMapEngine.get();
