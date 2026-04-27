/**
 * 🎨 KzmVectorEntities (v1.0 - Drawing Sovereignty)
 * ========================================================
 */

export namespace KzmVector {
  export type ShapeType = 'PEN' | 'RECT' | 'CIRCLE' | 'TEXT';

  export interface Point {
    x: number;
    y: number;
  }

  export interface Style {
    stroke: string;
    strokeWidth: number;
    fill: string;
    opacity: number;
  }

  export interface BaseShape {
    id: string;
    type: ShapeType;
    style: Style;
    isSelected: boolean;
  }

  export interface PenPath extends BaseShape {
    type: 'PEN';
    points: Point[];
    d: string;
  }

  export interface RectShape extends BaseShape {
    type: 'RECT';
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface CircleShape extends BaseShape {
    type: 'CIRCLE';
    cx: number;
    cy: number;
    r: number;
  }

  export type Shape = PenPath | RectShape | CircleShape;

  export const DEFAULT_STYLE: Style = {
    stroke: '#FF4081', // Kzm Accent
    strokeWidth: 3,
    fill: 'transparent',
    opacity: 1
  };
}
