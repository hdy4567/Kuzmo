import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './kzm_map_engine_styles.css';
import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $store } from '@modules/kernel/persistence/kzm_kernel_store';
import { $packetKuzmo } from '@modules/memo/db/kzm_packet_kuzmo';
import { $log } from '@modules/kernel/logic/kzm_kernel_logger';
import { KzmModule } from '@modules/kernel/entities/kzm_kernel_entities';
import { Kzm } from '@kzm/modules/memo/db/kzm_memo_entities';
import { KzmConchMarkerRenderer } from './renderers/kzm_conch_marker_renderer';
import { KzmConstellationRenderer } from './renderers/kzm_constellation_renderer';
import { KzmGeohashEngine } from '@modules/memo/logic/kzm_geohash_engine';
import { $lasso } from '@modules/ui/logic/kzm_lasso_engine';
import { $geo } from './services/kzm_geo_service';

/**
 * [MAP-SOVEREIGN] KzmMapEngine (v12.0 - Unified Sovereign Module)
 * ========================================================
 * Role: Principal Geo-Spatial Engine (Unified Restoration).
 * Spec: Based on Technical Documentation (OSM + Invert Filter).
 * Features: ClickHandler, LassoHandler, Cluster Support integrated.
 */
export class KzmMapEngine implements KzmModule {
  private static instance: KzmMapEngine;
  public id = 'map-canvas-root';
  public isSyncMode = true;
  public isVisible = true;

  private container: HTMLElement | null = null;
  private map: L.Map | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private lassoLayer: L.FeatureGroup = L.featureGroup();
  private markerLayer: L.FeatureGroup = L.featureGroup();
  private activeRegionLayer: L.FeatureGroup = L.featureGroup();
  private preventNextClick = false; // 🛡️ [GLOW-GUARD] Prevent accidental focus after Drag/Lasso
  private currentTagFilter: string | null = null;
  private conchRenderer = new KzmConchMarkerRenderer();
  private constellation = new KzmConstellationRenderer();

  private constructor() { }

  public static get(): KzmMapEngine {
    if (!KzmMapEngine.instance) KzmMapEngine.instance = new KzmMapEngine();
    return KzmMapEngine.instance;
  }

  public mount(parent: HTMLElement): void {
    try {
      this.container = document.createElement('div');
      this.container.id = this.id;
      this.container.className = 'kzm-map-sovereign';
      this.container.style.width = '100%';
      this.container.style.height = '100%';
      this.container.style.position = 'absolute';
      this.container.style.top = '0';
      this.container.style.left = '0';
      this.container.style.zIndex = '0'; // 🛡️ Base Layer Sovereign

      $broker.registerSync(this.id as any, 'MAP', this.container);
      parent.appendChild(this.container);

      // 🗺️ Initialize Leaflet with [ELASTIC-SOVEREIGN] Smoothness Parameters
      this.map = L.map(this.container, {
        center: [37.5665, 126.9780],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,

        // 🚀 Premium Smoothness Pack
        inertia: true,
        inertiaDeceleration: 3000,
        inertiaMaxSpeed: 1500,
        easeLinearity: 0.2,
        zoomSnap: 0, // Infinite smooth zoom
        zoomDelta: 0.1,
        wheelPxPerZoomLevel: 100,
        wheelDebounceTime: 40
      });

      // 🛡️ DOCUMENTATION RESTORATION: Use Standard OSM (Light) as Base
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(this.map);

      this.lassoLayer.addTo(this.map);
      this.markerLayer.addTo(this.map);
      this.initResizeObserver();
      this.bindInternalEvents();
      this.initRegionLayer('KR'); // Default load KR
      this.conchRenderer.attach(this.markerLayer); // 🐚 Conch Renderer Attached to a managed group
      this.constellation.attach(this.map); // ✨ Constellation Logic (Lines) Attached
      this.renderMarkers(); // 📍 실제 맵에 마커(데이터) 그리기

      // 🚀 [LAYOUT-GUARD] Force redraw sequence after styles settle
      setTimeout(() => this.map?.invalidateSize(), 150);
      setTimeout(() => this.map?.invalidateSize(), 500);
      setTimeout(() => this.map?.invalidateSize(), 1500);

      $log.log('INFO', 'MAP_ENGINE', 'Unified Sovereign Engine (v12.5) ONLINE.');

      // 🚀 [SOVEREIGN-HEARTBEAT] Map no longer waits for Shell permission.
      // Every 5 seconds, it will force audit the spatial state and re-render if needed.
      setInterval(() => {
        if (this.isVisible) {
          $log.log('INFO', 'MAP_ENGINE', '[AUTONOMOUS_AUDIT] Direct Store Binding Check.');
          this.renderMarkers();
        }
      }, 5000);

      // 📍 [SMART-SYNC] Check if store is already ready or wait for signal
      if ($store.isReady) {
        $log.log('INFO', 'MAP_ENGINE', 'Store already ready. Flushing markers.');
        this.renderMarkers();
      } else {
        $store.subscribe('STORE_READY', () => this.renderMarkers());
      }

      setTimeout(() => this.renderMarkers(), 1500);
    } catch (error) {
      $log.log('FATAL', 'MAP_ENGINE', 'Map Initialization Failed', { error });
    }
  }

  private bindInternalEvents(): void {
    if (!this.map) return;

    $store.subscribe('RECORD_ADDED', () => this.renderMarkers());
    $store.subscribe('RECORD_UPDATED', () => this.renderMarkers());
    $store.subscribe('RECORD_DELETED', () => this.renderMarkers());

    // 🛡️ [LAYER-CONTROL] Sync with Side Dock checkboxes
    $broker.on('MAP_LAYER_TOGGLE', (data: any) => {
      if (data.type === 'MEMO') {
        this.conchRenderer.setVisible(data.visible);
      }
      if (data.type === 'CONSTELLATION') {
        // Future constellation logic can be toggled here
      }
    });

    // 1. Click & ContextMenu Handlers
    this.map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      L.DomEvent.preventDefault(e.originalEvent);
      // 🚀 Consolidated Creation Logic (Right-Click)
      this.handleQuickCreate(e.latlng.lat, e.latlng.lng);
    });

    this.map.on('boxzoomend', (e: any) => {
      if (e.boxZoomBounds) {
        this.performLassoSelection(e.boxZoomBounds);
      }
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      // 🛠️ Sovereignty Fix: Do not dismiss UI if modifier keys are held (Lasso/Plus mode)
      if (e.originalEvent.shiftKey || e.originalEvent.altKey) return;

      $broker.emit('MAP_CLICKED', { latlng: e.latlng });
      $broker.emit('UI_GLOBAL_DISMISS', {});

      // Manual Selection Clear
      $store.selectedIds.clear();
      $store.notify('SELECTION_CHANGED');
    });

    // 2. [LASSO-ENGINE-INTEGRATION]
    if (this.container) {
      $lasso.attach(this.container, (rect) => {
        if (!this.map) return;
        const nw = this.map.containerPointToLatLng([rect.left, rect.top]);
        const se = this.map.containerPointToLatLng([rect.right, rect.bottom]);
        this.performLassoSelection(L.latLngBounds(nw, se));
      });
    }

    // 3. Broker Channel Sync
    $broker.on('MAP_MOVE_TO', (data: any) => {
      this.map?.flyTo([data.lat, data.lng], data.zoom || 15);
    });

    $broker.on('DISCOVERY_STREAM_UPDATE', (data: any) => {
      this.currentTagFilter = data.activeTag || null;
      const strategy = data.strategy;

      // 🧹 [STRATEGY-EFFECT] Clear regional highlights
      if (strategy?.effects.forceClearRegionFocus || !this.currentTagFilter) {
        this.clearRegionFocus();
      }

      // 🌌 [STRATEGY-EFFECT] Stigmata Mode (MEMO++ only)
      if (this.currentTagFilter && strategy?.effects.useStigmataDimming) {
        this.container?.classList.add('kzm-fx-mode-stigmata');
      } else {
        this.container?.classList.remove('kzm-fx-mode-stigmata');
      }

      // 🎯 [WARP-SYNC] Robust Warp Logic (Legacy Fallback + Strategy)
      const isFilterEvent = data.source === 'FILTER_CHANGED';
      const regionName = data.payload?.tag || data.activeTag;
      const targetCountry = strategy?.category || data.payload?.region;

      if (isFilterEvent && regionName && targetCountry && targetCountry !== 'MEMO') {
        // Only warp if it's a regional tab or specifically requested by strategy
        if (strategy?.effects.autoWarpToLocation || (!strategy && (targetCountry === 'KR' || targetCountry === 'JP'))) {
          this.warpToRegion(targetCountry as any, regionName);
        }
      }

      this.renderMarkers();
    });

    $broker.on('LASSO_START', () => { this.preventNextClick = true; });
    $broker.on('LASSO_END', () => {
      setTimeout(() => { this.preventNextClick = false; }, 200);
    });

    $broker.on('COUNTRY_CHANGED', (data: any) => {
      if (data.country === 'KR' || data.country === 'JP') {
        this.initRegionLayer(data.country);
      }
    });

    $broker.on('REGION_RESET', () => this.clearRegionFocus());

    // 🏮 [MINIMAL-ESC] Clear Glow on Global Dismiss
    $broker.on('UI_GLOBAL_DISMISS', () => this.clearRegionFocus());

    // 4. [LASSO-INTERACTION-GUARD]
    $broker.on('LASSO_START', () => this.map?.dragging.disable());
    $broker.on('LASSO_END', () => this.map?.dragging.enable());

    // 🚀 [AGGRESSIVE-ZOOM] Ctrl + Scroll for higher delta zoom out/in as per Spec
    this.container?.addEventListener('wheel', (e) => {
      if (e.ctrlKey && this.map) {
        e.preventDefault();
        const currentZoom = this.map.getZoom();
        const delta = e.deltaY < 0 ? 0.56 : -0.56; // Adjusted: -30% intensity from original 0.8
        this.map.setZoom(currentZoom + delta, { animate: false });
      }
    }, { passive: false });

    // 🛰️ [MODE-SYNC] Hide map when entering Archive to prevent click bleeding
    $broker.on('UI_MODE_CHANGE', (mode: string) => {
      if (mode === 'ARCHIVE') this.hide();
      else this.show();
    });
  }

  private performLassoSelection(bounds: L.LatLngBounds): void {
    $store.selectedIds.clear(); // 🛡️ [SYNC-SSOT] Clear previous selection before new lasso
    const results: any[] = [];
    $store.records.forEach(r => {
      const latlng = L.latLng(r.geoCoord.geoLat, r.geoCoord.geoLng);
      if (bounds.contains(latlng)) {
        $store.selectedIds.add(r.id);
        results.push(r.id);
      }
    });
    $store.notify('SELECTION_CHANGED'); // 📡 Always notify to sync UI state
  }

  private async renderMarkers(): Promise<void> {
    if (!this.map) return;

    // 🪐 [SYNC-SSOT] Use the same data source as Archive for 100% consistency
    const { $packetKuzmo } = await import('@modules/memo/db/kzm_packet_kuzmo');
    let records = $packetKuzmo.getPacketList('ALL', 'LATEST', this.currentTagFilter || '');

    $log.log('INFO', 'MAP_ENGINE', `Rendering ${records.length} markers to the spatial canvas.`);

    // 🛡️ [CLUSTERING] Apply Geohash grouping for 10k+ points
    const center = this.getCenter();
    // 🛡️ [SCHEMA-SYNC] Explicitly map Leaflet LatLng to Kzm GeoCoord to prevent Geohash Engine failure
    const mapCenter: Kzm.GeoCoord = { geoLat: center.lat, geoLng: center.lng };
    let clusteredRecords = KzmGeohashEngine.cluster(records, mapCenter);

    // 🚑 [FAILSAFE] If clustering results in empty array but raw records exist, use raw
    if (clusteredRecords.length === 0 && records.length > 0) {
      $log.log('WARN', 'MAP_ENGINE', 'Clustering failed. Falling back to RAW rendering.');
      clusteredRecords = records;
    }

    // 🌌 [STIGMATA-DRAW] Send to conch renderer and link them via constellation
    this.conchRenderer.renderRecords(clusteredRecords);

    // 🏮 [DIAGNOSTIC-BEACON] High-contrast red hub to verify layer transparency
    L.circle([37.5665, 126.9780], {
      radius: 100,
      color: '#ff4d4d',
      fillColor: '#ff4d4d',
      fillOpacity: 0.8,
      weight: 5
    }).addTo(this.markerLayer).bindPopup('CORE_VISIBILITY_ANODE_OK');

    if (this.currentTagFilter && clusteredRecords.length > 0) {
      this.constellation.drawLinks(clusteredRecords); // ✨ Connect the dots (Stigmata Mode)
    } else {
      // Normal mode: Standard background constellation (if any)
      // this.constellation.render(); 
    }
  }

  /**
   * 🌟 [CORE-ACTION] Unified Quick Creation
   * Principles: Zero Logic Loss, Multi-entry (Right-click / Top Button)
   */
  public async handleQuickCreate(lat?: number, lng?: number): Promise<void> {
    const center = this.getCenter();
    const targetLat = lat ?? center.lat;
    const targetLng = lng ?? center.lng;

    // 🚀 [UI-SYNC] Open the Creator Popup instead of silent creation
    $broker.emit('UI_MAP_START_MEMORY', {
      latlng: { lat: targetLat, lng: targetLng }
    });
  }

  private initResizeObserver(): void {
    if (!this.container || !this.map) return;
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(this.container);
  }

  public getCenter(): { lat: number; lng: number } {
    if (!this.map) return { lat: 37.5665, lng: 126.9780 };
    const center = this.map.getCenter();
    return { lat: center.lat, lng: center.lng };
  }

  public show(): void {
    if (this.container) {
      this.isVisible = true;
      this.container.classList.remove('hidden');
    }
  }

  public hide(): void {
    if (this.container) {
      this.isVisible = false;
      this.container.classList.add('hidden');
    }
  }

  public invalidateSize(): void {
    this.map?.invalidateSize();
  }

  public unmount(): void {
    this.map?.remove();
    this.container?.remove();
    this.resizeObserver?.disconnect();
  }

  /**
   * [REGION-WARP] Fly to specific region and initiate boundary glow
   */
  public async warpToRegion(country: 'KR' | 'JP' | 'MEMO', regionName: string): Promise<void> {
    if (country === 'MEMO') return;

    // 1. Move the Map
    const coords = $geo.getCoords(regionName);
    if (coords) {
      this.map?.flyTo([coords.lat, coords.lng], 10, {
        animate: true,
        duration: 1.5
      });
    }

    // 2. Load & Glow Boundary
    await this.initRegionLayer(country);

    if (this.activeRegionLayer) {
      const parentRegion = $geo.getParentRegion(regionName);
      this.activeRegionLayer.eachLayer((layer: any) => {
        const props = layer.feature.properties;
        const regionLower = regionName.toLowerCase();
        const parentLower = parentRegion.toLowerCase();

        // 🏮 [MINIMAL-FIX] Check all name-related props to handle multi-lingual GeoJSON
        const isMatch = [props.nam, props.name, props.name_eng, props.NAME_1, props.NAME_LOCAL]
          .some(val => {
            if (!val) return false;
            const v = val.toString().toLowerCase();
            return v.includes(regionLower) || regionLower.includes(v) || v === parentLower;
          });

        if (isMatch) {
          this.focusRegion(layer.feature, layer as L.Path, country);
          const bounds = (layer as any).getBounds();
          if (bounds && bounds.isValid()) this.map?.flyToBounds(bounds, { padding: [100, 100], duration: 1.5 });
        }
      });
    }
  }

  /**
   * [GEOJSON-CORE] Initialize Country-specific Overlays
   */
  private async initRegionLayer(country: 'KR' | 'JP'): Promise<void> {
    if (!this.map) return;

    // Clear existing
    if (this.activeRegionLayer) {
      this.map.removeLayer(this.activeRegionLayer);
    }

    try {
      const data = await $geo.loadRegionGeoJSON(country);
      this.activeRegionLayer = L.geoJSON(data, {
        style: {
          color: 'transparent',
          fillColor: 'transparent',
          fillOpacity: 0
        },
        onEachFeature: (feature: any, layer: L.Layer) => {
          layer.on({
            click: (e: L.LeafletMouseEvent) => {
              if (this.preventNextClick) return; // 🛡️ [GUARD]
              L.DomEvent.stopPropagation(e);
              this.focusRegion(feature, layer as L.Path, country);
            },
            mouseover: () => {
              if (this.preventNextClick) return;
              (layer as L.Path).setStyle({ fillOpacity: 0.3, stroke: true, weight: 1 });
            },
            mouseout: () => {
              (layer as L.Path).setStyle({ fillOpacity: 0, stroke: false });
            }
          });
        }
      }).addTo(this.map);
    } catch (e) {
      $log.log('WARN', 'MAP_ENGINE', `${country} region overlay disabled due to data failure.`);
    }
  }

  /**
   * 🧹 [CLEANUP] Remove all regional focus effects
   */
  public clearRegionFocus(): void {
    this.activeRegionLayer.eachLayer((l: any) => {
      if (l.getElement) {
        const el = l.getElement();
        if (el) {
          el.classList.remove('kzm-region-focus');
          // Force re-sync with normal styles
          l.setStyle({ fillOpacity: 0.1, stroke: false });
        }
      }
    });
  }

  /**
   * 🎯 [SOVEREIGN-FOCUS] Master method for regional glow & label emission
   */
  private focusRegion(feature: any, layer: L.Path, country: string): void {
    const props = feature.properties;
    const rawName = props.nam || props.name || props.name_eng || props.NAME_1 || "Unknown";

    // 💡 [SMART-TOGGLE] If already focused, turn OFF everything.
    const isAlreadyFocused = layer.getElement()?.classList.contains('kzm-region-focus');
    if (isAlreadyFocused) {
      this.clearRegionFocus();
      $broker.emit('REGION_FOCUSED', { name: "", country });
      return;
    }

    // 1. Clear previous focus
    this.clearRegionFocus();

    // 2. High-performance Class Toggle
    if (layer.getElement) {
      layer.getElement()!.classList.add('kzm-region-focus');
    }

    // 3. Emit Label with Icons (KR/JP/📝)
    const label = $geo.getRegionLabel(rawName);

    $broker.emit('UI_TOAST_OPEN', {
      message: label,
      type: 'INFO',
      duration: 3000
    });

    $broker.emit('REGION_FOCUSED', {
      name: rawName,
      label,
      country
    });
    $log.log('INFO', 'MAP_ENGINE', `Region Focused: ${rawName}`);
  }
}

export const $map = KzmMapEngine.get();
