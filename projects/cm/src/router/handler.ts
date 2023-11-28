import useBiColorEditor from '@/composable/useBiColorEditor'
import { useCanvasStore } from '@/stores/canvas'
import { useEditorStore } from '@/stores/editor'
import type { EditorType } from '@/types/editor'
import { editorTypes } from '@/types/editor'
import colorUtils from '@nu/vivi-lib/utils/colorUtils'
import logUtils from '@nu/vivi-lib/utils/logUtils'
import VueRouter from 'vue-router'

const isValidType = (x: any): x is EditorType => editorTypes.includes(x);

export async function editorRouteHandler(_to: VueRouter.RouteLocationNormalized, from: VueRouter.RouteLocationNormalized, next: VueRouter.NavigationGuardNext) {
  try {
    next()
    const { query } = _to
    const urlParams = new URLSearchParams()

    Object.entries(query).forEach(([key, val]) => {
      urlParams.append(key, val as string)
    })
    
    const type = urlParams.get('type')
    if (!isValidType(type)) throw new Error('Invalid editor type.')
    
    const { startEditing, setPageSize, setImgAspectRatio, setCurrActiveFeature, stepsReset } = useEditorStore()
    const { initBiColorEditor } = useBiColorEditor()
    stepsReset()
    startEditing(type)
    setImgAspectRatio(9/16)
    setPageSize(900, 1600)
    switch (type) {
      case 'powerful-fill':

        break;
      case 'hidden-message':
        setCurrActiveFeature('add')
        initBiColorEditor('dark')
        break;
      default:
        break;
    }
  } catch (error) {
    logUtils.setLogForError(error as Error)
  }
}
