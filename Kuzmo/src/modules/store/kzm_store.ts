import { Kzm } from '../domain/kzm_entities';
import { $tx } from '../sync/kzm_sync_queue';
import { KzmGraphEngine } from './kzm_graph_engine';
import { KzmScorer } from './kzm_scorer';

/**
 * 🛰️ KzmStore (v2.3 - Modularized)
 * =============================
 * Intuitive, observable state for the platform.
 * Unique logic to prevent duplicate processing.
 */
export class KzmStore {
  private static instance: KzmStore;
  
  private _records: Map<string, Kzm.Record> = new Map();
  private _graph: Kzm.KnowledgeGraph = { nodes: [], edges: [] };
  private _selectedIds: Set<string> = new Set();
  private listeners: Set<(event: string) => void> = new Set();

  private constructor() {
    console.log("🎬 Kzm Store Initialized.");
  }

  static get(): KzmStore {
    if (!KzmStore.instance) KzmStore.instance = new KzmStore();
    return KzmStore.instance;
  }

  public createRecord(props: Partial<Kzm.Record> & { coord: Kzm.Coord }): Kzm.Record {
    const { coord, ...rest } = props;
    const newRecord: Kzm.Record = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: '새로운 기록',
      content: '',
      coord: coord,
      region: 'Universal',
      tags: ['@신규'],
      createdAt: Date.now(),
      category: 'MEMO',
      syncStatus: 'DIRTY',
      snippet: '',
      mediaItems: [],
      ...rest
    };
    
    this.addRecord(newRecord);
    return newRecord;
  }

  public addRecord(record: Kzm.Record): void {
    if (this._records.has(record.id)) return;

    const existingNear = this.records.find((r: Kzm.Record) => {
      const dLat = Math.abs(r.coord.lat - record.coord.lat);
      const dLng = Math.abs(r.coord.lng - record.coord.lng);
      return dLat < 0.0009 && dLng < 0.0009; 
    });

    if (existingNear) {
      console.log(`🌀 [MERGE] Record ${record.id} merged into ${existingNear.id}`);
      const mergedContent = `${existingNear.content}\n\n---\n\n${record.content}`;
      this.updateRecord(existingNear.id, { content: mergedContent });
      return;
    }

    const processedRecord = this.autoTag(record);
    this._records.set(processedRecord.id, processedRecord);
    this.refreshGraph();
    this.notify('RECORD_ADDED');
    $tx.submit('CREATE', 'RECORDS', processedRecord);
  }

  public updateRecord(id: string, delta: Partial<Kzm.Record>): void {
    const existing = this._records.get(id);
    if (!existing) return;

    let updated = { ...existing, ...delta };
    if (delta.content || delta.title) updated = this.autoTag(updated);

    this._records.set(id, updated);
    this.refreshGraph();
    this.notify('RECORD_UPDATED');
    $tx.submit('UPDATE', 'RECORDS', updated);
  }

  private autoTag(record: Kzm.Record): Kzm.Record {
    const text = `${record.title} ${record.content}`;
    const tags = new Set(record.tags);
    const atTags = text.match(/@[\w\uAC00-\uD7A3]+/g);
    if (atTags) atTags.forEach((t: string) => tags.add(t));

    const words = text.split(/\s+/).filter(w => w.length >= 2 && !w.startsWith('@'));
    words.forEach(word => {
      for (let i = 0; i < word.length - 1; i++) {
        const bigram = word.substring(i, i + 2);
        if (bigram.length === 2) tags.add(bigram);
      }
    });

    return { ...record, tags: Array.from(tags) };
  }

  public get records(): Kzm.Record[] { return Array.from(this._records.values()); }
  public get selectedIds(): Set<string> { return this._selectedIds; }

  public toggleSelection(id: string): void {
    if (this._selectedIds.has(id)) this._selectedIds.delete(id);
    else this._selectedIds.add(id);
    this.notify('SELECTION_CHANGED');
  }

  public setSelection(ids: string[]): void {
    this._selectedIds = new Set(ids);
    this.notify('SELECTION_CHANGED');
  }

  public clearSelection(): void {
    this._selectedIds.clear();
    this.notify('SELECTION_CHANGED');
  }

  public get allTags(): string[] {
    const tags = new Set<string>();
    this._records.forEach((r: Kzm.Record) => r.tags.forEach((t: string) => tags.add(t)));
    return Array.from(tags).sort();
  }

  public bulkUpdate(records: Kzm.Record[]): void {
    records.forEach((r: Kzm.Record) => this._records.set(r.id, r));
    this.refreshGraph();
    this.notify('BULK_LOADED');
  }

  get graph(): Kzm.KnowledgeGraph { return this._graph; }

  private refreshGraph(): void {
    const nodes = this.records;
    this._graph = {
      nodes: nodes,
      edges: KzmGraphEngine.computeLinks(nodes)
    };
  }

  public subscribe(cb: (event: string) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public query(text: string, type: Kzm.ScorerType = 'SEARCH'): Kzm.Record[] {
    return KzmScorer.query(this.records, text, type);
  }

  private notify(event: string): void {
    this.listeners.forEach(cb => cb(event));
  }
}

export const $store = KzmStore.get();
