import { Path, PlaitBoard, PlaitHistoryBoard, Transforms, getSelectedElements, removeSelectedElement } from '@plait/core';
import { MindElement, PlaitMind } from '../interfaces';
import { AbstractNode } from '@plait/layouts';
import { insertMindElement } from '../utils/mind';
import { findNewChildNodePath, findNewSiblingNodePath } from '../utils/path';
import { insertElementHandleRightNodeCount, isInRightBranchOfStandardLayout } from '../utils/node/right-node-count';
import { MindTransforms } from '../transforms';
import { insertElementHandleAbstract } from '../utils/abstract/common';
import { editTopic } from '../utils/node/common';
import { PlaitMindBoard } from './with-mind.board';
import { isSpaceHotkey, isExpandHotkey, isTabHotkey, isEnterHotkey, isVirtualKey, isDelete } from '@plait/common';

export const withMindHotkey = (baseBoard: PlaitBoard) => {
    const board = baseBoard as PlaitBoard & PlaitMindBoard;
    const { keydown } = board;

    board.keydown = (event: KeyboardEvent) => {
        const selectedElements = getSelectedElements(board);
        const isSingleSelection = selectedElements.length === 1;
        const isSingleMindElement = selectedElements.length === 1 && MindElement.isMindElement(board, selectedElements[0]);
        const targetElement = selectedElements[0] as MindElement;

        if (isExpandHotkey(event) && isSingleMindElement && !PlaitMind.isMind(targetElement)) {
            if (targetElement.children && targetElement.children.length > 0) {
                Transforms.setNode(
                    board,
                    { isCollapsed: targetElement.isCollapsed ? false : true },
                    PlaitBoard.findPath(board, targetElement)
                );
                return;
            }
        }

        if (!PlaitBoard.isReadonly(board)) {
            if (isTabHotkey(event) && isSingleMindElement) {
                event.preventDefault();
                removeSelectedElement(board, targetElement);
                const targetElementPath = PlaitBoard.findPath(board, targetElement);
                if (targetElement.isCollapsed) {
                    const newElement: Partial<MindElement> = { isCollapsed: false };
                    PlaitHistoryBoard.withoutSaving(board, () => {
                        Transforms.setNode(board, newElement, targetElementPath);
                    });
                }
                insertMindElement(board, targetElement, findNewChildNodePath(board, targetElement));
                return;
            }

            if (
                isEnterHotkey(event) &&
                isSingleMindElement &&
                !PlaitMind.isMind(targetElement) &&
                !AbstractNode.isAbstract(targetElement)
            ) {
                const targetElementPath = PlaitBoard.findPath(board, targetElement);
                if (isInRightBranchOfStandardLayout(targetElement)) {
                    const refs = insertElementHandleRightNodeCount(board, targetElementPath.slice(0, 1), 1);
                    MindTransforms.setRightNodeCountByRefs(board, refs);
                }
                const abstractRefs = insertElementHandleAbstract(board, Path.next(targetElementPath));
                MindTransforms.setAbstractsByRefs(board, abstractRefs);
                insertMindElement(board, targetElement, findNewSiblingNodePath(board, targetElement));
                return;
            }

            if (
                !isVirtualKey(event) &&
                !isDelete(event) &&
                !isSpaceHotkey(event) &&
                isSingleSelection &&
                MindElement.isMindElement(board, targetElement)
            ) {
                event.preventDefault();
                editTopic(targetElement);
                return;
            }
        }

        keydown(event);
    };

    return board;
};
