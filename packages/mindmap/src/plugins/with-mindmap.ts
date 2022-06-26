import { isPlaitMindmap, PlaitMindmap } from '../interfaces/mindmap';
import { hotkeys, Path, PlaitBoard } from 'plait';
import { PlaitElementContext, PlaitElement } from 'plait';
import { PlaitPlugin } from 'plait';
import { PlaitMindmapComponent } from '../mindmap.component';
import { IS_TEXT_EDITABLE, Transforms, idCreator, toPoint } from 'plait';
import { HAS_SELECTED_MINDMAP, HAS_SELECTED_MINDMAP_ELEMENT, MINDMAP_ELEMENT_TO_COMPONENT } from '../utils/weak-maps';
import { hitMindmapNode } from '../utils/graph';
import { MindmapNode } from '../interfaces/node';
import { SimpleChanges } from '@angular/core';
import { MINDMAP_TO_COMPONENT } from './weak-maps';
import { findPath } from '../utils';

export const withMindmap: PlaitPlugin = (board: PlaitBoard) => {
    const { drawElement, dblclick, mousedown, mousemove, mouseup, keydown, redrawElement } = board;

    board.drawElement = (context: PlaitElementContext) => {
        const { element, selection, viewContainerRef, host } = context.elementInstance;
        if (isPlaitMindmap(element)) {
            const mindmapComponentRef = viewContainerRef.createComponent(PlaitMindmapComponent);
            const mindmapInstance = mindmapComponentRef.instance;
            mindmapInstance.value = element;
            mindmapInstance.selection = selection;
            mindmapInstance.host = host;
            mindmapInstance.board = board;
            return [mindmapInstance.mindmapGGroup];
        }
        return drawElement(context);
    };

    board.mouseup = (event: MouseEvent) => {
        if (IS_TEXT_EDITABLE.get(board)) {
            return;
        }
        const point = toPoint(event.x, event.y, board.host);
        let selectedMindmap: PlaitMindmap | null = null;
        board.children.forEach((value: PlaitElement) => {
            if (isPlaitMindmap(value)) {
                const mindmapComponent = MINDMAP_TO_COMPONENT.get(value);
                const root = mindmapComponent?.root;
                (root as any).eachNode((node: MindmapNode) => {
                    if (hitMindmapNode(board, point, node)) {
                        HAS_SELECTED_MINDMAP_ELEMENT.set(node.origin, true);
                        selectedMindmap = value;
                    } else {
                        HAS_SELECTED_MINDMAP_ELEMENT.has(node.origin) && HAS_SELECTED_MINDMAP_ELEMENT.delete(node.origin);
                    }
                });
            }
            if (selectedMindmap) {
                HAS_SELECTED_MINDMAP.set(board, selectedMindmap);
            } else {
                HAS_SELECTED_MINDMAP.has(board) && HAS_SELECTED_MINDMAP.delete(board);
            }
        });
        mouseup(event);
    };

    board.keydown = (event: KeyboardEvent) => {
        if (IS_TEXT_EDITABLE.get(board)) {
            return;
        }
        if (event.key === 'Tab' || event.key === 'Enter') {
            event.preventDefault();
            const plaitMindmap = HAS_SELECTED_MINDMAP.get(board);
            if (plaitMindmap) {
                const mindmapComponent = MINDMAP_TO_COMPONENT.get(plaitMindmap);
                const root = mindmapComponent?.root;
                (root as any).eachNode((node: MindmapNode) => {
                    const element = node.origin;
                    if (HAS_SELECTED_MINDMAP_ELEMENT.has(element)) {
                        let path = [];
                        if (event.key === 'Tab') {
                            path = findPath(board, node).concat(node.children.length);
                        } else {
                            path = Path.next(findPath(board, node));
                        }
                        const newElement = {
                            id: idCreator(),
                            value: {
                                children: [{ text: '' }]
                            },
                            children: [],
                            width: 5,
                            height: 24
                        };
                        setTimeout(() => {
                            HAS_SELECTED_MINDMAP_ELEMENT.has(element) && HAS_SELECTED_MINDMAP_ELEMENT.delete(element);
                            const nodeComponent = MINDMAP_ELEMENT_TO_COMPONENT.get(newElement);
                            if (nodeComponent) {
                                nodeComponent.startEditText();
                            }
                        }, 0);
                        Transforms.insertNode(board, newElement, path);
                    }
                });
            }
        }
        if (hotkeys.isDeleteBackward(event)) {
            event.preventDefault();
            const plaitMindmap = HAS_SELECTED_MINDMAP.get(board);
            if (plaitMindmap) {
                const mindmapComponent = MINDMAP_TO_COMPONENT.get(plaitMindmap);
                const root = mindmapComponent?.root;
                (root as any).eachNode((node: MindmapNode) => {
                    if (HAS_SELECTED_MINDMAP_ELEMENT.has(node.origin)) {
                        const path = findPath(board, node);
                        Transforms.removeNode(board, path);
                    }
                });
            }
        }
    };

    board.dblclick = (event: MouseEvent) => {
        if (IS_TEXT_EDITABLE.get(board)) {
            return;
        }

        const point = toPoint(event.x, event.y, board.host);

        board.children.forEach((value: PlaitElement) => {
            if (isPlaitMindmap(value)) {
                const mindmapComponent = MINDMAP_TO_COMPONENT.get(value);
                const root = mindmapComponent?.root;
                (root as any).eachNode((node: MindmapNode) => {
                    if (hitMindmapNode(board, point, node)) {
                        const nodeComponent = MINDMAP_ELEMENT_TO_COMPONENT.get(node.origin);
                        if (nodeComponent) {
                            nodeComponent.startEditText();
                        }
                    }
                });
            }
        });
    };

    board.redrawElement = (context: PlaitElementContext, changes: SimpleChanges) => {
        const { element, selection } = context.elementInstance;
        const elementChange = changes['element'];
        if (isPlaitMindmap(element)) {
            const previousElement = (elementChange && elementChange.previousValue) || element;
            const mindmapInstance = MINDMAP_TO_COMPONENT.get(previousElement);
            if (!mindmapInstance) {
                throw new Error('undefined mindmap component');
            }
            mindmapInstance.value = element;
            mindmapInstance.selection = selection;
            if (elementChange) {
                mindmapInstance.updateMindmap();
            } else {
                mindmapInstance.doCheck();
            }
            return [mindmapInstance.mindmapGGroup];
        }
        return drawElement(context);
    };

    return board;
};
