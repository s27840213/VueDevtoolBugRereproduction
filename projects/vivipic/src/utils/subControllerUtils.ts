import { IFrame, IGroup, IImage, ILayer, ITmp } from '@/interfaces/layer'
import store from '@/store'
import { FunctionPanelType, ILayerInfo, LayerType } from '@/store/types'
import colorUtils from './colorUtils'
import eventUtils, { PanelEvent } from './eventUtils'
import formatUtils from './formatUtils'
import frameUtils from './frameUtils'
import generalUtils from './generalUtils'
import groupUtils from './groupUtils'
import imageUtils from './imageUtils'
import layerUtils from './layerUtils'
import tiptapUtils from './tiptapUtils'

export default class SubControllerUtils {
  // private component = undefined as Vue | undefined
  private component = undefined as any | undefined
  private body = undefined as unknown as HTMLElement
  private _config = { config: null as unknown as ILayer, primaryLayer: null as unknown as IGroup | ITmp | IFrame }
  private layerInfo = { pageIndex: layerUtils.pageIndex, layerIndex: layerUtils.layerIndex, subLayerIdx: layerUtils.subLayerIdx } as ILayerInfo
  private dblTapFlag = false
  private touches = new Set()
  private posDiff = { x: 0, y: 0 }
  private _onMouseup = null as unknown
  private _cursorDragEnd = null as unknown
  private get config(): ILayer { return this._config.config }
  private get primaryLayer(): IGroup | ITmp | IFrame { return this._config.primaryLayer }
  private get pageIndex(): number { return this.layerInfo.pageIndex }
  private get layerIndex(): number { return this.layerInfo.layerIndex }
  private get subLayerIdx(): number { return this.layerInfo.subLayerIdx ?? -1 }
  // private get primaryLayer(): IGroup | IFrame | ITmp { return layerUtils.getLayer(this.pageIndex, this.layerIndex) as IGroup | IFrame | ITmp }
  private get primaryActive(): boolean { return this.primaryLayer.active }

  constructor({ _config, body, layerInfo }: { _config: { config: ILayer, primaryLayer: IGroup | ITmp | IFrame }, body: HTMLElement, layerInfo?: ILayerInfo, component?: any }) {
    this._config = _config
    this.body = body
    layerInfo && (this.layerInfo = layerInfo)
  }

  onPointerdown(e: PointerEvent) {
    if (this.primaryLayer.type === 'tmp') {
      if (generalUtils.exact([e.shiftKey, e.ctrlKey, e.metaKey])) {
        groupUtils.deselectTargetLayer(this.subLayerIdx)
      }
      if (groupUtils.inMultiSelecitonMode) {
        this._onMouseup = this.onMouseup.bind(this)
        eventUtils.addPointerEvent('pointerup', this._onMouseup)
      }
      return
    }
    if (store.getters['mobileEditor/getIsPinchingEditor']) return
    if (groupUtils.inMultiSelecitonMode && ['tmp', 'frame'].includes(this.primaryLayer.type)) {
      this._onMouseup = this.onMouseup.bind(this)
      eventUtils.addPointerEvent('pointerup', this._onMouseup)
    }
    if (e.button !== 0) return

    if (!this.touches.has(e.pointerId)) {
      this.touches.add(e.pointerId)
    }

    if (imageUtils.isImgControl()) {
      imageUtils.setImgControlDefault()
    }
    if (generalUtils.isTouchDevice()) {
      if (!this.dblTapFlag && this.config.active && this.config.type === 'image') {
        const touchtime = Date.now()
        const interval = 500
        const doubleTap = (e: PointerEvent) => {
          e.preventDefault()
          if (Date.now() - touchtime < interval && !this.dblTapFlag && this.touches.size === 1) {
            /**
             * This is the dbl-click callback block
             */
            if (this.config.type === LayerType.image) {
              switch (this.primaryLayer.type) {
                case LayerType.group:
                  layerUtils.updateLayerProps(this.pageIndex, this.layerIndex, { imgControl: true }, this.subLayerIdx)
                  break
                case LayerType.frame:
                  if ((this.config as IImage).srcObj.type !== 'frame') {
                    frameUtils.updateFrameLayerProps(this.pageIndex, this.layerIndex, this.subLayerIdx, { imgControl: true })
                  }
                  break
              }
              eventUtils.emit(PanelEvent.switchTab, 'crop')
            }
            this.dblTapFlag = true
          }
        }
        this.body.addEventListener('pointerdown', doubleTap)
        setTimeout(() => {
          this.body.removeEventListener('pointerdown', doubleTap)
          this.dblTapFlag = false
        }, interval)
      }
    }
    if (store.getters.getCurrFunctionPanelType === FunctionPanelType.photoShadow) {
      groupUtils.deselect()
      groupUtils.select(this.pageIndex, [this.layerIndex])
      layerUtils.updateLayerProps(this.pageIndex, this.layerIndex, { active: true }, this.subLayerIdx)
      eventUtils.emit(PanelEvent.showPhotoShadow)
    }

    formatUtils.applyFormatIfCopied(this.pageIndex, this.layerIndex, this.subLayerIdx)
    formatUtils.clearCopiedFormat()
    if (this.config.type === 'text') {
      this.posDiff.x = this.primaryLayer.styles.x
      this.posDiff.y = this.primaryLayer.styles.y
      if (this.config?.active && this.config.contentEditable) {
        layerUtils.updateSubLayerProps(this.pageIndex, this.layerIndex, this.subLayerIdx, { isDraggingCursor: true })
        this._cursorDragEnd = this.onCursorDragEnd.bind(this)
        eventUtils.addPointerEvent('pointerup', this._cursorDragEnd)
        return
      } else if (!this.config?.active) {
        // this.isControlling = true
        layerUtils.updateSubLayerProps(this.pageIndex, this.layerIndex, this.subLayerIdx, { contentEditable: false })
        this._onMouseup = this.onMouseup.bind(this)
        eventUtils.addPointerEvent('pointerup', this._onMouseup)
        return
      }
      layerUtils.updateSubLayerProps(this.pageIndex, this.layerIndex, this.subLayerIdx, { contentEditable: true })
    }
    this._onMouseup = this.onMouseup.bind(this)
    eventUtils.addPointerEvent('pointerup', this._onMouseup)
  }

  onCursorDragEnd(e: PointerEvent) {
    layerUtils.updateSubLayerProps(this.pageIndex, this.layerIndex, this.subLayerIdx, { isDraggingCursor: false })
    eventUtils.removePointerEvent('pointerup', this._cursorDragEnd)
  }

  onMouseup(e: PointerEvent) {
    this.touches.delete(e.pointerId)

    eventUtils.removePointerEvent('pointerup', this._onMouseup)
    e.stopPropagation()
    if (!this.primaryLayer.active) return
    if (this.config.type === 'text') {
      this.posDiff.x = this.primaryLayer.styles.x - this.posDiff.x
      this.posDiff.y = this.primaryLayer.styles.y - this.posDiff.y
      if (this.posDiff.x !== 0 || this.posDiff.y !== 0) {
        layerUtils.updateSubLayerProps(this.pageIndex, this.layerIndex, this.subLayerIdx, { contentEditable: false })
      } else {
        if (this.config.contentEditable) {
          layerUtils.updateLayerProps(this.pageIndex, this.layerIndex, { isTyping: true }, this.subLayerIdx)
          if (generalUtils.isTouchDevice()) {
            tiptapUtils.focus({ scrollIntoView: false }, 'end')
          } else {
            tiptapUtils.focus({ scrollIntoView: false })
          }
        }
      }
    }
    colorUtils.event.emit('closeColorPanel', false)
    let updateSubLayerProps = null as any
    let layers = null as any
    switch (this.primaryLayer.type) {
      case 'group':
        updateSubLayerProps = layerUtils.updateSubLayerProps
        layers = (layerUtils.getCurrLayer as IGroup).layers
        break
      case 'frame':
        if (layerUtils.getCurrLayer.type === 'group') {
          // @TODO: this means the frame is in the group and the sub-clip is clicked
          return
        }
        updateSubLayerProps = frameUtils.updateFrameLayerProps
        layers = (layerUtils.getCurrLayer as IFrame).clips
    }

    if (!store.getters['shadow/isHandling'] && this.primaryActive && !store.state.isMoving) {
      if (groupUtils.inMultiSelecitonMode && this.primaryLayer.type !== 'frame') {
        groupUtils.deselectTargetLayer(this.subLayerIdx)
        return
      }
      if (layerUtils.layerIndex !== -1) {
        for (let idx = 0; idx < layers.length; idx++) {
          if (idx !== this.subLayerIdx) {
            updateSubLayerProps(this.pageIndex, this.layerIndex, idx, { active: false })
          }
        }
      }
      if ((this.primaryLayer.type === LayerType.frame && !(this.primaryLayer as IFrame).clips[this.subLayerIdx].active) ||
        (this.primaryLayer.type === LayerType.group && !(this.primaryLayer as IGroup).layers[this.subLayerIdx].active)) {
        updateSubLayerProps(this.pageIndex, this.layerIndex, this.subLayerIdx, { active: true })
      }
      layerUtils.setCurrSubSelectedInfo(this.subLayerIdx, this.config.type)
    }
  }
}