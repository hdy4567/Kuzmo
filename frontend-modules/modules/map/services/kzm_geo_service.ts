import { $log } from '@modules/kernel/logic/kzm_kernel_logger';
import { DatabaseException } from '@modules/kernel/entities/kzm_kernel_entities';
import krDataUrl from '../db/korea_regions.json?url';
import jpDataUrl from '../db/japan_prefectures.json?url';

/**
 * 🗺️ KzmGeoService (v1.10 - Japan Data Specialist)
 * ========================================================
 * Role: GeoJSON Asset Management & Regional Name Mapping.
 * Spec: Precise Kanji/Kana support for Japanese Prefectures.
 */
export class KzmGeoService {
    private static instance: KzmGeoService;
    private geoCache: Map<string, any> = new Map();

    // Japanese Prefix/Suffix Mapping for Formal Recognition
    private static readonly JP_MAPPING: Record<string, { kanji: string; kana: string }> = {
        "Hokkaido": { kanji: "北海道", kana: "ほっかいどう" },
        "Aomori": { kanji: "青森県", kana: "あおもりけん" },
        "Iwate": { kanji: "岩手県", kana: "いわてけん" },
        "Miyagi": { kanji: "宮城県", kana: "みやぎけん" },
        "Akita": { kanji: "秋田県", kana: "あきたけん" },
        "Yamagata": { kanji: "山形県", kana: "やまがたけん" },
        "Fukushima": { kanji: "福島県", kana: "ふくしまけん" },
        "Ibaraki": { kanji: "茨城県", kana: "いばらきけん" },
        "Tochigi": { kanji: "栃木県", kana: "とちぎけん" },
        "Gunma": { kanji: "群馬県", kana: "ぐんまけん" },
        "Saitama": { kanji: "埼玉県", kana: "さいたまけん" },
        "Chiba": { kanji: "千葉県", kana: "ちばけん" },
        "Tokyo": { kanji: "東京都", kana: "とうきょうと" },
        "Kanagawa": { kanji: "神奈川県", kana: "かながわけん" },
        "Niigata": { kanji: "新潟県", kana: "にいがたけん" },
        "Toyama": { kanji: "富山県", kana: "とやまけん" },
        "Ishikawa": { kanji: "石川県", kana: "いしかわけん" },
        "Fukui": { kanji: "福井県", kana: "ふくいけん" },
        "Yamanashi": { kanji: "山梨県", kana: "やまなしけん" },
        "Nagano": { kanji: "長野県", kana: "ながのけん" },
        "Gifu": { kanji: "岐阜県", kana: "ぎふけん" },
        "Shizuoka": { kanji: "静岡県", kana: "しずおかけん" },
        "Aichi": { kanji: "愛知県", kana: "あいちけん" },
        "Mie": { kanji: "三重県", kana: "みえけん" },
        "Shiga": { kanji: "滋賀県", kana: "しがけん" },
        "Kyoto": { kanji: "京都府", kana: "きょうとふ" },
        "Osaka": { kanji: "大阪府", kana: "おおさかふ" },
        "Hyogo": { kanji: "兵庫県", kana: "ひょうごけん" },
        "Nara": { kanji: "奈良県", kana: "ならけん" },
        "Wakayama": { kanji: "和歌山県", kana: "わかやまけん" },
        "Tottori": { kanji: "鳥取県", kana: "とっとりけん" },
        "Shimane": { kanji: "島根県", kana: "しまねけん" },
        "Okayama": { kanji: "岡山県", kana: "おかやまけん" },
        "Hiroshima": { kanji: "広島県", kana: "ひろしまけん" },
        "Yamaguchi": { kanji: "山口県", kana: "やまぐちけん" },
        "Tokushima": { kanji: "徳島県", kana: "とくしまけん" },
        "Kagawa": { kanji: "香川県", kana: "かがわけん" },
        "Ehime": { kanji: "愛媛県", kana: "えひめけん" },
        "Kochi": { kanji: "高知県", kana: "こうちけん" },
        "Fukuoka": { kanji: "福岡県", kana: "ふくおかけん" },
        "Saga": { kanji: "佐賀県", kana: "さがけん" },
        "Nagasaki": { kanji: "長崎県", kana: "ながさきけん" },
        "Kumamoto": { kanji: "熊本県", kana: "くまもとけん" },
        "Oita": { kanji: "大分県", kana: "おおいたけん" },
        "Miyazaki": { kanji: "宮崎県", kana: "みやざきけん" },
        "Kagoshima": { kanji: "鹿児島県", kana: "かごしまけん" },
        "Okinawa": { kanji: "沖縄県", kana: "おきなわけん" }
    };

    // Regional Center Coordinates for Warp Logic (Full Audit)
    private static readonly REGION_COORDS: Record<string, { lat: number; lng: number }> = {
        // Country Fallbacks
        "KR": { lat: 37.5665, lng: 126.9780 },
        "JP": { lat: 35.6895, lng: 139.6917 },

        // Korea (KR)
        "Seoul": { lat: 37.5665, lng: 126.9780 },
        "Busan": { lat: 35.1796, lng: 129.0756 },
        "Incheon": { lat: 37.4563, lng: 126.7052 },
        "Daegu": { lat: 35.8714, lng: 128.6014 },
        "Ulsan": { lat: 35.5384, lng: 129.3114 },
        "Gyeonggi": { lat: 37.4138, lng: 127.5183 },
        "Gangwon": { lat: 37.8228, lng: 128.1555 },
        "Jeju": { lat: 33.4890, lng: 126.4983 },
        "Gyeongsang": { lat: 35.8714, lng: 128.6014 },
        "Jeolla": { lat: 35.8242, lng: 127.1480 },
        "Chungcheong": { lat: 36.6358, lng: 127.4912 },
        "Dokdo": { lat: 37.2427, lng: 131.8689 },
        "Ulleungdo": { lat: 37.4844, lng: 130.9058 },

        // Japan (JP) - Full 47 Prefectures Capital Cities
        "Hokkaido": { lat: 43.0641, lng: 141.3469 },
        "Aomori": { lat: 40.8244, lng: 140.7400 },
        "Iwate": { lat: 39.7036, lng: 141.1525 },
        "Miyagi": { lat: 38.2682, lng: 140.8694 },
        "Akita": { lat: 39.7186, lng: 140.1025 },
        "Yamagata": { lat: 38.2553, lng: 140.3397 },
        "Fukushima": { lat: 37.7503, lng: 140.4675 },
        "Ibaraki": { lat: 36.3417, lng: 140.4467 },
        "Tochigi": { lat: 36.5658, lng: 139.8836 },
        "Gunma": { lat: 36.3906, lng: 139.0608 },
        "Saitama": { lat: 35.8569, lng: 139.6489 },
        "Chiba": { lat: 35.6047, lng: 140.1231 },
        "Tokyo": { lat: 35.6895, lng: 139.6917 },
        "Kanagawa": { lat: 35.4478, lng: 139.6425 },
        "Niigata": { lat: 37.9022, lng: 139.0236 },
        "Toyama": { lat: 36.6953, lng: 137.2114 },
        "Ishikawa": { lat: 36.5944, lng: 136.6256 },
        "Fukui": { lat: 36.0653, lng: 136.2217 },
        "Yamanashi": { lat: 35.6639, lng: 138.5683 },
        "Nagano": { lat: 36.6514, lng: 138.1811 },
        "Gifu": { lat: 35.4233, lng: 136.7606 },
        "Shizuoka": { lat: 34.9756, lng: 138.3828 },
        "Aichi": { lat: 35.1815, lng: 136.9066 },
        "Nagoya": { lat: 35.1815, lng: 136.9066 },
        "Mie": { lat: 34.7303, lng: 136.5086 },
        "Shiga": { lat: 35.0044, lng: 135.8683 },
        "Kyoto": { lat: 35.0116, lng: 135.7681 },
        "Osaka": { lat: 34.6937, lng: 135.5023 },
        "Hyogo": { lat: 34.6911, lng: 135.1831 },
        "Nara": { lat: 34.6851, lng: 135.8048 },
        "Wakayama": { lat: 34.2261, lng: 135.1675 },
        "Tottori": { lat: 35.5011, lng: 134.2350 },
        "Shimane": { lat: 35.4722, lng: 133.0506 },
        "Okayama": { lat: 34.6617, lng: 133.9350 },
        "Hiroshima": { lat: 34.3853, lng: 132.4553 },
        "Yamaguchi": { lat: 34.1858, lng: 131.4714 },
        "Tokushima": { lat: 34.0658, lng: 134.5594 },
        "Kagawa": { lat: 34.3403, lng: 134.0433 },
        "Ehime": { lat: 33.8417, lng: 132.7661 },
        "Kochi": { lat: 33.5597, lng: 133.5311 },
        "Fukuoka": { lat: 33.5904, lng: 130.4017 },
        "Saga": { lat: 33.2633, lng: 130.3008 },
        "Nagasaki": { lat: 32.7500, lng: 129.8772 },
        "Kumamoto": { lat: 32.7897, lng: 130.7417 },
        "Oita": { lat: 33.2381, lng: 131.6125 },
        "Miyazaki": { lat: 31.9075, lng: 131.4203 },
        "Kagoshima": { lat: 31.5603, lng: 130.5581 },
        "Okinawa": { lat: 26.2124, lng: 127.6809 },
        "Sapporo": { lat: 43.0611, lng: 141.3544 },
        "Yokohama": { lat: 35.4431, lng: 139.6367 },
    };

    private constructor() { }

    public static get(): KzmGeoService {
        if (!KzmGeoService.instance) KzmGeoService.instance = new KzmGeoService();
        return KzmGeoService.instance;
    }

    /**
     * unified loader for country GeoJSON
     */
    public async loadRegionGeoJSON(countryCode: 'KR' | 'JP'): Promise<any> {
        if (this.geoCache.has(countryCode)) return this.geoCache.get(countryCode);

        try {
            const dataUrl = countryCode === 'JP' ? jpDataUrl : krDataUrl;
            const response = await fetch(dataUrl);
            if (!response.ok) throw new DatabaseException(`Fetch failed: ${response.statusText}`);

            const data = await response.json();
            this.geoCache.set(countryCode, data);
            $log.log('INFO', 'GEO_SERVICE', `${countryCode} GeoJSON loaded and cached.`);
            return data;
        } catch (error) {
            $log.log('WARN', 'GEO_SERVICE', `Failed to load ${countryCode} data, using empty shield`, { error });
            return { type: "FeatureCollection", features: [] };
        }
    }
    // 뒷단의 db 데이터 단이랑 유저 인터페이스 단이랑 데이터 이름이 달라서 매핑
    // City to Prefecture Mapping for Boundary Glow (v1.1 Robust Edition)
    private static readonly CITY_TO_PREFECTURE: Record<string, string> = {
        "Nagoya": "Aichi",
        "Sapporo": "Hokkaido",
        "Yokohama": "Kanagawa",
        "Nara": "Nara",
        "Hiroshima": "Hiroshima",
        "Gyeonggi": "Gyeonggi-do",
        "Gangwon": "Gangwon-do",
        "Jeju": "Jeju-do",
        "Incheon": "Incheon-si",
        "Busan": "Busan-si",
        "Seoul": "Seoul-si"
    };

    /**
     * Get parent prefecture name for a city (for boundary lookup)
     */
    public getParentRegion(name: string): string {
        return KzmGeoService.CITY_TO_PREFECTURE[name] || name;
    }

    /**
     * Get coordinates for warping
     */
    public getCoords(regionName: string): { lat: number; lng: number } | null {
        return KzmGeoService.REGION_COORDS[regionName] || null;
    }

    /**
     * Formats region name according to spec (KR/JP/📝).
     */
    public getRegionLabel(engName: string): string {
        const cleanName = engName.split(' ')[0];
        const mapping = KzmGeoService.JP_MAPPING[cleanName];

        if (!mapping) return `📍 ${engName}`;

        return `KR(${engName}) JP(${mapping.kanji}) 📝`;
    }
}

export const $geo = KzmGeoService.get();
