/**
 */
import store from '@/store'
import { ILayer } from '@/interfaces/layer'
import GroupUtils from '@/utils/groupUtils'
import { PanelType } from '@/store/types'
import LayerFactary from '@/utils/layerFactary'
class MouseUtils {
  getMouseAbsPoint(e: MouseEvent) {
    return { x: e.clientX, y: e.clientY }
  }

  getMouseRelPoint(e: MouseEvent, target: HTMLElement | { x: number, y: number }) {
    let x: number
    let y: number
    if (target instanceof HTMLElement) {
      const rect = target.getBoundingClientRect()
      x = e.clientX + target.scrollLeft - rect.left
      y = e.clientY + target.scrollTop - rect.top
    } else {
      x = e.clientX - target.x
      y = e.clientY - target.y
    }
    return { x, y }
  }

  onDrop(e: DragEvent, pageIndex: number, targetOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    if (e.dataTransfer != null) {
      const data = JSON.parse(e.dataTransfer.getData('data'))
      const target = e.target as HTMLElement
      const targetPos = {
        x: target.getBoundingClientRect().x,
        y: target.getBoundingClientRect().y
      }
      const x = (e.clientX - targetPos.x + targetOffset.x - data.styles.x) * (100 / store.state.pageScaleRatio)
      const y = (e.clientY - targetPos.y + targetOffset.y - data.styles.y) * (100 / store.state.pageScaleRatio)
      if (store.getters.getCurrPanelType !== PanelType.bg) {
        const layerConfig: ILayer = {
          type: data.type,
          pageIndex: pageIndex,
          active: false,
          shown: false,
          styles: {
            x: x,
            y: y,
            initX: x,
            initY: y,
            scale: 1,
            scaleX: 0,
            scaleY: 0,
            rotate: 0,
            width: data.styles.width,
            height: data.styles.height,
            initWidth: data.styles.width,
            initHeight: data.styles.height
          }
        }

        let layer
        if (data.type === 'image') {
          layer = LayerFactary.newImage(pageIndex, Object.assign(layerConfig, { src: data.src }))
        } else if (data.type === 'text') {
          Object.assign(layerConfig.styles, data.styles)
          layer = LayerFactary.newText(pageIndex, Object.assign(layerConfig, { text: data.text }))
        } else if (data.type === 'shape') {
          Object.assign(layerConfig.styles, data.styles)
          layer = LayerFactary.newShape(pageIndex, Object.assign(layerConfig))
        }

        store.commit('ADD_newLayers', {
          pageIndex: pageIndex,
          layers: [layer]
        })
        GroupUtils.deselect()
        store.commit('SET_lastSelectedPageIndex', pageIndex)
        GroupUtils.select([store.getters.getLayers(pageIndex).length - 1])
      } else {
        store.commit('SET_backgroundImageSrc', {
          pageIndex: pageIndex,
          imageSrc: data.src
        })
      }
    }
  }
}

const mouseUtils = new MouseUtils()
export default mouseUtils
