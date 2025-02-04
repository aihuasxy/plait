import { PlaitElement } from '@plait/core';
import { CommonPluginElement } from '../core/plugin-element';

export const getTextManages = (element: PlaitElement) => {
    const component = PlaitElement.getComponent(element) as CommonPluginElement;
    return component.getTextManages();
};

export const getTextEditors = (element: PlaitElement) => {
    return getTextManages(element).map(manage => {
        return manage.componentRef.instance.editor;
    });
};
