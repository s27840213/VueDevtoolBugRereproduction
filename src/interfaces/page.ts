import { IShape, IText, IImage, IGroup, IFrame } from '@/interfaces/layer'

export interface IBackgroundImage {
  config: IImage,
  posX: number,
  posY: number,
  newDisplayMode?: boolean,
  src?: string // will be remove in the future
}
export interface IPage {
  [index: string]: unknown,
  id: string,
  width: number,
  height: number,
  backgroundColor: string,
  backgroundImage: IBackgroundImage,
  name: string,
  layers: Array<IShape | IText | IImage | IGroup | IFrame>,
  documentColors: Array<string>,
  designId: string,
  modified?: boolean,
  guidelines: {
    [index: string]: Array<number>,
    v: Array<number>,
    h: Array<number>
  }
}
