import { PlaitDrawElement, PlaitGeometry, PlaitLine, StrokeStyle } from '../../interfaces';
import { DefaultGeometryStyle } from '../../constants';

export const getStrokeWidthByElement = (element: PlaitGeometry | PlaitLine) => {
    if (PlaitDrawElement.isText(element)) {
        return 0;
    }
    const strokeWidth = element.strokeWidth || DefaultGeometryStyle.strokeWidth;
    return strokeWidth;
};

export const getStrokeColorByElement = (element: PlaitGeometry | PlaitLine) => {
    const strokeColor = element.strokeColor || DefaultGeometryStyle.strokeColor;
    return strokeColor;
};

export const getFillByElement = (element: PlaitGeometry | PlaitLine) => {
    const fill = element.fill || DefaultGeometryStyle.fill;
    return fill;
};

export const getLineDashByElement = (element: PlaitGeometry | PlaitLine) => {
    return element.strokeStyle === 'dashed' ? [8, 8 + getStrokeWidthByElement(element)] : undefined;
};

export const getStrokeStyleByElement = (element: PlaitGeometry | PlaitLine) => {
    return element.strokeStyle || StrokeStyle.solid;
};
