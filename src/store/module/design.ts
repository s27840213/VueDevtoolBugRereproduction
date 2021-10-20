import { IDesign, IDraggingDesign, IFolder, IPathedDesign } from '@/interfaces/design'
import designUtils from '@/utils/designUtils'
import generalUtils from '@/utils/generalUtils'
import { GetterTree, MutationTree } from 'vuex'

interface IDesignSidebarState {
  currentSelectedFolder: string,
  folders: IFolder[],
  draggingDesign: IDraggingDesign | undefined,
  favoriteDesigns: IPathedDesign[],
  trashDesigns: IPathedDesign[]
}

const getDefaultState = (): IDesignSidebarState => ({
  currentSelectedFolder: 'a',
  folders: [],
  draggingDesign: undefined,
  favoriteDesigns: [],
  trashDesigns: []
})

const state = getDefaultState()
const getters: GetterTree<IDesignSidebarState, unknown> = {
  getCurrSelectedFolder(state: IDesignSidebarState): string {
    return state.currentSelectedFolder
  },
  getFolders(state: IDesignSidebarState): IFolder[] {
    return state.folders
  },
  getDesigns(state: IDesignSidebarState, path: string[]): IDesign[] {
    return designUtils.search(state.folders, path)?.designs ?? []
  },
  getDraggingDesign(state: IDesignSidebarState): IDraggingDesign | undefined {
    return state.draggingDesign
  },
  getFavoriteDesigns(state: IDesignSidebarState): IPathedDesign[] {
    return state.favoriteDesigns
  },
  getTrashDesigns(state: IDesignSidebarState): IPathedDesign[] {
    return state.trashDesigns
  }
}

const mutations: MutationTree<IDesignSidebarState> = {
  SET_currSelectedFolder(state: IDesignSidebarState, currentSelectedFolder: string) {
    const folders = generalUtils.deepCopy(state.folders)
    designUtils.deselect(folders, state.currentSelectedFolder)
    designUtils.select(folders, currentSelectedFolder)
    state.currentSelectedFolder = currentSelectedFolder
    state.folders = folders
  },
  SET_expand(state: IDesignSidebarState, updateInfo: {path: string[], isExpanded: boolean}) {
    const targetFolder = designUtils.search(state.folders, updateInfo.path)
    if (targetFolder) {
      targetFolder.isExpanded = updateInfo.isExpanded
    }
  },
  SET_folders(state: IDesignSidebarState, folders: IFolder[]) {
    state.folders = folders
  },
  SET_draggingDesign(state: IDesignSidebarState, draggingDesign: IDraggingDesign) {
    state.draggingDesign = draggingDesign
  },
  UPDATE_addToFavorite(state: IDesignSidebarState, updateInfo: {path: string[], design: IDesign}) {
    state.favoriteDesigns.push({
      design: updateInfo.design,
      path: updateInfo.path
    })
  },
  UPDATE_addToTrash(state: IDesignSidebarState, updateInfo: {path: string[], design: IDesign}) {
    state.trashDesigns.push({
      design: updateInfo.design,
      path: updateInfo.path
    })
  },
  UPDATE_removeFromFavorite(state: IDesignSidebarState, updateInfo: {path: string[], design: IDesign}) {
    const index = state.favoriteDesigns.findIndex(pathedDesign => pathedDesign.design.id === updateInfo.design.id)
    if (index >= 0) {
      state.favoriteDesigns.splice(index, 1)
    }
  },
  UPDATE_removeFromTrash(state: IDesignSidebarState, updateInfo: {path: string[], design: IDesign}) {
    const index = state.trashDesigns.findIndex(pathedDesign => pathedDesign.design.id === updateInfo.design.id)
    if (index >= 0) {
      state.trashDesigns.splice(index, 1)
    }
  },
  UPDATE_path(state: IDesignSidebarState, updateInfo: {id: string, path: string[]}) {
    const index = state.favoriteDesigns.findIndex(pathedDesign => pathedDesign.design.id === updateInfo.id)
    if (index >= 0) {
      state.favoriteDesigns[index].path = updateInfo.path
    }
    const index2 = state.trashDesigns.findIndex(pathedDesign => pathedDesign.design.id === updateInfo.id)
    if (index2 >= 0) {
      state.trashDesigns[index].path = updateInfo.path
    }
  },
  UPDATE_folderName(state: IDesignSidebarState, updateInfo: {path: string[], newFolderName: string}) {
    const targetFolder = designUtils.search(state.folders, updateInfo.path)
    if (targetFolder) {
      targetFolder.name = updateInfo.newFolderName
    }
  },
  UPDATE_designName(state: IDesignSidebarState, updateInfo: {path: string[], id: string, newDesignName: string}) {
    const targetFolder = designUtils.search(state.folders, updateInfo.path)
    if (targetFolder) {
      const index = targetFolder.designs.findIndex(design => design.id === updateInfo.id)
      if (index >= 0) {
        targetFolder.designs[index].name = updateInfo.newDesignName
      }
    }
  },
  UPDATE_addDesign(state: IDesignSidebarState, updateInfo: {path: string[], design: IDesign}) {
    const targetFolder = designUtils.search(state.folders, updateInfo.path)
    if (targetFolder) {
      targetFolder.designs.push(updateInfo.design)
    }
  },
  UPDATE_deleteDesign(state: IDesignSidebarState, updateInfo: {path: string[], design: IDesign}) {
    const targetFolder = designUtils.search(state.folders, updateInfo.path)
    if (targetFolder) {
      const index = targetFolder.designs.findIndex(design => design.id === updateInfo.design.id)
      if (index >= 0) {
        targetFolder.designs.splice(index, 1)
      }
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations
}
