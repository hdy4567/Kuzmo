import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { KzmModule } from '@modules/kernel/entities/kzm_kernel_entities';
import { getKzmStrategy } from './logic/kzm_filter_strategy';

/**
 * 🛰️ KzmTopFilterRenderer (v6.6 - Sovereign Shelf with Kinetic Slide)
 * ========================================================
 */
export class KzmTopFilterRenderer implements KzmModule {
  public id = 'top-filter-shelf';
  public isSyncMode = true;
  public isVisible = false;

  private container: HTMLElement | null = null;
  private currentRegion: 'KR' | 'JP' | 'MEMO' = 'KR';

  private static readonly TAG_MAP: Record<string, string[]> = {
    'KR': ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Ulsan', 'Gyeonggi', 'Gangwon', 'Jeju', 'Gyeongsang', 'Jeolla', 'Chungcheong', 'Dokdo', 'Ulleungdo'],
    'JP': [
      'Hokkaido', 'Aomori', 'Iwate', 'Miyagi', 'Akita', 'Yamagata', 'Fukushima',
      'Ibaraki', 'Tochigi', 'Gunma', 'Saitama', 'Chiba', 'Tokyo', 'Kanagawa',
      'Niigata', 'Toyama', 'Ishikawa', 'Fukui', 'Yamanashi', 'Nagano', 'Gifu',
      'Shizuoka', 'Aichi', 'Nagoya', 'Mie', 'Shiga', 'Kyoto', 'Osaka', 'Hyogo',
      'Nara', 'Wakayama', 'Tottori', 'Shimane', 'Okayama', 'Hiroshima', 'Yamaguchi',
      'Tokushima', 'Kagawa', 'Ehime', 'Kochi', 'Fukuoka', 'Saga', 'Nagasaki',
      'Kumamoto', 'Oita', 'Miyazaki', 'Kagoshima', 'Okinawa'
    ],
    'MEMO': ['불꽃놀이', '전통축제', '음식', '기념', '#Daily', '#Trip', '#Night']
  };

  private activeTag: string | null = null;
  private scrollX: number = 0;
  private isDragging: number = 0;
  private startX: number = 0;
  private velocity: number = 0;

  public mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = this.id;
    this.container.className = 'top-panel-container hidden';
    $broker.registerSync(this.id as any, 'TOP_NAV', this.container, '@modules/ui/design-system/kzm_core.css');
    parent.appendChild(this.container);

    // 🛰️ [OBSERVER-START] Listen for memory updates to sync tags
    $broker.on('TAGS_SYNC_REQUEST', () => this.refreshDynamicTags());
    $broker.on('MEMO_DATA_CHANGED', () => this.refreshDynamicTags());

    this.render();
    this.bindEvents();
  }

  private async refreshDynamicTags(): Promise<void> {
    const { $packetKuzmo } = await import('@modules/memo/db/kzm_packet_kuzmo');
    const records = $packetKuzmo.getPacketList('ALL');

    // 🧬 [TAG-GENOMIC-EXTRACT] Extract unique tags from all memos
    const memoTags = new Set<string>(['불꽃놀이', '전통축제', '음식', '기념']); // Default
    records.forEach(r => {
      if (r.tags) r.tags.forEach(t => memoTags.add(t));
    });

    KzmTopFilterRenderer.TAG_MAP['MEMO'] = Array.from(memoTags);
    if (this.currentRegion === 'MEMO') this.render();
  }

  public render(): void {
    if (!this.container) return;
    const tags = KzmTopFilterRenderer.TAG_MAP[this.currentRegion] || [];
    const displayTags = [...tags, ...tags, ...tags];

    this.container.innerHTML = `
      <div class="sovereign-filter-shelf">
          <div class="shelf-tier tier-search-main">
              <div class="naver-search-bar">
                  <div class="search-gradient-icon">🔍</div>
                  <input type="text" placeholder="Search Kuzmo Memories..." class="naver-input" />
              </div>
          </div>

          <div class="shelf-tier tier-smart-nav">
              <div class="nav-segment-control">
                  <button class="nav-tab ${this.currentRegion === 'MEMO' ? 'active' : ''}" data-region="MEMO">MEMO++</button>
                  <button class="nav-tab ${this.currentRegion === 'KR' ? 'active' : ''}" data-region="KR">KOREA</button>
                  <button class="nav-tab ${this.currentRegion === 'JP' ? 'active' : ''}" data-region="JP">JAPAN</button>
              </div>
          </div>

          <!-- 🏷️ Tier 3: INFINITE HORIZONTAL CORRIDOR -->
          <!-- // 태그 담는 공간: 서비스 전체에서 사용되는 지역 및 메모 태그의 마스터 맵 -->
          <!-- @reason SSOT(Single Source of Truth) 원칙에 따라 UI에서 보여줄 태그 리스트를 중앙 관리 -->
          <style>
            .shelf-tier { user-select: none; -webkit-user-select: none; }
            .shelf-tier.tier-tag-corridor { transition: opacity 0.4s ease, transform 0.4s ease; opacity: 1; transform: translateY(0); }
            .shelf-tier.tier-tag-corridor.hidden { opacity: 0; transform: translateY(-10px); pointer-events: none; }
            .naver-input { user-select: text !important; -webkit-user-select: text !important; }
            .corridor-pill.active { 
                background: #9D50FF !important; 
                color: #fff !important; 
                box-shadow: 0 0 15px rgba(157, 80, 255, 0.8), 0 0 30px rgba(157, 80, 255, 0.4);
                border-color: #9D50FF !important;
                transform: translateY(-2px);
            }
          </style>
          <div class="shelf-tier tier-tag-corridor">
              <div class="tag-container-luxe">
                  <div class="tag-view-port">
                      <div class="tag-rail" id="tag-rail">
                          ${displayTags.map(tag => `
                              <span class="corridor-pill ${tag === this.activeTag ? 'active' : ''}" data-tag="${tag}">${tag}</span>
                          `).join('')}
                      </div>
                  </div>
              </div>
          </div>
      </div>
    `;
    this.scrollX = 0;
    this.updateRail();
  }

  private updateRail(): void {
    const rail = this.container?.querySelector('#tag-rail') as HTMLElement;
    if (rail) { rail.style.transform = `translateX(${this.scrollX}px)`; }
  }

  public show(): void {
    this.isVisible = true;
    this.container?.classList.remove('hidden');
    this.container?.classList.add('shelf-active');
  }

  public hide(): void {
    this.isVisible = false;
    this.container?.classList.add('hidden');
  }

  private bindEvents(): void {
    if (!this.container) return;

    this.container.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.tier-tag-corridor')) {
        this.isDragging = 1;
        this.startX = e.pageX - this.scrollX;
        this.velocity = 0;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging === 0) return;
      this.isDragging = 2;
      const targetX = e.pageX - this.startX;
      this.velocity = targetX - this.scrollX;
      this.scrollX = targetX;

      const rail = this.container?.querySelector('#tag-rail') as HTMLElement;
      if (rail) {
        const w = rail.offsetWidth / 3;
        if (this.scrollX < -w * 2) this.scrollX += w;
        if (this.scrollX > 0) this.scrollX -= w;
      }
      this.updateRail();
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging === 2) { this.applyInertia(); }
      this.isDragging = 0;
    });

    this.container.addEventListener('click', (e) => {
      if (this.isDragging === 2) return;
      const target = e.target as HTMLElement;

      if (target.classList.contains('nav-tab')) {
        this.currentRegion = target.dataset.region as any;
        this.activeTag = null;
        this.render();
        $broker.emit('COUNTRY_CHANGED', { country: this.currentRegion });
        if (this.currentRegion === 'MEMO') { this.handleQuickMemo(); }
      }

      if (target.classList.contains('corridor-pill')) {
        const tag = target.dataset.tag || "";
        const normalizedTag = tag.toLowerCase();
        const currentActiveNormalized = (this.activeTag || "").toLowerCase();
        const strategy = getKzmStrategy(this.currentRegion);

        if (currentActiveNormalized === normalizedTag) {
          this.activeTag = null;
          $broker.emit('FILTER_CHANGED', { region: this.currentRegion, tag: null, strategy });
          $broker.emit('REGION_RESET', { country: this.currentRegion });
        } else {
          this.activeTag = tag; // Preserve original case for Geo-Sync
          $broker.emit('FILTER_CHANGED', { region: this.currentRegion, tag: this.activeTag, strategy });
        }

        this.syncLiteEffect(this.activeTag);
      }
    });

    this.container.querySelector('.naver-input')?.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value;
      $broker.emit('FILTER_SEARCH', { query });
    });

    // ⚡ [QUICK-SYNC] Intercept new memo creation to trigger tag sync
    $broker.on('MEMORY_CREATED', () => this.refreshDynamicTags());

    // 🏮 [MINIMAL-ESC] Reset Chips on Global Dismiss
    $broker.on('UI_GLOBAL_DISMISS', () => {
      this.activeTag = null;
      this.syncLiteEffect(null);
    });

    $broker.on('REGION_FOCUSED', (data: any) => {
      const regionName = data.name || "";
      const country = data.country;

      // 1. Sync Region Tab if mismatch
      if (country && country !== this.currentRegion && country !== 'MEMO') {
        this.currentRegion = country;
        this.activeTag = regionName;
        this.render();
        return;
      }

      // 2. [LITE-SYNC] Glow -> Chip Lighting
      this.activeTag = regionName;
      this.syncLiteEffect(regionName);

      // 🛰️ [AUTO-PILOT-SLIDE] Focus the chip in the tag corridor
      const rail = this.container?.querySelector('#tag-rail') as HTMLElement;
      const viewPort = this.container?.querySelector('.tag-view-port') as HTMLElement;
      const allPills = this.container?.querySelectorAll('.corridor-pill');

      if (rail && viewPort && allPills) {
        // Find the pill in the center segment of the 3x infinite rail
        const middleSegmentPills = Array.from(allPills).slice(allPills.length / 3, (allPills.length / 3) * 2);
        const targetPill = middleSegmentPills.find(p => (p as HTMLElement).dataset.tag?.toLowerCase() === regionName.toLowerCase()) as HTMLElement;

        if (targetPill) {
          const centerPos = (viewPort.offsetWidth / 2) - targetPill.offsetLeft - (targetPill.offsetWidth / 2);
          this.scrollX = centerPos;
          this.velocity = 0; // Stop any existing kinetic movement
          this.updateRail();
        }
      }
    });

    this.container.addEventListener('wheel', (e) => {
      const corridor = (e.target as HTMLElement).closest('.tier-tag-corridor');
      if (!corridor) return;
      e.preventDefault();
      const delta = e.deltaY || e.deltaX;
      this.velocity += delta * -0.15;

      const rail = this.container?.querySelector('#tag-rail') as HTMLElement;
      if (rail) {
        const w = rail.offsetWidth / 3;
        if (this.scrollX < -w * 2) this.scrollX += w;
        if (this.scrollX > 0) this.scrollX -= w;
      }
      this.updateRail();
      if (!this.isAnimating) { this.isAnimating = true; this.applyInertia(); }
    }, { passive: false });
  }

  private isAnimating = false;
  private applyInertia(): void {
    if (Math.abs(this.velocity) < 0.2) { this.isAnimating = false; this.velocity = 0; return; }
    this.scrollX += this.velocity;
    this.velocity *= 0.7;
    const rail = document.getElementById('tag-rail');
    if (rail) {
      const w = rail.offsetWidth / 3;
      if (this.scrollX < -w * 2) this.scrollX += w;
      if (this.scrollX > 0) this.scrollX -= w;
    }
    this.updateRail();
    requestAnimationFrame(() => this.applyInertia());
  }

  private async handleQuickMemo(): Promise<void> {
    import('@modules/map/kzm_map_engine').then(async ({ $map }) => {
      await $map.handleQuickCreate();
    });
  }

  /**
   * 💡 [LITE-ENGINE] Unified chip 점등 FX 관리 (Fuzzy + KR Alias)
   */
  private syncLiteEffect(tagName: string | null): void {
    if (!tagName) {
      this.container?.querySelectorAll('.corridor-pill').forEach(p => p.classList.remove('active'));
      return;
    }

    const normalizedTarget = tagName.toLowerCase();
    const pills = this.container?.querySelectorAll('.corridor-pill') || [];

    // 📝 [KR-ALIAS] Minimal mapping for English-Korean bridge
    const krMap: Record<string, string> = {
      'seoul': '서울', 'busan': '부산', 'incheon': '인천', 'daegu': '대구',
      'ulsan': '울산', 'gyeonggi': '경기', 'gangwon': '강원', 'jeju': '제주',
      'gyeongsang': '경상', 'jeolla': '전라', 'chungcheong': '충청'
    };

    pills.forEach(p => {
      const pTag = ((p as HTMLElement).dataset.tag || "").toLowerCase();
      const krAlias = krMap[pTag] || '';

      // 🎯 [MULTI-STRATEGY] Match by English Fuzzy OR Korean Alias
      const isMatch = pTag.includes(normalizedTarget) || normalizedTarget.includes(pTag) ||
        (krAlias && normalizedTarget.includes(krAlias));

      p.classList.toggle('active', !!isMatch);
    });
  }
}
