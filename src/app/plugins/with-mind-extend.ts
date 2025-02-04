import { BaseData, EmojiItem, MindElement, MindTransforms, PlaitMindBoard, WithMindPluginKey } from '@plait/mind';
import { PlaitBoard } from '@plait/core';
import { MindEmojiComponent } from '../editor/emoji/emoji.component';
import { MindImageComponent } from '../editor/image/image.component';

export const withMindExtend = (board: PlaitBoard) => {
    const newBoard = board as PlaitBoard & PlaitMindBoard;
    const { getPluginOptions } = newBoard;

    newBoard.drawEmoji = (emojiItem: EmojiItem, element: MindElement<BaseData>) => {
        return MindEmojiComponent;
    };

    newBoard.getPluginOptions = (key: string) => {
        return {
            ...getPluginOptions(key),
            isMultiple: true,
            emojiPadding: 0,
            spaceBetweenEmojis: 4,
            imageComponentType: MindImageComponent
        };
    };

    return newBoard;
};
