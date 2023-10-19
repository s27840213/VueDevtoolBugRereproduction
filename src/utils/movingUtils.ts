import { ICoordinate } from '@/interfaces/frame'
import { AllLayerTypes, IFrame, IGroup, IImage, ILayer, IShape, IStyle, IText, ITmp } from '@/interfaces/layer'
import store from '@/store'
import { FunctionPanelType, ILayerInfo, LayerType } from '@/store/types'
import pointerEvtUtils from '@/utils/pointerEvtUtils'
import { nextTick } from 'vue'
import controlUtils from './controlUtils'
import eventUtils, { PanelEvent } from './eventUtils'
import formatUtils from './formatUtils'
import generalUtils from './generalUtils'
import groupUtils from './groupUtils'
import layerUtils from './layerUtils'
import mathUtils from './mathUtils'
import mouseUtils from './mouseUtils'
import pageUtils from './pageUtils'
import shortcutUtils from './shortcutUtils'
import stepsUtils from './stepsUtils'
import tiptapUtils from './tiptapUtils'

export class MovingUtils {
  isControlling = false
  private component = undefined as any | undefined
  // private component = undefined as Vue | undefined
  private eventTarget = null as unknown as HTMLElement
  private _config = { config: null as unknown as ILayer }
  private initialPos = { x: 0, y: 0 } as ICoordinate | null
  // this flag used to indicate the real initial position of at the beginning of moveStart
  private _initPos = { x: 0, y: 0 } as ICoordinate | null
  private initTranslate = { x: 0, y: 0 }
  private pointerId = 0
  // private initPageTranslate = { x: 0, y: 0 }
  private movingByControlPoint = false
  private isDoingGestureAction = false
  private isHandleMovingHandler = false
  private snapUtils = null as any
  private body = undefined as unknown as HTMLElement
  private _moving = null as unknown
  private _moveEnd = null as unknown
  private _cursorDragEnd = null as unknown
  private layerInfo = { pageIndex: layerUtils.pageIndex, layerIndex: layerUtils.layerIndex, subLayerIdx: layerUtils.subLayerIdx } as ILayerInfo
  private isFollowByPinch = false

  private isTouchDevice = generalUtils.isTouchDevice()
  private isClickOnController = false

  private get isBgImgCtrl(): boolean { return store.getters['imgControl/isBgImgCtrl'] }
  private get config(): ILayer { return this._config.config }
  private get inMultiSelectionMode(): number { return store.getters['mobileEditor/getInMultiSelectionMode'] }
  private get currFunctionPanelType(): number { return store.getters.getCurrFunctionPanelType }
  private get currSelectedInfo(): any { return store.getters.getCurrSelectedInfo }
  private get scaleRatio(): number { return store.getters.getPageScaleRatio }
  private get currHoveredPageIndex(): number { return store.getters.getCurrHoveredPageIndex }
  private get isActive(): boolean { return this.config.active }
  private get isControllerShown(): boolean { return this.isActive && !store.getters['vivisticker/getControllerHidden'] }
  private get getLayerType(): string { return this.config.type }
  private get pageIndex(): number { return this.layerInfo.pageIndex }
  private get layerIndex(): number { return this.layerInfo.layerIndex }
  private get subLayerIdx(): number { return this.layerInfo.subLayerIdx ?? -1 }
  private get isLocked(): boolean { return this.config.locked }
  private get contentEditable(): boolean { return (this.config as any).contentEditable || false }
  private get getLayerPos(): ICoordinate { return { x: this.config.styles.x, y: this.config.styles.y } }
  private get isDragging(): boolean { return this.config.dragging }
  private get isImgControl(): boolean {
    switch (this.getLayerType) {
      case 'image':
        return (this.config as IImage).imgControl
      case 'group':
        return (this.config as IGroup).layers
          .some(layer => {
            return layer.type === 'image' && layer.imgControl
          })
      case 'frame':
        return (this.config as IFrame).clips
          .some(layer => {
            return layer.imgControl
          })
    }
    return false
  }

  private initPageTranslate = { x: 0, y: 0 }
  private id = ''

  constructor({ _config, snapUtils, component, body, layerInfo }: { _config: { config: ILayer }, snapUtils: unknown, component?: any, body: HTMLElement, layerInfo?: ILayerInfo }) {
    this._config = _config
    this.snapUtils = snapUtils
    this.body = body
    this.id = generalUtils.generateRandomString(4)
    component && (this.component = component)
    layerInfo && (this.layerInfo = layerInfo)
  }

  private setMoving = (bool: boolean) => store.commit('SET_moving', bool)
  private setBgConfig = (pageIndex?: number) => store.commit('imgControl/SET_BG_CONFIG', pageIndex)
  private setLastSelectedLayerIndex = (layerIndex: number) => store.commit('SET_lastSelectedLayerIndex', layerIndex)
  private setCursorStyle(e: Event, cursor: string) {
    if (this.body) {
      this.body.style.cursor = cursor
    }
  }

  updateProps({ _config, body }: { _config: { config: ILayer }, body: HTMLElement }) {
    this._config = _config
    this.body = body
  }

  disableTouchEvent(e: TouchEvent) {
    if (this.isTouchDevice) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  pageMoveStart(e: PointerEvent) {
    if (store.getters['mobileEditor/getIsPinchingEditor']) return

    this.initPageTranslate.x = pageUtils.getCurrPage.x
    this.initPageTranslate.y = pageUtils.getCurrPage.y

    this.removeListener()
    if (e.type === 'pinch') {
      this.initialPos = null
    } else {
      this.initialPos = mouseUtils.getMouseAbsPoint(e)
    }
    this._moving = this.pageMoving.bind(this)
    this._moveEnd = this.pageMoveEnd.bind(this)
    eventUtils.addPointerEvent('pointerup', this._moveEnd)
    eventUtils.addPointerEvent('pointermove', this._moving)
  }

  pageMoving(e: PointerEvent) {
    if (store.getters['mobileEditor/getIsPinchingEditor'] || store.getters.getControlState.type === 'pinch') {
      this.removeListener()
      return
    }
    window.requestAnimationFrame(() => {
      this.pageMovingHandler(e)
    })
  }

  pageMoveEnd(e: PointerEvent) {
    this.removeListener()
  }

  moveStart(event: MouseEvent | TouchEvent | PointerEvent, params?: { pointerId?: number, isFollowByPinch?: boolean }) {
    const { pointerId, isFollowByPinch = false } = params || {}
    const eventType = eventUtils.getEventType(event)
    if (eventType === 'pointer') {
      pointerEvtUtils.addPointer(event as PointerEvent)
    }
    console.warn('moveStart', eventUtils.checkIsMultiTouch(event), store.getters['mobileEditor/getIsPinchingEditor'], store.getters.getControlState.type)
    if (this.isImgControl) return
    if (eventUtils.checkIsMultiTouch(event)) return
    if (store.getters['mobileEditor/getIsPinchingEditor'] || store.getters.getControlState.type) return

    store.commit('SET_STATE', {
      controlState: {
        layerInfo: this.layerInfo,
        type: 'move',
        id: this.id
      }
    })

    if (pointerId) {
      this.pointerId = pointerId
    } else if (eventUtils.getEventType(event) === 'pointer') {
      this.pointerId = (event as PointerEvent).pointerId
    }

    this.isFollowByPinch = isFollowByPinch
    this.initTranslate.x = this.getLayerPos.x
    this.initTranslate.y = this.getLayerPos.y
    this._initPos = mouseUtils.getMouseAbsPoint(event)
    this.initPageTranslate.x = pageUtils.getCurrPage.x
    this.initPageTranslate.y = pageUtils.getCurrPage.y
    const currLayerIndex = layerUtils.layerIndex

    formatUtils.applyFormatIfCopied(this.pageIndex, this.layerIndex)
    formatUtils.clearCopiedFormat()

    if (currLayerIndex !== this.layerIndex) {
      const layer = layerUtils.getLayer(this.pageIndex, currLayerIndex)
      if (layer.type === 'image' && layer.imgControl) {
        layerUtils.updateLayerProps(this.pageIndex, currLayerIndex, { imgControl: false })
      } else if (layer.type === 'group') {
        (layer as IGroup).layers
          .forEach((l, i) => {
            if (l.type === 'image' && l.imgControl) {
              layerUtils.updateLayerProps(this.pageIndex, currLayerIndex, { imgControl: false }, i)
            }
          })
      }
    }
    if (this.isBgImgCtrl) {
      this.setBgConfig(undefined)
    }
    /**
     * used for frame layer for entering detection
     * This is used for moving image to replace frame element
     */
    this.eventTarget = (event.target as HTMLElement)
    if (event.type === 'pointerdown') {
      this.eventTarget.releasePointerCapture((event as PointerEvent).pointerId)
    }

    if (this.isTouchDevice && !this.config.locked) {
      this.isClickOnController = controlUtils.isClickOnController(event as MouseEvent)
      event.stopPropagation()
    }
    if (eventType === 'pointer') {
      const pointerEvent = event as PointerEvent
      if (pointerEvent.button !== 0) return
    } else if (eventType === 'mouse') {
      const mouseEvent = event as MouseEvent
      if (mouseEvent.button !== 0) return
    }
    if (this.currFunctionPanelType === FunctionPanelType.photoShadow) {
      eventUtils.emit(PanelEvent.showPhotoShadow, '')
    }
    /**
     * @Note - in Mobile version, we can't select the layer directly, we should make it active first
     * The exception is that we are in multi-selection mode
     */
    if (this.isTouchDevice && !this.isControllerShown && !this.isLocked && !this.inMultiSelectionMode) {
      this.eventTarget.addEventListener('touchstart', this.disableTouchEvent)
      this.initialPos = mouseUtils.getMouseAbsPoint(event)
      this._moving = this.moving.bind(this)
      this._moveEnd = this.moveEnd.bind(this)
      eventUtils.addPointerEvent('pointerup', this._moveEnd)
      eventUtils.addPointerEvent('pointermove', this._moving)
      return
    }

    this.movingByControlPoint = false
    const inCopyMode = (generalUtils.exact([event.altKey])) && !this.contentEditable
    const inSelectionMode = (generalUtils.exact([event.shiftKey, event.ctrlKey, event.metaKey])) && !this.contentEditable && !inCopyMode
    const { inMultiSelectionMode } = this
    if (!this.isLocked) {
      event.stopPropagation()
    }

    if (inCopyMode) {
      shortcutUtils.altDuplicate(this.pageIndex, this.layerIndex, this.config)
    }

    switch (this.getLayerType) {
      case 'text': {
        const targetClassList = (event.target as HTMLElement).classList
        const isMoveBar = targetClassList.contains('control-point__move-bar')
        const isMover = targetClassList.contains('control-point__mover')

        // if the text layer is already active and contentEditable
        if (this.isControllerShown && !inSelectionMode && this.contentEditable && !isMoveBar && !isMover) {
          layerUtils.updateLayerProps(this.pageIndex, this.layerIndex, { isDraggingCursor: true })
          this._cursorDragEnd = this.onCursorDragEnd.bind(this)
          eventUtils.addPointerEvent('pointerup', this._cursorDragEnd)
          return
        } else if (!this.isControllerShown) {
          let targetIndex = this.layerIndex
          if (!inSelectionMode && !inMultiSelectionMode) {
            groupUtils.deselect()
            targetIndex = this.config.styles.zindex - 1
            this.setLastSelectedLayerIndex(this.layerIndex)
            groupUtils.select(this.pageIndex, [targetIndex])
          } else if (this.pageIndex === pageUtils.currFocusPageIndex) {
            groupUtils.select(this.pageIndex, [targetIndex])
          }
          if (!this.config.locked) {
            this.isControlling = true
            this.initialPos = mouseUtils.getMouseAbsPoint(event)
            this._moving = this.moving.bind(this)
            this._moveEnd = this.moveEnd.bind(this)
            eventUtils.addPointerEvent('pointerup', this._moveEnd)
            eventUtils.addPointerEvent('pointermove', this._moving)
          }
          return
        }

        /**
         * The cotentEditable updated timing will be move to the moveEnd instead of moveStart
         * bcz if we set it to true when moveStart and we want to move the layer instead of editing the text, it will still make the mobile keyboard show up
         */

        if (isMover || isMoveBar) {
          this.movingByControlPoint = true
        } else if (!this.isTouchDevice) {
          layerUtils.updateLayerProps(this.pageIndex, this.layerIndex, { contentEditable: true })
        }

        break
      }
    }

    /**
     * @Note InMultiSelection mode should still can move the layer
     */
    if (!this.config.locked && !inSelectionMode) {
      this.initialPos = mouseUtils.getMouseAbsPoint(event)
      this._moving = this.moving.bind(this)
      this._moveEnd = this.moveEnd.bind(this)
      eventUtils.addPointerEvent('pointerup', this._moveEnd)
      eventUtils.addPointerEvent('pointermove', this._moving)
    }
    if (this.config.type !== 'tmp') {
      let targetIndex = this.layerIndex
      if (this.isControllerShown && this.currSelectedInfo.layers.length === 1) {
        if (inSelectionMode) {
          groupUtils.deselect()
          targetIndex = this.config.styles.zindex - 1
          this.setLastSelectedLayerIndex(this.layerIndex)
        }
      } else if (!this.isControllerShown) {
        // already have selected layer
        if (this.currSelectedInfo.index >= 0) {
          // Did not press shift/cmd/ctrl key -> deselect selected layers first
          if (!inSelectionMode && !inMultiSelectionMode) {
            groupUtils.deselect()
            targetIndex = this.config.styles.zindex - 1
            this.setLastSelectedLayerIndex(this.layerIndex)
            groupUtils.select(this.pageIndex, [targetIndex])
          } else {
            // this if statement is used to prevent select the layer in another page
            if (this.pageIndex === pageUtils.currFocusPageIndex && !this.config.locked) {
              if (!layerUtils.getCurrLayer.locked) {
                groupUtils.select(this.pageIndex, [targetIndex])
              }
            }
          }
        } else {
          targetIndex = this.config.styles.zindex - 1
          this.setLastSelectedLayerIndex(this.layerIndex)
          groupUtils.select(this.pageIndex, [targetIndex])
        }
      }
    }
    // console.log('move start end', (event as any).pointerId, this.initialPos?.x, this.initialPos?.y)
  }

  moving(e: MouseEvent | TouchEvent | PointerEvent) {
    const isPointer = eventUtils.getEventType(e) === 'pointer'
    const isStartedPointer = isPointer && this.pointerId === (e as PointerEvent).pointerId
    const isSinglePointer = pointerEvtUtils.pointers.length <= 1
    if ((!isPointer || !isStartedPointer) || !isSinglePointer || store.getters['mobileEditor/getIsPinchingEditor'] || store.getters.getControlState.type === 'pinch' || this.initialPos === null) {
      if (store.getters.getControlState.type === 'pinch') {
        // if the pinch is started, the moving logic should be turn off
        // this.moveEnd(e)
        this.removeListener()
        if (store.getters.getControlState.id === this.id) {
          store.commit('SET_STATE', { controlState: { type: '' } })
        }
      }
      return
    }
    this.isControlling = true
    switch (this.config.type) {
      case LayerType.group:
        if ((this.config as IGroup).layers.some(l => l.active && l.type === LayerType.text && l.contentEditable && l.isTyping)) {
          return
        }
    }

    const updateConfigData = {} as Partial<IText | IImage | IShape>
    if (!this.isDragging) {
      updateConfigData.dragging = true
      // this.component && this.component.$emit('isDragging', this.layerIndex)
    }
    if (this.isControllerShown) {
      if (generalUtils.getEventType(e) !== 'touch') {
        e.preventDefault()
      }
      this.setCursorStyle(e, 'move')

      if (!this.isHandleMovingHandler) {
        window.requestAnimationFrame(() => {
          this.movingHandler(e)
          this.isHandleMovingHandler = false
        })
        this.isHandleMovingHandler = true
      }
      const posDiff = {
        x: Math.abs(this.getLayerPos.x - this.initTranslate.x),
        y: Math.abs(this.getLayerPos.y - this.initTranslate.y)
      }
      const hasActualMove = posDiff.x !== 0 || posDiff.y !== 0
      if (hasActualMove) {
        if (!this.config.moving || !store.state.isMoving) {
          updateConfigData.moving = true
          this.setMoving(true)
        }
        if (this.getLayerType === 'text' && this.config.contentEditable) {
          layerUtils.updateLayerProps(this.pageIndex, this.layerIndex, { contentEditable: false })
        }
      }
    } else {
      // this condition will only happen in Mobile
      const posDiff = {
        x: Math.abs(mouseUtils.getMouseAbsPoint(e).x - this.initialPos.x),
        y: Math.abs(mouseUtils.getMouseAbsPoint(e).y - this.initialPos.y)
      }
      if (this.isTouchDevice && !this.isLocked) {
        if (posDiff.x > 1 || posDiff.y > 1) {
          this.isDoingGestureAction = true
          window.requestAnimationFrame(() => {
            this.movingHandler(e)
            this.isHandleMovingHandler = false
          })
          return
        }
        // vivisticker doesn't have page moving feature
        // const { mobileSize } = editorUtils
        // const { getCurrPage: page, scaleRatio } = pageUtils
        // const isPageFullyInsideEditor = page.width * scaleRatio * 0.01 * page.contentScaleRatio < mobileSize.width &&
        //   page.height * scaleRatio * 0.01 * page.contentScaleRatio < mobileSize.height
        // // const isPageReachEdge = pageRect.width + pageUtils.getCurrPage.x + 15
        // if (!isPageFullyInsideEditor) {
        //   // if (layerUtils.layerIndex === -1 && !isPageFullyInsideEditor) {
        //   window.requestAnimationFrame(() => {
        //     this.pageMovingHandler(e)
        //   })
        // }
      } else {
        if (posDiff.x < 1 && posDiff.y < 1) {
          return
        }
      }
    }
    layerUtils.updateLayerProps(this.pageIndex, this.layerIndex, updateConfigData)
  }

  movingHandler(e: MouseEvent | TouchEvent | PointerEvent) {
    if (this.initialPos === null) return

    // target overlay means the current layer is overlaying above the target layer.
    const isTargetOverlay = this.layerIndex === layerUtils.layerIndex
    const config = isTargetOverlay ? this.config : layerUtils.getCurrLayer
    const targetLayerIdx = layerUtils.layerIndex
    if (Object.values(config).length === 0) {
      /**
       * if the layer is deleted the config will be empty object
       */
      eventUtils.removePointerEvent('pointerup', this._moveEnd)
      eventUtils.removePointerEvent('pointermove', this._moving)
      return
    }
    if (!this.config.moved) {
      layerUtils.updateLayerProps(this.pageIndex, targetLayerIdx, { moved: true })
    }
    const offsetPos = mouseUtils.getMouseRelPoint(e, this.initialPos)
    let offsetRatio = 100 / store.getters.getPageScaleRatio
    if (generalUtils.isTouchDevice()) {
      offsetRatio *= 1 / store.getters.getContentScaleRatio
    }

    const moveOffset = mathUtils.getActualMoveOffset(offsetPos.x, offsetPos.y, offsetRatio)

    const isLine = config.type === 'shape' && config.category === 'D'
    const _updateStyles = {
      x: config.styles.x + moveOffset.offsetX,
      y: config.styles.y + moveOffset.offsetY,
      width: config.styles.width,
      height: config.styles.height,
      initWidth: config.styles.initWidth,
      initHeight: config.styles.initHeight,
      rotate: config.styles.rotate
    } as IStyle
    const offsetSnap = this.snapUtils.calcMoveSnap(_updateStyles, isLine ? config : undefined)

    const totalOffset = {
      x: offsetPos.x + (offsetSnap.x / offsetRatio),
      y: offsetPos.y + (offsetSnap.y / offsetRatio)
    }
    this.initialPos.x += totalOffset.x
    this.initialPos.y += totalOffset.y

    if (offsetSnap.x || offsetSnap.y) {
      this.snapUtils.event.emit(`getClosestSnaplines-${this.snapUtils.id}`)
      layerUtils.updateLayerStyles(this.pageIndex, targetLayerIdx, {
        x: _updateStyles.x + offsetSnap.x,
        y: _updateStyles.y + offsetSnap.y
      })
    } else {
      layerUtils.updateLayerStyles(this.pageIndex, targetLayerIdx, {
        x: _updateStyles.x,
        y: _updateStyles.y
      })
    }
  }

  pageMovingHandler(e: MouseEvent | TouchEvent | PointerEvent) {
    // vivisticker doesn't have page moving feature
    // if (store.state.isPageScaling || this.scaleRatio <= pageUtils.mobileMinScaleRatio) {
    //   return
    // }
    // if (this.initialPos === null) {
    //   this.initialPos = mouseUtils.getMouseAbsPoint(e)
    //   return
    // }
    // const { getCurrPage: page } = pageUtils
    // const contentScaleRatio = store.getters.getContentScaleRatio
    // const pageScaleRatio = store.state.pageScaleRatio * 0.01
    // const EDGE_WIDTH = {
    //   x: (editorUtils.mobileSize.width - page.width * contentScaleRatio) * 0.5,
    //   y: (editorUtils.mobileSize.height - page.height * contentScaleRatio) * 0.5
    // }
    // const offsetPos = mouseUtils.getMouseRelPoint(e, this.initialPos)

    // const isReachLeftEdge = page.x >= EDGE_WIDTH.x && offsetPos.x > 0
    // const isReachRightEdge = page.x <= editorUtils.mobileSize.width - page.width * contentScaleRatio * pageScaleRatio - EDGE_WIDTH.x && offsetPos.x < 0
    // const isReachTopEdge = page.y >= EDGE_WIDTH.y && offsetPos.y > 0
    // const isReachBottomEdge = page.y <= editorUtils.mobileSize.height - page.height * contentScaleRatio * pageScaleRatio - EDGE_WIDTH.y && offsetPos.y < 0

    // let x = -1
    // let y = -1
    // if (isReachRightEdge || isReachLeftEdge) {
    //   x = isReachRightEdge ? editorUtils.mobileSize.width - page.width * contentScaleRatio * pageScaleRatio - EDGE_WIDTH.x : EDGE_WIDTH.x
    // } else {
    //   x = offsetPos.x + page.x
    // }

    // if (isReachTopEdge || isReachBottomEdge) {
    //   y = isReachBottomEdge ? editorUtils.mobileSize.height - page.height * contentScaleRatio * pageScaleRatio - EDGE_WIDTH.y : EDGE_WIDTH.y
    // } else {
    //   y = offsetPos.y + page.y
    // }
    // pageUtils.updatePagePos(this.pageIndex, { x, y })

    // if (!isReachLeftEdge && !isReachRightEdge) {
    //   this.initialPos.x += offsetPos.x
    // }
    // if (!isReachBottomEdge && !isReachTopEdge) {
    //   this.initialPos.y += offsetPos.y
    // }
  }

  moveEnd(e: MouseEvent | TouchEvent) {
    if (store.getters.getControlState.id === this.id) {
      store.commit('SET_STATE', { controlState: { type: '' } })
    }
    if (eventUtils.getEventType(e) === 'pointer' && ['pointerup', 'poinerleave'].includes(e.type)) {
      this.pointerId = 0
      pointerEvtUtils.removePointer((e as PointerEvent).pointerId)
    }

    const isLayerExist = layerUtils.getLayer(this.layerInfo.pageIndex, this.layerInfo.layerIndex).id === this.config.id
    if (pointerEvtUtils.pointerIds.length > 1 || this._initPos === null || !isLayerExist) {
      this.isControlling = false
      return this.removeListener()
    }
    console.warn('move end triggered', e)
    this.isControlling = false
    this.removeListener()
    layerUtils.updateLayerProps(this.pageIndex, this.layerIndex, { moving: false })
    this.setMoving(false)

    /**
     * @Note the posDiff logic is different from the Vivipic version
     * Vivipic won't update the initialPos in moving, but Vivisticker will.
     */
    const posDiff = this.isTouchDevice ? {
      x: Math.abs(mouseUtils.getMouseAbsPoint(e).x - this._initPos.x),
      y: Math.abs(mouseUtils.getMouseAbsPoint(e).y - this._initPos.y)
    } : {
      x: Math.abs(this.getLayerPos.x - this.initTranslate.x),
      y: Math.abs(this.getLayerPos.y - this.initTranslate.y)
    }
    const pagePosDiff = {
      x: Math.abs(pageUtils.getCurrPage.x - this.initPageTranslate.x),
      y: Math.abs(pageUtils.getCurrPage.y - this.initPageTranslate.y)
    }
    console.log((e as any).x, this._initPos.x)
    console.log((e as any).y, this._initPos.y)
    const hasActualMove = posDiff.x > 1 || posDiff.y > 1
    const hasActualPageMove = Math.round(pagePosDiff.x) !== 0 || Math.round(pagePosDiff.y) !== 0

    console.log('hasActualMove', hasActualMove)
    if (this.isControllerShown) {
      if (hasActualMove) {
        shortcutUtils.offsetCount = 0
        if (layerUtils.isOutOfBoundary() && this.currHoveredPageIndex === -1) {
          layerUtils.deleteSelectedLayer()
        } else if (layerUtils.isOutOfBoundary() && this.currHoveredPageIndex !== -1 && this.currHoveredPageIndex !== this.pageIndex) {
          // dragging to another page
          const layerNum = this.currSelectedInfo.layers.length
          if (layerNum > 1) {
            groupUtils.group()
          }
          const layerTmp = generalUtils.deepCopy(layerUtils.getCurrLayer)
          const { top, left } = this.body.getBoundingClientRect()
          const targetPageRect = (document.querySelector(`.nu-page-${this.currHoveredPageIndex}`) as HTMLLIElement)?.getBoundingClientRect()
          const newX = (left - targetPageRect.left) * (100 / this.scaleRatio)
          const newY = (top - targetPageRect.top) * (100 / this.scaleRatio)

          layerTmp.styles.x = newX
          layerTmp.styles.y = newY
          layerUtils.deleteSelectedLayer(false)
          layerUtils.addLayers(this.currHoveredPageIndex, [layerTmp])
          if (layerNum > 1) {
            groupUtils.ungroup()
          }
          // The layerUtils.addLayers will trigger a record function, so we don't need to record the extra step here
        } else {
          if (!(this.config as IImage).isHoveringFrame) {
            stepsUtils.asyncRecord()
          }
          // turn off text layer's auto rescale mode after moving
          switch (this.getLayerType) {
            case 'text':
              layerUtils.updateLayerProps(this.pageIndex, this.layerIndex, { inAutoRescaleMode: false })
              break
            case 'tmp':
              for (const [subLayerIdx, subLayer] of (this.config as ITmp).layers.entries()) {
                if (subLayer.type === 'text') {
                  layerUtils.updateLayerProps(this.pageIndex, this.layerIndex, { inAutoRescaleMode: false }, subLayerIdx)
                }
              }
              break
          }
        }
      } else {
        if (this.getLayerType === 'text' && controlUtils.isClickOnController(e as PointerEvent, this.config as AllLayerTypes) && !this.isFollowByPinch) {
          layerUtils.updateLayerProps(this.pageIndex, this.layerIndex, { isTyping: true })
          if (this.isTouchDevice) {
            if (!this.movingByControlPoint) {
              layerUtils.updateLayerProps(this.pageIndex, this.layerIndex, { contentEditable: true })
            }
          } else {
            if (this.movingByControlPoint) {
              layerUtils.updateLayerProps(this.pageIndex, this.layerIndex, { contentEditable: false })
            }
          }
          if (this.config.contentEditable) {
            nextTick(() => {
              tiptapUtils.focus({ scrollIntoView: false }, this.isTouchDevice ? 'end' : null)
            })
            if (!this.config.isEdited) {
              setTimeout(() => {
                tiptapUtils.agent(editor => !editor.isDestroyed && editor.commands.selectAll())
              }, 100) // wait for default behavior to set cursor position, then select (otherwise selection will be overwritten)
            }
          }
        }
        if (this.inMultiSelectionMode) {
          if (this.config.type !== 'tmp') {
            let targetIndex = this.layerIndex
            if (this.isControllerShown && this.currSelectedInfo.layers.length === 1) {
              groupUtils.deselect()
              targetIndex = this.config.styles.zindex - 1
              this.setLastSelectedLayerIndex(this.layerIndex)
            } else if (!this.isControllerShown) {
              // already have selected layer
              if (this.currSelectedInfo.index >= 0) {
                // this if statement is used to prevent select the layer in another page
                if (this.pageIndex === pageUtils.currFocusPageIndex) {
                  groupUtils.select(this.pageIndex, [targetIndex])
                }
              } else {
                targetIndex = this.config.styles.zindex - 1
                this.setLastSelectedLayerIndex(this.layerIndex)
                groupUtils.select(this.pageIndex, [targetIndex])
              }
            }
          }
        }
      }
      this.isControlling = false
      this.setCursorStyle(e, '')
    }

    if (!this.isControllerShown) {
      if (hasActualPageMove) {
        return
      } else if (!this.isDoingGestureAction && !this.isControllerShown && !hasActualMove) {
        this.eventTarget.removeEventListener('touchstart', this.disableTouchEvent)
        if (!this.inMultiSelectionMode) {
          groupUtils.deselect()
          const targetIndex = this.config.styles.zindex - 1
          this.setLastSelectedLayerIndex(this.layerIndex)
          groupUtils.select(this.pageIndex, [targetIndex])
        }
        this.setCursorStyle(e, '')
        layerUtils.updateLayerProps(this.pageIndex, this.layerIndex, {
          dragging: false
        })
        this.isDoingGestureAction = false
        this.snapUtils.event.emit('clearSnapLines')
        return
      }
    }

    if (this.isDragging) {
      layerUtils.updateLayerProps(this.pageIndex, this.layerIndex, {
        dragging: false
      })
    }

    this.isDoingGestureAction = false
    this.snapUtils.event.emit('clearSnapLines')
  }

  onCursorDragEnd(e: MouseEvent | TouchEvent) {
    layerUtils.updateLayerProps(this.pageIndex, this.layerIndex, { isDraggingCursor: false })
    eventUtils.removePointerEvent('pointerup', this._cursorDragEnd)
  }

  removeListener() {
    this.isControlling = false
    eventUtils.removePointerEvent('pointerup', this._moveEnd)
    eventUtils.removePointerEvent('pointermove', this._moving)
    eventUtils.removePointerEvent('pointerup', this._cursorDragEnd)
  }
}
