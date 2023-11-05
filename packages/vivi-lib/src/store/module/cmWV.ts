import cmWVUtils, { IUserInfo } from '@/utils/cmWVUtils'
import { GetterTree, MutationTree } from 'vuex'

export interface ICmWVState {
  userInfo: IUserInfo,
  inBrowserMode: boolean,
  isDuringCopy: boolean,
  isNoBg: boolean,
}

const getDefaultState = (): ICmWVState => ({
  userInfo: cmWVUtils.getDefaultUserInfo(),
  inBrowserMode: false,
  isDuringCopy: false,
  isNoBg: false,
})

const state = getDefaultState()
const getters: GetterTree<ICmWVState, unknown> = {
  getUserInfo(state: ICmWVState): IUserInfo {
    return state.userInfo
  },
  getInBrowserMode(state: ICmWVState): boolean {
    return state.inBrowserMode
  },
  getIsDuringCopy(state: ICmWVState): boolean {
    return state.isDuringCopy
  },
  getIsNoBg(state: ICmWVState): boolean {
    return state.isNoBg
  },
}

const mutations: MutationTree<ICmWVState> = {
  SET_userInfo(state: ICmWVState, userInfo: IUserInfo) {
    state.userInfo = userInfo
  },
  SET_inBrowserMode(state: ICmWVState, inBrowserMode: boolean) {
    state.inBrowserMode = inBrowserMode
  },
  SET_isDuringCopy(state: ICmWVState, isDuringCopy: boolean) {  
    state.isDuringCopy = isDuringCopy
  },
  SET_isNoBg(state: ICmWVState, isNoBg: boolean) {
    state.isNoBg = isNoBg
  },
}

export default {
  namespaced: true,
  state,
  getters,
  mutations
}
