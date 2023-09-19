import { GeometryShape, PlaitGeometry } from '../interfaces';
import { getRectangleByPoints, Generator } from '@plait/common';
import { getFillByElement, getLineDashByElement, getStrokeColorByElement, getStrokeWidthByElement } from '../utils/style/stroke';
import { drawGeometry } from '../utils';

export interface ShapeData {}

export class GeometryShapeGenerator extends Generator<PlaitGeometry, ShapeData> {
    canDraw(element: PlaitGeometry, data: ShapeData): boolean {
        return true;
    }

    baseDraw(element: PlaitGeometry, data: ShapeData) {
        const outerRectangle = getRectangleByPoints(element.points);
        const shape = element.shape;
        if (shape === GeometryShape.text) {
            return;
        }
        const strokeWidth = getStrokeWidthByElement(element);
        const strokeColor = getStrokeColorByElement(element);
        const fill = getFillByElement(element);
        const strokeLineDash = getLineDashByElement(element);
        return drawGeometry(this.board, outerRectangle, shape, { stroke: strokeColor, strokeWidth, fill, strokeLineDash });
    }
}