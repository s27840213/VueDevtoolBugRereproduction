import { IDesign, IFolder } from '@/interfaces/design'
import designUtils from '@/utils/designUtils'
import generalUtils from '@/utils/generalUtils'
import { GetterTree, MutationTree } from 'vuex'

interface IDesignSidebarState {
  currentSelectedFolder: string,
  folders: IFolder[]
}

const getDefaultState = (): IDesignSidebarState => ({
  currentSelectedFolder: 'a',
  folders: []
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
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations
}
