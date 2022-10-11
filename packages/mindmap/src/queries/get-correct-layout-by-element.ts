import { MindmapElement } from '../interfaces';
import { MindmapNodeComponent } from '../node.component';
import {
    correctLayoutByDirection,
    findUpElement,
    getDefaultMindmapLayout,
    getInCorrectLayoutDirection,
    MINDMAP_ELEMENT_TO_COMPONENT
} from '../utils';
import { MindmapLayoutType } from '@plait/layouts';

/**
 * get correctly layout：
 * 1. root is standard -> left or right
 * 2. correct layout by incorrect layout direction
 * @param element
 */
export const getCorrectLayoutByElement = (element: MindmapElement) => {
    const { root } = findUpElement(element);
    const rootLayout = root.layout || getDefaultMindmapLayout();
    let correctRootLayout = rootLayout;

    if (element.isRoot) {
        return correctRootLayout;
    }

    const component = MINDMAP_ELEMENT_TO_COMPONENT.get(element);
    let layout = component?.node.origin.layout;

    let parentComponent: undefined | MindmapNodeComponent;
    let parent: MindmapElement | undefined = component?.parent?.origin;

    while (!layout && parent) {
        parentComponent = MINDMAP_ELEMENT_TO_COMPONENT.get(parent);
        layout = parentComponent?.node.origin.layout;
        parent = parentComponent?.parent?.origin;
    }

    // handle root standard
    if (rootLayout === MindmapLayoutType.standard) {
        correctRootLayout = component?.node.left ? MindmapLayoutType.left : MindmapLayoutType.right;
    }

    if (parentComponent?.node.origin.isRoot) {
        return correctRootLayout;
    }

    if (layout) {
        const incorrectDirection = getInCorrectLayoutDirection(correctRootLayout, layout);
        if (incorrectDirection) {
            return correctLayoutByDirection(layout, incorrectDirection);
        } else {
            return layout;
        }
    } else {
        return correctRootLayout;
    }
};
