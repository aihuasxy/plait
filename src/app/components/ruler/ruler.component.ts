/* eslint-disable prettier/prettier */
/* eslint-disable @angular-eslint/no-host-metadata-property */
import { Component, OnInit, ElementRef, ChangeDetectorRef, Input, ChangeDetectionStrategy } from '@angular/core';

class RulerConfig {
  zoom: string;
  zoomSet: { [key: string]: number } = {
    '12.5%': 1000,
    '25%': 500,
    '50%': 200,
    '100%': 100,
    '200%': 50,
    '300%': 20,
    '400%': 20,
    '500%': 20,
    '600%': 10,
    '700%': 10,
    '800%': 10
  };
  scales = 10;

  constructor(scale: string) {
    this.zoom = scale;
  }

  //主刻度，默认为100
  get majorScale() {
    if (this.zoomSet.hasOwnProperty(this.zoom)) {
      return this.zoomSet[this.zoom];
    }

    const keys = Object.keys(this.zoomSet);
    const numericScale = parseFloat(this.zoom);

    if (isNaN(numericScale)) {
      // 输入无效，返回默认值或者处理方式
      return 0; // 这里返回 0，您可以根据需求返回其他值
    }

    // 寻找最接近的下限键
    for (let i = 0; i <= keys.length; i++) {
      if (numericScale >= parseFloat(keys[i]) && numericScale < parseFloat(keys[i + 1])) {
        return this.zoomSet[keys[i]];
      }
    }
    return 100;
  }

  get stepPx() {
    return ((this.majorScale / this.scales) * parseInt(this.zoom)) / 100;
  }
}

@Component({
  selector: 'app-w-ruler',
  template: '<canvas id="w-canvas" width="3400" height="30"></canvas>',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'canvas-comp'
  }
})
export class WidthRulerComponent implements OnInit {

  @Input()
  zoom!: string;

  constructor(private element: ElementRef) { }

  ngOnInit() {
    this.drawLine(4000);
  }

  //刻度尺和刻度标注
  drawLine(maxLine: number = 1500) {
    let w_canvas = this.element.nativeElement.querySelector('#w-canvas');
    let _w = w_canvas.getContext('2d');
    _w.beginPath();
    _w.strokeStyle = '#000';
    _w.lineWidth = 1;

    let rulerConfig = new RulerConfig(this.zoom);
    let scales = rulerConfig.scales;
    let step = rulerConfig.stepPx;
    let majorScale = rulerConfig.majorScale;

    //https://usefulangle.com/post/17/html5-canvas-drawing-1px-crisp-straight-lines
    //cavas画1px的线需要注意偏移0.5
    let postion = 0.5;

    let _maxLine = maxLine / step;
    for (let i = 0; i < _maxLine; i++) {
      postion = postion + step;
      _w.moveTo(postion, 0);
      if (i == 0) {
        continue;
      } else if (i % scales !== 0) {
        _w.lineTo(postion, 4);
      } else {
        _w.lineTo(postion, 8);
        _w.font = '500 10px Thoma';
        _w.fillText(`${(i * majorScale) / scales}`, postion + 3, 24);
      }
    }
    _w.stroke();
    _w.closePath();
  }
}

// eslint-disable-next-line prettier/prettier
@Component({
  selector: 'app-h-ruler',
  template: '<canvas id="h-canvas" width="30" height="1660"></canvas>',
  standalone: true,
  host: {
    class: 'canvas-comp'
  }
})
export class HeightRulerComponent implements OnInit {
  constructor(private element: ElementRef) { }

  ngOnInit() {
    this.getCanvas();
  }

  getCanvas() {
    // this.getLine(4000, 'w');
    this.getLine(1600);
  }

  //刻度尺和刻度标注
  getLine(maxLine: number = 1500) {
    let w_canvas = this.element.nativeElement.querySelector('#h-canvas');
    let _w = w_canvas.getContext('2d');
    _w.beginPath();
    _w.strokeStyle = '#000';
    _w.lineWidth = 1;
    for (let i = 0; i < maxLine; i = i + 10) {
      let _hi = i;
      _w.moveTo(0, i);
      if (_hi == 0) {
        continue;
      } else if (_hi % 100 !== 0) {
        _w.lineTo(4, i);
      } else {
        _w.font = '500 10px Thoma';
        _w.fillText(`${_hi}`, 10, i + 10);
        _w.lineTo(8, i);
      }
    }
    _w.stroke();
    _w.closePath();
  }
}
