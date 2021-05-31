import { IPage } from '@/interfaces/page'
import { IShape, IText, IImage, IGroup, ITmp } from '@/interfaces/layer'
/**
 * @param {object} currcurrSelectedLayers - used to record the info of selected layers
 *    @param {number} pageIndex - used to record where page the selected layers is
 *    @param {number[]} layers - all indexs of selected layers
 */
export interface IEditorState {
  pages: Array<IPage>,
  currSidebarPanelType: number,
  currFunctionPanelType: number,
  pageScaleRatio: number,
  lastSelectedPageIndex: number,
  lastSelectedLayerIndex: number,
  clipboard: Array<ITmp>,
  photos: Array<unknown>,
  currSelectedInfo: {
    index: number,
    layers: Array<IShape | IText | IImage | IGroup | ITmp>,
    types: Set<string>
  },
  isOrderDropdownsOpened: boolean,
  isLayerDropdownsOpened: boolean
  isPageDropdownsOpened: boolean,
  isColorPickerOpened: boolean
}

export enum SidebarPanelType {
  template,
  photo,
  object,
  bg,
  text,
  file,
  brand
}

export enum FunctionPanelType {
  none,
  group,
  textSetting,
  colorPicker,
  pageSetting,
  photoSetting
}

export enum LayerType {
  'nu-clipper',
  'nu-image',
  'nu-shape',
  'nu-text',
  'nu-group'
}
