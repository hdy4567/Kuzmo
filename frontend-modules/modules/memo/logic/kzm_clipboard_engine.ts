import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $log } from '@modules/kernel/logic/kzm_kernel_logger';
import { Kzm } from '@kzm/modules/memo/db/kzm_memo_entities';

/**
 * 📋 KzmClipboardEngine (v2.0 - Packet Serializer & Sovereign Bridge)
 * ================================================================
 * Role: Handles system clipboard interactions and Packet-to-Markdown serialization.
 * Features: Multi-Packet Flattening, Frontmatter Generation, Toast Feedback.
 */
export class KzmClipboardEngine {
    private static instance: KzmClipboardEngine;

    private constructor() {
        this.initialize();
    }

    public static get(): KzmClipboardEngine {
        if (!this.instance) this.instance = new KzmClipboardEngine();
        return this.instance;
    }

    private initialize(): void {
        $log.log('INFO', 'CLIPBOARD', 'Clipboard Engine Sovereignty Established.');
    }

    /**
     * 📦 [PACKET-SERIALIZER]
     * Converts Memory Packets into high-fidelity Markdown strings with Frontmatter.
     */
    public serializePackets(records: Kzm.Record[]): string {
        return records.map(r => {
            const fm = [
                '---',
                `id: ${r.id}`,
                `title: "${r.title.replace(/"/g, '\\"')}"`,
                `date: ${new Date(r.createdAt).toLocaleString()}`,
                `region: ${r.geoRegion}`,
                `tags: [${r.tags.join(', ')}]`,
                `coord: [${r.geoCoord.geoLat}, ${r.geoCoord.geoLng}]`,
                `isPacket: ${r.isPacket}`,
                '---'
            ].join('\n');

            return `${fm}\n\n${r.content}`;
        }).join('\n\n---\n\n');
    }

    /**
     * 🛰️ [SYSTEM-BRIDGE]
     * Copies text content to the OS clipboard and triggers UI feedback.
     */
    public async copyToClipboard(text: string, count: number = 1): Promise<void> {
        try {
            await navigator.clipboard.writeText(text);
            $broker.emit('UI_TOAST', {
                message: `Successfully copied ${count} memory packet(s) to clipboard.`,
                type: 'SUCCESS'
            });
            $log.log('INFO', 'CLIPBOARD', `Copied ${count} packets to system bridge.`);
        } catch (err) {
            $broker.emit('UI_TOAST', {
                message: 'Clipboard access denied by system settings.',
                type: 'ERROR'
            });
            $log.log('ERROR', 'CLIPBOARD', 'Copy Failure', { error: err });
        }
    }
}

export const $clipboardEngine = KzmClipboardEngine.get();
