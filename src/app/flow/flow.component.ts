import { Component, OnInit, Injector } from '@angular/core';
import { PlaitBoardChangeEvent, PlaitBoardOptions, PlaitElement, Viewport } from '@plait/core';
import { withFlow } from '@plait/flow';
import { mockFlowData } from './flow-data';
import { withCommon } from './plugins/with-common';
import { withDraw } from './plugins/with-draw';
import { CustomBoard } from './interfaces/board';
import { PlaitBoardComponent } from '../../../packages/core/src/board/board.component';

const LOCAL_DATA_KEY = 'plait-board-flow-change-data';

@Component({
    selector: 'app-basic-flow',
    templateUrl: './flow.component.html',
    standalone: true,
    imports: [PlaitBoardComponent]
})
export class BasicFlowComponent implements OnInit {
    plugins = [withCommon, withFlow, withDraw];

    value: PlaitElement[] = mockFlowData;

    viewport!: Viewport;

    board!: CustomBoard;

    options: PlaitBoardOptions = {
        readonly: false,
        hideScrollbar: false,
        disabledScrollOnNonFocus: false
    };

    constructor(private injector: Injector) {}

    ngOnInit(): void {
        const data = this.getLocalData() as PlaitBoardChangeEvent;
        if (data) {
            this.value = data.children;
            this.viewport = data.viewport;
        }
    }

    change(event: PlaitBoardChangeEvent) {
        this.setLocalData(JSON.stringify(event));
    }

    setLocalData(data: string) {
        localStorage.setItem(`${LOCAL_DATA_KEY}`, data);
    }

    getLocalData() {
        const data = localStorage.getItem(`${LOCAL_DATA_KEY}`);
        return data ? JSON.parse(data) : null;
    }

    plaitBoardInitialized(value: CustomBoard) {
        this.board = value;
        this.board.injector = this.injector;
    }
}
