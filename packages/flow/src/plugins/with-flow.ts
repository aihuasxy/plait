import {
    PlaitBoard,
    PlaitPlugin,
    PlaitPluginElementContext,
    PlaitElement,
    PlaitOptionsBoard,
    WithPluginOptions,
    PlaitPluginKey
} from '@plait/core';
import { FlowNodeComponent } from '../flow-node.component';
import { FlowEdgeComponent } from '../flow-edge.component';
import { isHitEdge } from '../utils/edge/is-hit-edge';
import { FlowElement } from '../interfaces/element';
import { FlowEdge } from '../interfaces/edge';
import { FlowNode } from '../interfaces/node';
import { withFlowEdgeDnd } from './with-edge-dnd';
import { withEdgeCreate } from './with-edge-create';
import { isHitNode } from '../utils/node/is-hit-node';
import { withHandleBlink } from './with-handle-blink';
import { FlowPluginOptions, FlowPluginKey } from '../interfaces/flow';
import { TEXT_DEFAULT_HEIGHT } from '@plait/text';
import { withHoverHighlight } from './with-hover-highlight';

export const withFlow: PlaitPlugin = (board: PlaitBoard) => {
    const { drawElement, isHitSelection, isMovable, getRectangle } = board;

    let relationEdges: FlowEdge[];

    board.drawElement = (context: PlaitPluginElementContext) => {
        if (FlowElement.isFlowElement(context.element)) {
            if (FlowEdge.isFlowEdgeElement(context.element)) {
                return FlowEdgeComponent;
            }
            return FlowNodeComponent;
        }
        return drawElement(context);
    };

    board.isHitSelection = (element, range) => {
        if (!board.options.readonly) {
            const elementComponent = PlaitElement.getComponent(element) as FlowNodeComponent | FlowEdgeComponent;
            if (FlowElement.isFlowElement(element) && elementComponent && board.selection) {
                if (FlowNode.isFlowNodeElement(element)) {
                    return isHitNode(board, element, [range.anchor, range.focus]);
                }
                if (FlowEdge.isFlowEdgeElement(element)) {
                    return isHitEdge(board, element, range.focus);
                }
            }
        }
        return isHitSelection(element, range);
    };

    board.isMovable = element => {
        if (FlowNode.isFlowNodeElement(element as FlowElement)) {
            return true;
        }
        return isMovable(element);
    };

    board.getRectangle = element => {
        if (FlowNode.isFlowNodeElement(element as FlowElement)) {
            const { width, height, points } = element;
            return {
                x: points![0][0],
                y: points![0][1],
                width,
                height
            };
        }
        return getRectangle(element);
    };

    (board as PlaitOptionsBoard).setPluginOptions<WithPluginOptions>(PlaitPluginKey.withSelection, { isMultiple: false });

    (board as PlaitOptionsBoard).setPluginOptions<FlowPluginOptions>(FlowPluginKey.flowOptions, {
        edgeLabelOptions: { height: TEXT_DEFAULT_HEIGHT }
    });

    return withHandleBlink(withFlowEdgeDnd(withEdgeCreate(withHoverHighlight(board))));
};
