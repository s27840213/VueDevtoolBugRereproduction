export interface IDesign {
  id: string,
  asset_index: number,
  name: string,
  width: number,
  height: number,
  thumbnail: string,
  createdTime: string,
  lastUpdatedTime: string,
  favorite: boolean,
  ver: number
}

export interface IFolder {
  id: string,
  name: string,
  author: string,
  createdTime: string,
  lastUpdatedTime: string,
  isExpanded: boolean,
  isCurrLocation: boolean,
  subFolders: IFolder[]
}
export interface IPathedFolder {
  parents: string[],
  folder: IFolder
}

export interface IQueueItem {
  type: 'design' | 'folder' | 'multi',
  data: IDesign | IPathedFolder | undefined
}
