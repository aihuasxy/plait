import {
    createG,
    distanceBetweenPointAndPoint,
    HOST_TO_ROUGH_SVG,
    IS_TEXT_EDITABLE,
    Path,
    PlaitBoard,
    PlaitElement,
    PlaitPlugin,
    Point,
    toPoint,
    transformPoint,
    Transforms
} from '@plait/core';
import { isStandardLayout } from '@plait/layouts';
import { updateForeignObject } from '@plait/richtext';
import { RoughSVG } from 'roughjs/bin/svg';
import { BASE } from '../constants';
import { getRichtextRectangleByNode } from '../draw/richtext';
import { drawRectangleNode } from '../draw/shape';
import { MindmapElement } from '../interfaces/element';
import { isPlaitMindmap, PlaitMindmap } from '../interfaces/mindmap';
import { DetectResult, MindmapNode, RootBaseDirection } from '../interfaces/node';
import { MindmapNodeComponent } from '../node.component';
import { drawPlaceholderDropNodeG, findPath, isChildElement } from '../utils';
import { getRectangleByNode, hitMindmapNode } from '../utils/graph';
import { MINDMAP_ELEMENT_TO_COMPONENT } from '../utils/weak-maps';
import { MINDMAP_TO_COMPONENT } from './weak-maps';
import * as MindmapQueries from '../queries';

const DRAG_MOVE_BUFFER = 5;

export const withNodeDnd: PlaitPlugin = (board: PlaitBoard) => {
    const { mousedown, mousemove, globalMouseup, keydown } = board;

    let activeElement: MindmapElement | null;
    let startPoint: Point;
    let isDragging = false;
    let fakeDragNodeG: SVGGElement | undefined;
    let fakeDropNodeG: SVGGElement | undefined;
    let dropTarget: { target: MindmapElement; detectResult: DetectResult } | null = null;

    board.mousedown = (event: MouseEvent) => {
        if (board.options.readonly || IS_TEXT_EDITABLE.get(board) || event.button === 2) {
            mousedown(event);
            return;
        }

        // 确认是否 hit 节点
        const point = transformPoint(board, toPoint(event.x, event.y, board.host));
        board.children.forEach((value: PlaitElement) => {
            if (activeElement) {
                return;
            }
            if (isPlaitMindmap(value)) {
                const mindmapComponent = MINDMAP_TO_COMPONENT.get(value);
                const root = mindmapComponent?.root;
                (root as any).eachNode((node: MindmapNode) => {
                    if (activeElement) {
                        return;
                    }
                    if (hitMindmapNode(board, point, node) && !node.origin.isRoot) {
                        activeElement = node.origin;
                        startPoint = point;
                    }
                });
            }
        });

        if (activeElement) {
            event.preventDefault();
        }

        mousedown(event);
    };

    board.mousemove = (event: MouseEvent) => {
        if (!board.options.readonly && activeElement && startPoint) {
            const endPoint = transformPoint(board, toPoint(event.x, event.y, board.host));
            const distance = distanceBetweenPointAndPoint(startPoint[0], startPoint[1], endPoint[0], endPoint[1]);
            if (distance < DRAG_MOVE_BUFFER) {
                return;
            }

            if (!isDragging) {
                isDragging = true;
                fakeDragNodeG = createG();
                fakeDragNodeG.classList.add('dragging', 'fake-node', 'plait-board-attached');
                fakeDropNodeG = createG();
                const activeComponent = MINDMAP_ELEMENT_TO_COMPONENT.get(activeElement) as MindmapNodeComponent;
                addActiveOnDragOrigin(activeElement);
                activeComponent.mindmapGGroup.parentElement?.appendChild(fakeDropNodeG);
                activeComponent.mindmapGGroup.parentElement?.appendChild(fakeDragNodeG);
            } else {
                fakeDragNodeG?.childNodes.forEach(node => {
                    node.remove();
                });
                fakeDropNodeG?.childNodes.forEach(node => {
                    node.remove();
                });
            }

            // fake dragging origin node
            const offsetX = endPoint[0] - startPoint[0];
            const offsetY = endPoint[1] - startPoint[1];
            const activeComponent = MINDMAP_ELEMENT_TO_COMPONENT.get(activeElement) as MindmapNodeComponent;
            const roughSVG = HOST_TO_ROUGH_SVG.get(board.host) as RoughSVG;
            const fakeDragingNode: MindmapNode = {
                ...activeComponent.node,
                children: [],
                x: activeComponent.node.x + offsetX,
                y: activeComponent.node.y + offsetY
            };
            const { textX, textY, width, height } = getRichtextRectangleByNode(activeComponent.node);
            const fakeNodeG = drawRectangleNode(roughSVG, fakeDragingNode);
            const richtextG = activeComponent.richtextG?.cloneNode(true) as SVGGElement;
            updateForeignObject(richtextG, width + BASE * 10, height, textX + offsetX, textY + offsetY);
            fakeDragNodeG?.append(fakeNodeG);
            fakeDragNodeG?.append(richtextG);

            // drop position detect
            const { x, y } = getRectangleByNode(fakeDragingNode);
            const detectCenterPoint = [x + width / 2, y + height / 2] as Point;

            let detectResult: DetectResult = null;
            let rootBaseDirection: RootBaseDirection = null;
            board.children.forEach((value: PlaitElement) => {
                if (detectResult) {
                    return;
                }
                if (isPlaitMindmap(value)) {
                    // 拖拽之前先判断基于 root 的方向
                    const mindmapComponent = MINDMAP_TO_COMPONENT.get(value);
                    const root = mindmapComponent?.root;
                    if (root) {
                        rootBaseDirection = getRootBaseDirection(root, detectCenterPoint);
                    }

                    (root as any).eachNode((node: MindmapNode) => {
                        if (detectResult) {
                            return;
                        }
                        detectResult = dropDetector(node, detectCenterPoint);
                        dropTarget = null;
                        if (detectResult && isValidTarget(activeComponent.node.origin, node.origin)) {
                            dropTarget = { target: node.origin, detectResult };
                        }
                    });
                }
            });

            if (rootBaseDirection && !dropTarget) {
                const mindmapComponent = MINDMAP_TO_COMPONENT.get(board.children[0] as PlaitMindmap);
                const root = mindmapComponent?.root;
                const rightNodeCount = board.children[0].rightNodeCount;
                // 如果有内容，画一条底部的曲线
                // 如果没内容，画一条向左/向右的直线
                if (rootBaseDirection === 'right') {
                    if (!!rightNodeCount) {
                        const lastRightNode = board.children[0].children?.find((node, index) => index === rightNodeCount - 1);
                        dropTarget = { target: lastRightNode as MindmapElement, detectResult: 'bottom' };
                    } else {
                        dropTarget = { target: root?.origin as MindmapElement, detectResult: 'right' };
                    }
                }

                if (rootBaseDirection === 'left') {
                    const leftNode = board.children[0].children?.slice(rightNodeCount, board.children[0].children.length);
                    const layout = MindmapQueries.getCorrectLayoutByElement(root?.origin as MindmapElement);
                    // 标准布局并且左侧没有节点，向左划一条基本直线（左布局下不需要此线）
                    if (!leftNode?.length && isStandardLayout(layout)) {
                        dropTarget = { target: root?.origin as MindmapElement, detectResult: 'left' };
                    }
                    if (leftNode?.length) {
                        const lastLeftNode = leftNode[leftNode.length - 1];
                        dropTarget = { target: lastLeftNode as MindmapElement, detectResult: 'bottom' };
                    }
                }
            }

            if (dropTarget?.target) {
                drawPlaceholderDropNodeG(dropTarget, roughSVG, fakeDropNodeG);
            }
        }

        mousemove(event);
    };

    board.globalMouseup = (event: MouseEvent) => {
        if (!board.options.readonly && activeElement) {
            if (dropTarget?.target) {
                const activeComponent = MINDMAP_ELEMENT_TO_COMPONENT.get(activeElement) as MindmapNodeComponent;
                const targetComponent = MINDMAP_ELEMENT_TO_COMPONENT.get(dropTarget.target) as MindmapNodeComponent;
                let targetPath = findPath(board, targetComponent.node);
                if (dropTarget.detectResult === 'right') {
                    targetPath.push(dropTarget.target.children.length);
                }
                if (dropTarget.detectResult === 'left') {
                    targetPath.push(dropTarget.target.children.length);
                }
                if (dropTarget.detectResult === 'bottom') {
                    targetPath = Path.next(targetPath);
                }
                const originPath = findPath(board, activeComponent.node);
                const mindmapComponent = MINDMAP_TO_COMPONENT.get(board.children[0] as PlaitMindmap);
                const layout = MindmapQueries.getCorrectLayoutByElement(mindmapComponent?.root.origin as MindmapElement);

                let newElement: Partial<MindmapElement> = { isCollapsed: false },
                    rightTargetPath = findPath(board, targetComponent.node);

                if (isStandardLayout(layout)) {
                    updateRightNodeCount(board, activeComponent, targetComponent, dropTarget.detectResult);
                }

                if (dropTarget.detectResult === 'right') {
                    if (targetComponent.node.origin.isRoot) {
                        targetPath = findPath(board, targetComponent.node);
                        targetPath.push(0);
                        const rightNodeCount = (targetComponent.node.origin.rightNodeCount as number) + 1;
                        newElement = { isCollapsed: false, rightNodeCount };
                    }
                    Transforms.setNode(board, newElement, rightTargetPath as Path);
                }

                Transforms.moveNode(board, originPath, targetPath);
            }

            if (isDragging) {
                removeActiveOnDragOrigin(activeElement);
            }
            isDragging = false;
            activeElement = null;
            fakeDragNodeG?.remove();
            fakeDragNodeG = undefined;
            fakeDropNodeG?.remove();
            fakeDropNodeG = undefined;
            dropTarget = null;
        }
        globalMouseup(event);
    };

    board.keydown = (event: KeyboardEvent) => {
        keydown(event);
    };

    return board;
};

export const getRootBaseDirection = (node: MindmapNode, centerPoint: Point): RootBaseDirection => {
    const direction = null;
    const { x, y, width, height } = getRectangleByNode(node);

    // 30 上下缓冲值
    if (y - 30 <= centerPoint[1] && y + height + 30 >= centerPoint[1]) {
        if (x + width / 2 <= centerPoint[0]) {
            return 'right';
        }
        if (x + width / 2 > centerPoint[0]) {
            return 'left';
        }
    }

    return direction;
};

export const dropDetector = (node: MindmapNode, centerPoint: Point): DetectResult => {
    const { x, y, width, height } = getRectangleByNode(node);
    const yTop = node.y;
    const yBottom = node.y + node.height;
    const yCenter = node.y + node.height / 2;
    const xLeft = node.x;
    const xRight = x + width;
    if (node.origin.children.length === 0 || node.origin.isCollapsed) {
        if (centerPoint[0] > xRight && centerPoint[1] < node.x + node.width && centerPoint[1] > y && centerPoint[1] < y + height) {
            return 'right';
        }
    }
    if (centerPoint[0] > xLeft && centerPoint[0] < xRight && centerPoint[1] > yTop && centerPoint[1] < yCenter && !node.origin.isRoot) {
        return 'top';
    }
    if (centerPoint[0] > xLeft && centerPoint[0] < xRight && centerPoint[1] > yCenter && centerPoint[1] < yBottom && !node.origin.isRoot) {
        return 'bottom';
    }

    return null;
};

export const isValidTarget = (origin: MindmapElement, target: MindmapElement) => {
    return origin !== target && !isChildElement(origin, target);
};

export const addActiveOnDragOrigin = (activeElement: MindmapElement, isOrigin = true) => {
    const activeComponent = MINDMAP_ELEMENT_TO_COMPONENT.get(activeElement) as MindmapNodeComponent;
    if (isOrigin) {
        activeComponent.gGroup.classList.add('dragging-origin');
    } else {
        activeComponent.gGroup.classList.add('dragging-child');
    }
    !activeElement.isCollapsed &&
        activeElement.children.forEach(child => {
            addActiveOnDragOrigin(child, false);
        });
};

export const removeActiveOnDragOrigin = (activeElement: MindmapElement, isOrigin = true) => {
    const activeComponent = MINDMAP_ELEMENT_TO_COMPONENT.get(activeElement) as MindmapNodeComponent;
    if (isOrigin) {
        activeComponent.gGroup.classList.remove('dragging-origin');
    } else {
        activeComponent.gGroup.classList.remove('dragging-child');
    }
    !activeElement.isCollapsed &&
        activeElement.children.forEach(child => {
            removeActiveOnDragOrigin(child, false);
        });
};

export const updateRightNodeCount = (
    board: PlaitBoard,
    activeComponent: MindmapNodeComponent,
    targetComponent: MindmapNodeComponent,
    detectResult: DetectResult
) => {
    let rightNodeCount;
    const mindmapComponent = MINDMAP_TO_COMPONENT.get(board.children[0] as PlaitMindmap);
    const activeIndex = mindmapComponent?.root.children.indexOf(activeComponent.node) as number;
    const targetIndex = mindmapComponent?.root.children.indexOf(targetComponent.node) as number;
    const isActiveOnRight = activeIndex !== -1 && activeIndex <= (activeComponent.parent.origin.rightNodeCount as number) - 1;
    const isTargetOnRight =
        targetComponent.parent && targetIndex !== -1 && targetIndex <= (targetComponent.parent.origin.rightNodeCount as number) - 1;
    const isBothOnRight = isActiveOnRight && isTargetOnRight;
    const rootChildCount = board.children[0].children?.length as number;
    const rootRightNodeCount = mindmapComponent?.root.origin.rightNodeCount as number;

    if (!isBothOnRight) {
        if (isActiveOnRight) {
            rightNodeCount = rootChildCount < rootRightNodeCount ? rootChildCount - 1 : rootRightNodeCount - 1;
            Transforms.setNode(board, { rightNodeCount }, findPath(board, activeComponent.parent));
        }

        if (isTargetOnRight && detectResult !== 'right') {
            rightNodeCount = rootChildCount < rootRightNodeCount ? rootRightNodeCount : rootRightNodeCount + 1;
            Transforms.setNode(board, { rightNodeCount }, findPath(board, targetComponent.parent));
        }

        //二级子节点拖动到根节点左侧
        if (targetComponent.node.origin.isRoot && detectResult === 'left' && activeIndex === -1) {
            rightNodeCount = rootChildCount;
            Transforms.setNode(board, { rightNodeCount }, findPath(board, targetComponent.node));
        }
    }
};
