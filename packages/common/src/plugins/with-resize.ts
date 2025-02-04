import {
    MERGING,
    PRESS_AND_MOVE_BUFFER,
    Path,
    PlaitBoard,
    PlaitElement,
    PlaitPointerType,
    Point,
    distanceBetweenPointAndPoint,
    isMainPointer,
    preventTouchMove,
    handleTouchTarget,
    throttleRAF,
    toPoint,
    transformPoint
} from '@plait/core';
import { ResizeHandle, ResizeCursorClass } from '../constants/resize';
import { addResizing, isResizing, removeResizing } from '../utils/resize';

export interface WithResizeOptions<T extends PlaitElement = PlaitElement, K = ResizeHandle> {
    key: string;
    canResize: () => boolean;
    detect: (point: Point) => ResizeDetectResult<T, K> | null;
    onResize: (resizeRef: ResizeRef<T, K>, resizeState: ResizeState) => void;
    endResize?: (resizeRef: ResizeRef<T, K>) => void;
}

export interface ResizeDetectResult<T extends PlaitElement = PlaitElement, K = ResizeHandle> {
    element: T;
    handle: K;
    cursorClass?: ResizeCursorClass;
}

export interface ResizeRef<T extends PlaitElement = PlaitElement, K = ResizeHandle> {
    element: T;
    path: Path;
    handle: K;
}

export interface ResizeState {
    offsetX: number;
    offsetY: number;
    endTransformPoint: Point;
}

const generalCanResize = (board: PlaitBoard, event: PointerEvent) => {
    return (
        PlaitBoard.isReadonly(board) ||
        PlaitBoard.hasBeenTextEditing(board) ||
        !PlaitBoard.isPointer(board, PlaitPointerType.hand) ||
        !isMainPointer(event)
    );
};

export const withResize = <T extends PlaitElement = PlaitElement, K = ResizeHandle>(
    board: PlaitBoard,
    options: WithResizeOptions<T, K>
) => {
    const { pointerDown, pointerMove, globalPointerUp } = board;
    let resizeDetectResult: ResizeDetectResult<T, K> | null = null;
    let resizeRef: ResizeRef<T, K> | null = null;
    let startPoint: Point | null = null;
    let hoveDetectResult: ResizeDetectResult<T, K> | null = null;

    board.pointerDown = (event: PointerEvent) => {
        if (!options.canResize() || !generalCanResize(board, event)) {
            pointerDown(event);
            return;
        }
        const point = transformPoint(board, toPoint(event.x, event.y, PlaitBoard.getHost(board)));
        resizeDetectResult = options.detect(point);
        if (resizeDetectResult) {
            if (resizeDetectResult.cursorClass) {
                PlaitBoard.getBoardContainer(board).classList.add(`${resizeDetectResult.cursorClass}`);
            }
            startPoint = [event.x, event.y];
            resizeRef = {
                path: PlaitBoard.findPath(board, resizeDetectResult.element),
                element: resizeDetectResult.element,
                handle: resizeDetectResult.handle
            };
            preventTouchMove(board, event, true);
            return;
        }
        pointerDown(event);
    };

    board.pointerMove = (event: PointerEvent) => {
        if (!options.canResize() || !generalCanResize(board, event)) {
            pointerMove(event);
            return;
        }
        if (startPoint && resizeDetectResult && !isResizing(board)) {
            // prevent text from being selected
            event.preventDefault();

            const endPoint = transformPoint(board, toPoint(event.x, event.y, PlaitBoard.getHost(board)));
            const distance = distanceBetweenPointAndPoint(startPoint[0], startPoint[1], endPoint[0], endPoint[1]);
            if (distance > PRESS_AND_MOVE_BUFFER) {
                addResizing(board, resizeDetectResult.element, options.key);
            }
        }

        if (isResizing(board) && startPoint) {
            // prevent text from being selected
            event.preventDefault();
            const endTransformPoint = transformPoint(board, toPoint(event.x, event.y, PlaitBoard.getHost(board)));
            throttleRAF(() => {
                const endPoint = [event.x, event.y];
                if (startPoint && resizeRef) {
                    handleTouchTarget(board);
                    const offsetX = endPoint[0] - startPoint[0];
                    const offsetY = endPoint[1] - startPoint[1];
                    options.onResize(resizeRef, { offsetX, offsetY, endTransformPoint });
                    MERGING.set(board, true);
                }
            });
            return;
        } else {
            const point = transformPoint(board, toPoint(event.x, event.y, PlaitBoard.getHost(board)));
            const resizeDetectResult = options.detect(point);
            if (resizeDetectResult) {
                hoveDetectResult = resizeDetectResult;
                if (hoveDetectResult.cursorClass) {
                    PlaitBoard.getBoardContainer(board).classList.add(`${hoveDetectResult.cursorClass}`);
                }
            } else {
                if (hoveDetectResult) {
                    if (hoveDetectResult.cursorClass) {
                        PlaitBoard.getBoardContainer(board).classList.remove(`${hoveDetectResult.cursorClass}`);
                    }
                    hoveDetectResult = null;
                }
            }
        }
        pointerMove(event);
    };

    board.globalPointerUp = (event: PointerEvent) => {
        globalPointerUp(event);
        if (isResizing(board) || resizeDetectResult) {
            options.endResize && options.endResize(resizeRef!);
            removeResizing(board, options.key);
            startPoint = null;
            resizeDetectResult = null;
            resizeRef = null;
            MERGING.set(board, false);
            preventTouchMove(board, event, false);
        }
    };

    return board;
};
