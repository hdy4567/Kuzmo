import L from 'leaflet';
import 'leaflet.markercluster';
import { Kzm } from '../domain/kzm_entities';
import { $store } from '../store/kzm_store';
import { KzmMapPainter } from './kzm_map_painter';
import './kzm_map_styles.css';

/**
 * 🗺️ KzmMapEngine (v2.4 - Modularized)
 * =========================  
 * Clean Map Interaction Layer with Unified Rendering.
 */
export class KzmMapEngine {
  private static instance: KzmMapEngine;
  public map: L.Map | null = null;
  private markers: Map<string, L.Marker> = new Map();
  private selectionBox: L.Rectangle | null = null;
  private clusterGroup: L.MarkerClusterGroup | null = null;
  private edgeLayer: L.LayerGroup | null = null;

  private visibilityFlags = { tourist: true, memory: true };
  private activeQuery: { category?: string, tag?: string, search?: string } = { category: 'ALL' };

  private constructor() {
    console.log("🗺️ Map Engine Operational.");
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

    $store.subscribe((event: string) => {
      if (event === 'SELECTION_CHANGED') this.updateMarkerHighlights();
      else this.refreshMarkers();
    });

    setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 150);
    this.refreshMarkers();
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

  public createAt(latlng: L.LatLng): void {
    const newRecord = $store.createRecord({
      title: '새로운 핀',
      coord: latlng,
      region: 'Seoul',
      category: 'MEMO',
      tags: ['@핀']
    });
    window.dispatchEvent(new CustomEvent('kzm-view-detail', { detail: { id: newRecord.id } }));
  }

  public filterVisibility(flags: { showTourist: boolean, showMemory: boolean }): void {
    this.visibilityFlags.tourist = flags.showTourist;
    this.visibilityFlags.memory = flags.showMemory;
    this.refreshMarkers();
  }

  public filter(query: { category?: string, tag?: string, search?: string }): void {
    this.activeQuery = { ...this.activeQuery, ...query };
    this.refreshMarkers();
  }

  private refreshMarkers(): void {
    if (!this.clusterGroup || !this.edgeLayer) return;

    this.clusterGroup.clearLayers();
    this.edgeLayer.clearLayers();
    this.markers.clear();

    const query = this.activeQuery;
    const filtered = $store.records.filter((r: Kzm.Record) => {
      let match = true;
      const isTourist = r.category !== 'MEMO';
      if (isTourist && !this.visibilityFlags.tourist) return false;
      if (!isTourist && !this.visibilityFlags.memory) return false;
      
      if (query.category && query.category !== 'ALL') {
        if (query.category === 'MEMO') match = r.category === 'MEMO';
        else if (query.category === 'KR' || query.category === 'JP') match = r.region === query.category;
      }
      
      if (query.tag) {
        const queryTags = Array.isArray(query.tag) ? query.tag : (query.tag as string).split(',');
        match = match && queryTags.some(t => r.tags.includes(t));
      }
      
      if (query.search) match = match && r.title.toLowerCase().includes(query.search.toLowerCase());
      return match;
    });

    filtered.forEach((r: Kzm.Record) => {
      const color = r.category === 'MEMO' ? 'var(--kzm-primary)' : '#9d50bb';
      const marker = L.marker([r.coord.lat, r.coord.lng], {
        draggable: true,
        icon: L.divIcon({
          html: `<div class="kzm-marker-icon" style="border-color:${color}"><div class="kzm-marker-dot"></div></div>`,
          className: 'kzm-marker', iconSize: [32, 32]
        })
      });
      
      marker.on('dragend', (e) => {
        const newPos = (e.target as L.Marker).getLatLng();
        $store.updateRecord(r.id, { coord: newPos });
        console.log(`📍 Relocated [${r.id}] to [${newPos.lat}, ${newPos.lng}]`);
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        window.dispatchEvent(new CustomEvent('kzm-view-detail', { detail: { id: r.id } }));
      });
      
      this.clusterGroup!.addLayer(marker);
      this.markers.set(r.id, marker);
    });

    this.drawGraphEdges();
    this.updateMarkerHighlights();
  }

  private updateMarkerHighlights(): void {
    const selected = $store.selectedIds;
    this.markers.forEach((marker, id) => {
      const iconEl = marker.getElement();
      if (iconEl) {
        if (selected.has(id)) iconEl.classList.add('selected');
        else iconEl.classList.remove('selected');
      }
    });
  }

  private performSelection(bounds: L.LatLngBounds): void {
    const ids: string[] = [];
    this.markers.forEach((m: L.Marker, id: string) => { if (bounds.contains(m.getLatLng())) ids.push(id); });
    $store.setSelection(ids);
  }

  private drawGraphEdges(): void {
    if (!this.edgeLayer) return;
    KzmMapPainter.drawGraph(this.edgeLayer, $store.records, $store.graph.edges);
  }

  public getMarkerElement(id: string): HTMLElement | null {
    const marker = this.markers.get(id);
    return marker ? (marker.getElement() as HTMLElement) : null;
  }
}

export const $map = KzmMapEngine.get();
