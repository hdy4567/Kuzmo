import { KzmVector } from '@kzm/modules/memo/core/kzm_drawing_entities';
import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $log } from '@modules/kernel/logic/kzm_kernel_logger';
import { Kzm } from '@kzm/modules/memo/db/kzm_memo_entities';



/**
 * 🛠️ KzmVectorEngine (v4.0 - Geometry Sovereignty)
 * ========================================================
 * Role: Handles hits, movement, and shape generation logic.
 */
export class KzmVectorEngine {
  private shapes: KzmVector.Shape[] = [];
  private selectedId: string | null = null;

  public addShape(shape: KzmVector.Shape): void {
    this.shapes.push(shape);
  }

  public getShapes(): KzmVector.Shape[] {
    return this.shapes;
  }

  public clear(): void {
    this.shapes = [];
    this.selectedId = null;
  }

  public selectAt(x: number, y: number): string | null {
    // Basic hit detection (Reverse order for top-most selection)
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const s = this.shapes[i];
      if (this.isHit(s, x, y)) {
        this.selectedId = s.id;
        this.shapes.forEach(sh => sh.isSelected = (sh.id === s.id));
        return s.id;
      }
    }
    this.selectedId = null;
    this.shapes.forEach(sh => sh.isSelected = false);
    return null;
  }

  private isHit(shape: KzmVector.Shape, px: number, py: number): boolean {
    const margin = 5; // Hit tolerance
    if (shape.type === 'RECT') {
      return px >= shape.x - margin && px <= shape.x + shape.width + margin &&
        py >= shape.y - margin && py <= shape.y + shape.height + margin;
    }
    if (shape.type === 'CIRCLE') {
      const dx = px - shape.cx;
      const dy = py - shape.cy;
      return Math.sqrt(dx * dx + dy * dy) <= shape.r + margin;
    }
    // Simple bounding box hit for PEN
    if (shape.type === 'PEN') {
      // Logic for pen hit could be complex; for now, let's use a simpler heuristic
      // or just check if any point is close enough.
      return shape.points.some(pt => Math.abs(pt.x - px) < margin && Math.abs(pt.y - py) < margin);
    }
    return false;
  }

  public moveSelected(dx: number, dy: number): void {
    const selected = this.shapes.find(s => s.id === this.selectedId);
    if (!selected) return;

    if (selected.type === 'RECT') {
      selected.x += dx;
      selected.y += dy;
    } else if (selected.type === 'CIRCLE') {
      selected.cx += dx;
      selected.cy += dy;
    } else if (selected.type === 'PEN') {
      selected.points.forEach(pt => {
        pt.x += dx;
        pt.y += dy;
      });
      // Re-generate 'd' attribute
      selected.d = `M ${selected.points[0].x} ${selected.points[0].y} ` +
        selected.points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    }
  }

  public deleteSelected(): void {
    if (!this.selectedId) return;
    this.shapes = this.shapes.filter(s => s.id !== this.selectedId);
    this.selectedId = null;
  }
}

