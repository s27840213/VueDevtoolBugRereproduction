import { useEditorStore } from '@/stores/editor'
import { useImgSelectorStore } from '@/stores/imgSelector'
import { storeToRefs } from 'pinia'

const useStateInfo = () => {
  const { path } = toRefs(useRoute())
  const editorStore = useEditorStore()
  const { editorState } = storeToRefs(editorStore)

  // #region routing state
  const atHome = computed(() => path.value === '/')
  const atMyDesign = computed(() => path.value === '/mydesign')
  const atSettings = computed(() => path.value === '/settings')
  const atMainPage = computed(() => atHome.value || atMyDesign.value)
  const atEditor = computed(() => path.value === '/editor')
  // #endregion

  // #region editor state
  const showHomeTabs = computed(() => atHome.value || atMyDesign.value)
  const showAspectRatioSelector = computed(
    () => atEditor.value && editorState.value === 'aspectRatio',
  )
  const showEditingOpstions = computed(() => atEditor.value && editorState.value === 'editing')
  const showPromptArea = computed(() => atEditor.value && editorState.value === 'prompt')
  // #endregion

  // #region img selector state
  const imgSelectorStore = useImgSelectorStore()
  const { showImgSelector } = storeToRefs(imgSelectorStore)
  // #endregion

  return {
    atHome,
    atMyDesign,
    atEditor,
    atSettings,
    atMainPage,
    showHomeTabs,
    showAspectRatioSelector,
    showEditingOpstions,
    showPromptArea,
    showImgSelector,
  }
}

export default useStateInfo