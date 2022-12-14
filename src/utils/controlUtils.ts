import store from '@/store'
import { ICoordinate } from '@/interfaces/frame'
import { IShape } from '@/interfaces/layer'
import shapeUtils from '@/utils/shapeUtils'
import generalUtils from '@/utils/generalUtils'
import layerUtils from './layerUtils'
import editorUtils from './editorUtils'
import { svg1, svg2, svg3, svg4, svg5, svg6, svg7, svg8 } from './cornerRotate'
import mathUtils from './mathUtils'

const blob1 = new Blob([svg1], { type: 'image/svg+xml' })
const blob2 = new Blob([svg2], { type: 'image/svg+xml' })
const blob3 = new Blob([svg3], { type: 'image/svg+xml' })
const blob4 = new Blob([svg4], { type: 'image/svg+xml' })
const blob5 = new Blob([svg5], { type: 'image/svg+xml' })
const blob6 = new Blob([svg6], { type: 'image/svg+xml' })
const blob7 = new Blob([svg7], { type: 'image/svg+xml' })
const blob8 = new Blob([svg8], { type: 'image/svg+xml' })
const corner1 = `url("${window.URL.createObjectURL(blob1)}") 14 14, auto`
const corner2 = `url("${window.URL.createObjectURL(blob2)}") 16 14, auto`
const corner3 = `url("${window.URL.createObjectURL(blob3)}") 18 14, auto`
const corner4 = `url("${window.URL.createObjectURL(blob4)}") 18 16, auto`
const corner5 = `url("${window.URL.createObjectURL(blob5)}") 16 16, auto`
const corner6 = `url("${window.URL.createObjectURL(blob6)}") 18 18, auto`
const corner7 = `url("${window.URL.createObjectURL(blob7)}") 16 18, auto`
const corner8 = `url("${window.URL.createObjectURL(blob8)}") 14 18, auto`
class Controller {
  getLength(vect: ICoordinate): number {
    const sqareSum = Math.pow(vect.x, 2) + Math.pow(vect.y, 2)
    return Math.sqrt(sqareSum)
  }

  // Get position as no-rotation happens
  getNoRotationPos(vectClient: ICoordinate, center: ICoordinate, rotation: number): ICoordinate {
    return {
      x: vectClient.x * Math.cos(-rotation) - vectClient.y * Math.sin(-rotation) + center.x,
      y: vectClient.y * Math.cos(-rotation) + vectClient.x * Math.sin(-rotation) + center.y
    }
  }

  getRectCenter(rect: DOMRect): ICoordinate {
    return {
      x: rect.left + rect.width / 2 - window.pageXOffset,
      y: rect.top + rect.height / 2 - window.pageYOffset
    }
  }

  get getCornerRataterMap(): Array<string> {
    return [corner1, corner2, corner3, corner4, corner5, corner6, corner7, corner8]
  }

  getCornerRatater = (scalerSize: number) => {
    const contentScaleRatio = editorUtils.contentScaleRatio
    const scaleRatio = store.getters.getPageScaleRatio
    return [
      {
        cursor: corner1,
        styles: {
          width: `${scalerSize}px`,
          height: `${scalerSize}px`,
          left: '0',
          top: '0',
          transform: `translate3d(-50%,-50%,0) scale(${100 / scaleRatio * contentScaleRatio})`,
          borderRadius: '50%'
          // background: 'red'
        },
        scalerSize
      },
      {
        cursor: corner3,
        styles: {
          width: `${scalerSize}px`,
          height: `${scalerSize}px`,
          transform: `translate3d(50%,-50%,0) scale(${100 / scaleRatio * contentScaleRatio})`,
          right: '0',
          top: '0',
          borderRadius: '50%'
          // background: 'red'
        },
        scalerSize
      },
      {
        cursor: corner5,
        styles: {
          width: `${scalerSize}px`,
          height: `${scalerSize}px`,
          transform: `translate3d(50%,50%,0) scale(${100 / scaleRatio * contentScaleRatio})`,
          right: '0',
          bottom: '0',
          borderRadius: '50%'
          // background: 'red'
        },
        scalerSize
      },
      {
        cursor: corner7,
        styles: {
          width: `${scalerSize}px`,
          height: `${scalerSize}px`,
          transform: `translate3d(-50%,50%,0) scale(${100 / scaleRatio * contentScaleRatio})`,
          left: '0',
          bottom: '0',
          borderRadius: '50%'
          // background: 'red'
        },
        scalerSize
      }
    ]
  }

  private getScalers = (scalerSize: number, cursors?: Array<number | string>, isTouchArea = false) => {
    const contentScaleRatio = editorUtils.contentScaleRatio
    const scaleRatio = store.getters.getPageScaleRatio
    return [
      {
        cursor: cursors?.[0] ?? 0,
        styles: {
          width: `${scalerSize}px`,
          height: `${scalerSize}px`,
          left: '0',
          top: '0',
          transform: `translate3d(-50%,-50%,0) scale(${100 / scaleRatio * contentScaleRatio})`,
          borderRadius: '50%',
          opacity: isTouchArea ? '0' : '1'
        },
        scalerSize
      },
      {
        cursor: cursors?.[1] ?? 2,
        styles: {
          width: `${scalerSize}px`,
          height: `${scalerSize}px`,
          transform: `translate3d(50%,-50%,0) scale(${100 / scaleRatio * contentScaleRatio})`,
          right: '0',
          top: '0',
          borderRadius: '50%',
          opacity: isTouchArea ? '0' : '1'
        },
        scalerSize
      },
      {
        cursor: cursors?.[2] ?? 4,
        styles: {
          width: `${scalerSize}px`,
          height: `${scalerSize}px`,
          transform: `translate3d(50%,50%,0) scale(${100 / scaleRatio * contentScaleRatio})`,
          right: '0',
          bottom: '0',
          borderRadius: '50%',
          opacity: isTouchArea ? '0' : '1'
        },
        scalerSize
      },
      {
        cursor: cursors?.[3] ?? 6,
        styles: {
          width: `${scalerSize}px`,
          height: `${scalerSize}px`,
          transform: `translate3d(-50%,50%,0) scale(${100 / scaleRatio * contentScaleRatio})`,
          left: '0',
          bottom: '0',
          borderRadius: '50%',
          opacity: isTouchArea ? '0' : '1'
        },
        scalerSize
      }
    ]
  }

  private getResizers = (resizerShort: number, resizerLong: number, contentScaleRatio: number, isTouchArea = false) => {
    return [
      {
        type: 'H',
        cursor: 7,
        styles: {
          height: `${resizerLong}px`,
          width: `${resizerShort}px`,
          left: '0',
          transform: `translate(-50%, -50%) scale(${contentScaleRatio})`,
          opacity: isTouchArea ? '0' : '1'
        }
      },
      {
        type: 'H',
        cursor: 3,
        styles: {
          height: `${resizerLong}px`,
          width: `${resizerShort}px`,
          right: '0',
          transform: `translate(50%, -50%) scale(${contentScaleRatio})`,
          opacity: isTouchArea ? '0' : '1'
        }
      },
      {
        type: 'V',
        cursor: 5,
        styles: {
          width: `${resizerLong}px`,
          height: `${resizerShort}px`,
          bottom: '0',
          transform: `translate(-50%, 50%) scale(${contentScaleRatio})`,
          opacity: isTouchArea ? '0' : '1'
        }
      },
      {
        type: 'V',
        cursor: 1,
        styles: {
          width: `${resizerLong}px`,
          height: `${resizerShort}px`,
          top: '0',
          transform: `translate(-50%, -50%) scale(${contentScaleRatio})`,
          opacity: isTouchArea ? '0' : '1'
        }
      }
    ]
  }

  getControlPoints = (resizerShort: number, resizerLong: number) => {
    const contentScaleRatio = editorUtils.contentScaleRatio
    const scaleRatio = store.getters.getPageScaleRatio
    const isMobile = generalUtils.isTouchDevice()
    const scalerSize = isMobile ? 12 : 8

    return {
      scalers: this.getScalers(scalerSize),
      scalerTouchAreas: this.getScalers(scalerSize * 3, undefined, true),
      cornerRotaters: this.getCornerRatater(scalerSize * 4),
      lineEnds: [
        {
          width: `${scalerSize}px`,
          height: `${scalerSize}px`,
          left: '0',
          top: '50%',
          transform: `translate3d(-50%,-50%,0) scale(${100 / scaleRatio * contentScaleRatio})`,
          borderRadius: '50%'
        },
        {
          width: `${scalerSize}px`,
          height: `${scalerSize}px`,
          transform: `translate3d(50%,-50%,0) scale(${100 / scaleRatio * contentScaleRatio})`,
          right: '0',
          top: '50%',
          borderRadius: '50%'
        }
      ],
      resizers: this.getResizers(resizerShort, resizerLong, contentScaleRatio),
      resizerTouchAreas: this.getResizers(resizerShort * 3, resizerLong * 3, contentScaleRatio, true),
      cursors: [
        'nwse-resize',
        'ns-resize',
        'nesw-resize',
        'ew-resize',
        'nwse-resize',
        'ns-resize',
        'nesw-resize',
        'ew-resize'
      ]
    }
  }

  dirHandler(clientP: ICoordinate, rect: DOMRect): boolean {
    const center: ICoordinate = this.getRectCenter(rect)
    const H = {
      left: center.x - rect.width / 2,
      right: center.x + rect.width / 2
    }
    const V = {
      top: center.y - rect.height / 2,
      bottom: center.y + rect.height / 2
    }
    const xmin = Math.min(Math.abs(clientP.x - H.left), Math.abs(clientP.x - H.right))
    const ymin = Math.min(Math.abs(clientP.y - V.top), Math.abs(clientP.y - V.bottom))
    /**  If it's in horizontal direction, return true
     *  */
    return xmin < ymin
  }

  getTranslateCompensation(initData: { xSign: number, ySign: number, x: number, y: number, angle: number },
    sizeOffset: { width: number, height: number }): ICoordinate {
    return {
      x: -sizeOffset.width / 2 + initData.xSign * (sizeOffset.width / 2) * Math.cos(initData.angle) -
        initData.ySign * (sizeOffset.height / 2) * Math.sin(initData.angle) + initData.x,
      y: -sizeOffset.height / 2 + initData.xSign * (sizeOffset.width / 2) * Math.sin(initData.angle) +
        initData.ySign * (sizeOffset.height / 2) * Math.cos(initData.angle) + initData.y
    }
  }

  getAbsPointByQuadrant(point: number[], styles: { x: number, y: number, width: number, initWidth: number }, scale: number, quadrant: number): ICoordinate {
    const { width, height, baseDegree } = shapeUtils.lineDimension(point)
    const dx = 2 * scale * Math.sin(baseDegree)
    const dy = 2 * scale * Math.cos(baseDegree)
    const ratio = styles.width / styles.initWidth
    switch (quadrant) {
      case 1:
        return { x: styles.x + dx * ratio, y: styles.y + (dy + height) * ratio }
      case 2:
        return { x: styles.x + (dx + width) * ratio, y: styles.y + (dy + height) * ratio }
      case 3:
        return { x: styles.x + (dx + width) * ratio, y: styles.y + dy * ratio }
      case 4:
        return { x: styles.x + dx * ratio, y: styles.y + dy * ratio }
      default:
        return { x: styles.x + dx * ratio, y: styles.y + dy * ratio }
    }
  }

  getAbsPointWithRespectToReferencePoint(referencePoint: ICoordinate, point: number[], styles: { width: number, initWidth: number }, scale: number, quadrant: number): ICoordinate {
    const { width, height, baseDegree } = shapeUtils.lineDimension(point)
    const dx = 2 * scale * Math.sin(baseDegree)
    const dy = 2 * scale * Math.cos(baseDegree)
    const ratio = styles.width / styles.initWidth
    switch (quadrant) {
      case 1:
        return { x: referencePoint.x - dx * ratio, y: referencePoint.y - (dy + height) * ratio }
      case 2:
        return { x: referencePoint.x - (dx + width) * ratio, y: referencePoint.y - (dy + height) * ratio }
      case 3:
        return { x: referencePoint.x - (dx + width) * ratio, y: referencePoint.y - dy * ratio }
      case 4:
        return { x: referencePoint.x - dx * ratio, y: referencePoint.y - dy * ratio }
      default:
        return { x: referencePoint.x - dx * ratio, y: referencePoint.y - dy * ratio }
    }
  }

  getTranslateCompensationForLine(markerIndex: number, referencePoint: ICoordinate, styles: { width: number, initWidth: number }, scale: number, newPoint: number[]): ICoordinate {
    const newNormalQuadrant = shapeUtils.getLineQuadrant(newPoint)
    const newQuadrantByMarkerIndex = (markerIndex === 0) ? (newNormalQuadrant - 1 + 2) % 4 + 1 : newNormalQuadrant
    // If the startMarker is dragged, take the symmetric version (w.r.t. the origin) of the quadrant
    return this.getAbsPointWithRespectToReferencePoint(referencePoint, newPoint, styles, scale, newQuadrantByMarkerIndex)
  }

  getControllerStyleParameters(point: number[], styles: { x: number, y: number, width: number, height: number, initWidth: number, rotate: number }, isLine: boolean, scale: number): { x: number, y: number, width: number, height: number, rotate: number } {
    if (isLine) {
      scale = scale ?? 1
      const { x, y, width, height } = styles
      const ratio = styles.width / styles.initWidth
      const moverHeight = Math.max(scale, generalUtils.fixSize(16)) * ratio
      const { xDiff, yDiff } = shapeUtils.lineDimension(point)
      const moverWidth = Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2)) * ratio
      const degree = Math.atan2(yDiff, xDiff) / Math.PI * 180
      return {
        x: x + (width - moverWidth) / 2,
        y: y + (height - moverHeight) / 2,
        width: moverWidth,
        height: moverHeight,
        rotate: degree
      }
    } else {
      return styles
    }
  }

  getMarkerIndex(control: { xSign: number, ySign: number }, quadrant: number) {
    if ([2, 3].includes(quadrant)) {
      return (1 - control.xSign) / 2 // -1 => 1, 1 => 0
    } else {
      return (control.xSign + 1) / 2 // -1 => 0, 1 => 1
    }
  }

  getCorRadPercentage(vSize: number[], size: number[], shapeType: string): number {
    const maxCorRad = shapeUtils.getMaxCorRad(shapeType, vSize)
    return size[1] * 100 / maxCorRad
  }

  getCorRadValue(vSize: number[], percentage: number, shapeType: string): number {
    const maxCorRad = shapeUtils.getMaxCorRad(shapeType, vSize)
    return percentage * maxCorRad / 100
  }

  shapeCategorySorter(resizers: any, category: string, scaleType: number) {
    switch (category) {
      // category: A => 只能被等比例縮放
      case 'A':
        return []
      // category: B => 等比例/非等比例縮放
      // category: C => 可被等比例縮放，也可沿着水平/垂直方向伸縮，伸縮時四個角落的形狀固定不變
      case 'B':
      case 'C':
      case 'E':
      case 'G':
        switch (scaleType) {
          case 1:
            return resizers
          case 2:
            return resizers.slice(0, 2)
          case 3:
            return resizers.slice(2, 4)
        }
        return []
    }
  }

  resizeShapeHandler(config: IShape, scale: { scaleX: number, scaleY: number }, initHW: { width: number, height: number }, width: number, height: number): [number, number] {
    const SIZE_LIMIT = 30
    switch (config.category) {
      case 'A': {
        console.warn('shape of category A should not have resizer!')
        break
      }
      case 'B': {
        let scaleX = scale.scaleX
        let scaleY = scale.scaleY
        scaleX = width / initHW.width === 1 ? scaleX : width / initHW.width * scaleX
        scaleY = height / initHW.height === 1 ? scaleY : height / initHW.height * scaleY
        this.updateLayerScale(layerUtils.pageIndex, layerUtils.layerIndex, scaleX, scaleY)
        break
      }
      case 'C': {
        const scale = config.styles.scale
        let patchDiffX = width * config.ratio / scale - config.vSize[0]
        let patchDiffY = height * config.ratio / scale - config.vSize[1]
        const pSize = config.pSize
        switch (config.scaleType) {
          case 1:
            if (pSize && (pSize[0] + patchDiffX < SIZE_LIMIT || pSize[1] + patchDiffY < SIZE_LIMIT)) {
              patchDiffX = pSize[0] + patchDiffX < SIZE_LIMIT ? SIZE_LIMIT - pSize[0] : patchDiffX
              patchDiffY = pSize[1] + patchDiffY < SIZE_LIMIT ? SIZE_LIMIT - pSize[1] : patchDiffY
              width = patchDiffX === SIZE_LIMIT - pSize[0] ? (patchDiffX + config.vSize[0]) * scale / config.ratio : width
              height = patchDiffY === SIZE_LIMIT - pSize[1] ? (patchDiffY + config.vSize[1]) * scale / config.ratio : height
            }
            break
          case 2:
            if (pSize && pSize[0] + patchDiffX < SIZE_LIMIT) {
              patchDiffX = pSize[0] + patchDiffX < SIZE_LIMIT ? SIZE_LIMIT - pSize[0] : patchDiffX
              width = patchDiffX === SIZE_LIMIT - pSize[0] ? (patchDiffX + config.vSize[0]) * scale / config.ratio : width
            }
            break
          case 3:
            if (pSize && pSize[1] + patchDiffY < SIZE_LIMIT) {
              patchDiffY = pSize[1] + patchDiffY < SIZE_LIMIT ? SIZE_LIMIT - pSize[1] : patchDiffY
              height = patchDiffY === SIZE_LIMIT - pSize[1] ? (patchDiffY + config.vSize[1]) * scale / config.ratio : height
            }
        }
        this.updateShapePatchDiff(layerUtils.pageIndex, layerUtils.layerIndex, [patchDiffX, patchDiffY])
        this.updateLayerInitSize(layerUtils.pageIndex, layerUtils.layerIndex, width / scale, height / scale, scale)
        break
      }
      case 'G': {
        const scale = config.styles.scale
        let patchDiffX = width * config.ratio / scale - config.vSize[0]
        let patchDiffY = height * config.ratio / scale - config.vSize[1]
        const pDiff = config.pDiff
        switch (config.scaleType) {
          case 1:
            if (pDiff) {
              patchDiffX = Math.max(patchDiffX, config.pDiffLimits?.[0] ?? 0)
              patchDiffY = Math.max(patchDiffY, config.pDiffLimits?.[1] ?? 0)
              width = (patchDiffX + config.vSize[0]) * scale / config.ratio
              height = (patchDiffY + config.vSize[1]) * scale / config.ratio
            }
            break
          case 2:
            if (pDiff) {
              patchDiffX = Math.max(patchDiffX, config.pDiffLimits?.[0] ?? 0)
              width = (patchDiffX + config.vSize[0]) * scale / config.ratio
            }
            break
          case 3:
            if (pDiff) {
              patchDiffY = Math.max(patchDiffY, config.pDiffLimits?.[1] ?? 0)
              height = (patchDiffY + config.vSize[1]) * scale / config.ratio
            }
        }
        this.updateShapePatchDiff(layerUtils.pageIndex, layerUtils.layerIndex, [patchDiffX, patchDiffY])
        this.updateLayerInitSize(layerUtils.pageIndex, layerUtils.layerIndex, width / scale, height / scale, scale)
        break
      }
    }
    return [width, height]
  }

  /**
   * This function determine if the point 'c' is on the left-hand-side of the line p1_p2
   */
  private isOnLeftHandSide(p1: ICoordinate, p2: ICoordinate, c: ICoordinate) {
    const p1_p2 = {
      x: p2.x - p1.x,
      y: p2.y - p1.y
    }
    const p1_c = {
      x: c.x - p1.x,
      y: c.y - p1.y
    }
    return p1_p2.x * p1_c.y - p1_p2.y * p1_c.x > 0
  }

  isClickOnController(e: MouseEvent, layerIndex = layerUtils.layerIndex, subLayerIdx = -1): boolean {
    const layer = document.getElementById(`nu-layer_${layerUtils.pageIndex}_${layerIndex}_${subLayerIdx}`) as HTMLElement
    if (layer) {
      const rect = layer.getBoundingClientRect()
      const c = { x: e.clientX, y: e.clientY }
      const { x: x0, y: y0, width: W, height: H } = rect
      const sinT = mathUtils.sin(layerUtils.getCurrLayer.styles.rotate % 90)
      const cosT = mathUtils.cos(layerUtils.getCurrLayer.styles.rotate % 90)
      const w = (H * sinT - W * cosT) / (sinT * sinT - cosT * cosT)
      const h = (H * cosT - W * sinT) / (cosT * cosT - sinT * sinT)
      const yt = y0
      const yb = y0 + H
      const xl = x0
      const xr = x0 + W
      const p1 = {
        x: xl + h * sinT,
        y: yt
      }
      const p2 = {
        x: xr,
        y: yt + w * sinT
      }
      const p3 = {
        x: xr - h * sinT,
        y: yb
      }
      const p4 = {
        x: xl,
        y: yb - w * sinT
      }
      return this.isOnLeftHandSide(p1, p2, c) &&
        this.isOnLeftHandSide(p2, p3, c) &&
        this.isOnLeftHandSide(p3, p4, c) &&
        this.isOnLeftHandSide(p4, p1, c)
    }
    return false
  }

  updateImgPos(pageIndex: number, layerIndex: number, imgX: number, imgY: number) {
    store.commit('UPDATE_layerStyles', {
      pageIndex,
      layerIndex,
      styles: {
        imgX,
        imgY
      }
    })
  }

  updateImgSize(pageIndex: number, layerIndex: number, imgWidth: number, imgHeight: number) {
    store.commit('UPDATE_layerStyles', {
      pageIndex,
      layerIndex,
      styles: {
        imgWidth,
        imgHeight
      }
    })
  }

  updateLayerProps(pageIndex: number, layerIndex: number, props: { [key: string]: number | string | boolean }) {
    store.commit('UPDATE_layerProps', {
      pageIndex,
      layerIndex,
      props
    })
  }

  updateLayerPos(pageIndex: number, layerIndex: number, x: number, y: number) {
    store.commit('UPDATE_layerStyles', {
      pageIndex,
      layerIndex,
      styles: {
        x,
        y
      }
    })
  }

  updateLayerSize(pageIndex: number, layerIndex: number, width: number, height: number, scale: number) {
    store.commit('UPDATE_layerStyles', {
      pageIndex,
      layerIndex,
      styles: {
        width,
        height,
        scale
      }
    })
  }

  updateLayerScale(pageIndex: number, layerIndex: number, scaleX: number, scaleY: number) {
    store.commit('UPDATE_layerStyles', {
      pageIndex,
      layerIndex,
      styles: {
        scaleX,
        scaleY
      }
    })
  }

  updateLayerRotate(pageIndex: number, layerIndex: number, rotate: number) {
    store.commit('UPDATE_layerStyles', {
      pageIndex,
      layerIndex,
      styles: {
        rotate
      }
    })
  }

  updateLayerInitSize(pageIndex: number, layerIndex: number, initWidth: number, initHeight: number, initSize: number) {
    store.commit('UPDATE_layerStyles', {
      pageIndex,
      layerIndex,
      styles: {
        initWidth,
        initHeight,
        initSize
      }
    })
  }

  updateImgClipPath(pageIndex: number, layerIndex: number, clipPath: string) {
    store.commit('UPDATE_layerProps', {
      pageIndex,
      layerIndex,
      props: {
        clipPath
      }
    })
  }

  updateShapePatchDiff(pageIndex: number, layerIndex: number, pDiff: number[]) {
    store.commit('UPDATE_layerProps', {
      pageIndex,
      layerIndex,
      props: {
        pDiff
      }
    })
  }

  updateShapeLinePoint(pageIndex: number, layerIndex: number, point: number[]) {
    store.commit('UPDATE_layerProps', {
      pageIndex,
      layerIndex,
      props: {
        point
      }
    })
  }

  updateShapeVSize(pageIndex: number, layerIndex: number, vSize: number[]) {
    store.commit('UPDATE_layerProps', {
      pageIndex,
      layerIndex,
      props: {
        vSize
      }
    })
  }

  updateShapeCorRad(pageIndex: number, layerIndex: number, size: number[], corRad: number) {
    store.commit('UPDATE_layerProps', {
      pageIndex,
      layerIndex,
      props: {
        size: [size[0], corRad]
      }
    })
  }
}

export default new Controller()
