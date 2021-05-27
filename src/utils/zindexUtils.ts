import { IGroup, IImage, ILayer, IShape, ITmp } from '@/interfaces/layer'
import store from '@/store'
import LayerUtils from '@/utils/layerUtils'

class ZindexUtils {
  reassignZindex(pageIndex: number) {
    console.log('I was called!')
    const layers = store.getters.getLayers(pageIndex)
    layers.forEach((layer: ILayer | IImage | ITmp | IGroup | IShape, index: number) => {
      LayerUtils.updateLayersStyles(pageIndex, index, {
        zindex: index + 1
      })
      if (layer.type === 'tmp') {
        store.commit('UPDATE_tmpLayersZindex')
      }
    })
  }
}

const zindexUtils = new ZindexUtils()

export default zindexUtils
