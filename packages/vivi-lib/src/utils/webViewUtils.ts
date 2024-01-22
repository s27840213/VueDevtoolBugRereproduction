import i18n from '@/i18n'
import { WEBVIEW_API_RESULT } from '@/interfaces/webView'
import store from '@/store'
import { notify } from '@kyvg/vue3-notification'
import { IListAssetResponse } from './cmWVUtils'
import generalUtils from './generalUtils'
import logUtils from './logUtils'
import modalUtils from './modalUtils'
import uploadUtils from './uploadUtils'

export abstract class WebViewUtils<T extends { [key: string]: any }> {
  abstract DEFAULT_USER_INFO: T
  abstract CALLBACK_MAPS: { [key: string]: string[] }

  eventTestMode = false
  callbackMap = {} as { [key: string]: (res: { data: WEBVIEW_API_RESULT, isTimeouted: boolean }) => void }
  eventMap = {} as { [key: string]: (data: WEBVIEW_API_RESULT) => void }
  errorMessageMap = {} as { [key: string]: string }
  apiQueueMap = {} as {
    [key: string]: {
      eventId: string,
      args: Parameters<typeof WebViewUtils.prototype.callIOSAsAPICore>
    }[]
  }

  abstract getUserInfoFromStore(): T

  enterEventTestMode() {
    this.eventTestMode = true
  }

  callbackRecordHook(callbackName: string, ...args: any[]) {
    store.commit('webView/UPDATE_addCallbackRecord', {
      name: callbackName,
      id: generalUtils.generateRandomString(8),
      args
    })
  }

  filterLog(messageType: string, message: any): boolean {
    // implementation classes can filter out logs for certain messageType with certain messages
    return false
  }

  filterCallbackLog(callbackName: string): boolean {
    // implementation classes can filter out logs for certain callback
    return false
  }

  filterErrorModal(type: string, message: Record<string, unknown>, isTimeout: boolean): boolean {
    // implementation classes can filter out error modal for certain messageType with certain messages
    return false
  }

  registerCallbacks(type: string) {
    for (const callbackName of this.CALLBACK_MAPS[type]) {
      this.registerCallbacksCore(callbackName)
    }
  }

  logForCallback(callbackName: string, ...args: any[]) {
    logUtils.setLogAndConsoleLog(callbackName, ...args)
  }

  registerCallbacksCore(callbackName: string) {
    (window as any)[callbackName] = (...args: any[]) => {
      if (!this.filterCallbackLog(callbackName)) {
        this.logForCallback(callbackName, ...args)
      }
      this.eventTestMode && this.callbackRecordHook(callbackName, ...args)
      const self = this as any
      self[callbackName].bind(this)(...args)
    }
  }

  getDefaultUserInfo(): T {
    return this.DEFAULT_USER_INFO
  }

  getEmptyMessage(): { [key: string]: string } {
    return { empty: '' }
  }

  logForSendToIOS(messageType: string, message: any) {
    logUtils.setLogAndConsoleLog(messageType, message)
  }

  sendToIOS(messageType: string, message: any, throwsError = false) {
    if (!this.filterLog(messageType, message)) {
      this.logForSendToIOS(messageType, message)
    }
    try {
      const webkit = window.webkit
      if (!webkit) return
      const messageHandler = webkit.messageHandlers[messageType]
      if (!messageHandler) {
        throw new Error(`message type: ${messageType} does not exist!`)
      }
      messageHandler.postMessage(generalUtils.unproxify(message))
    } catch (error) {
      if (throwsError) {
        throw error
      } else {
        logUtils.setLogForError(error as Error)
      }
    }
  }

  checkVersion(targetVersion: string) {
    const currVer = this.getUserInfoFromStore().appVer ?? '0.0'
    return generalUtils.versionCheck({ greaterThan: targetVersion, version: currVer })
  }

  checkOSVersion(targetVersion: string) {
    const currVer = this.getUserInfoFromStore().osVer ?? '0.0'
    return generalUtils.versionCheck({ greaterThan: targetVersion, version: currVer })
  }

  registerResolve(event: string, resolve: (value: any) => void) {
    if (this.callbackMap[event] !== undefined) {
      throw new Error(`duplicate event callback: ${event} already exists!`)
    } else {
      this.callbackMap[event] = resolve
    }
  }

  async callIOSAsAPI(...args: Parameters<typeof WebViewUtils.prototype.callIOSAsAPICore>):
    ReturnType<typeof WebViewUtils.prototype.callIOSAsAPICore> {
    const event = args[2]
    const { cancelOnConfict = false } = args[3] ?? {}
    const eventId = generalUtils.generateRandomString(12)
    if (this.apiQueueMap[event] === undefined) { this.apiQueueMap[event] = [] }
    if (cancelOnConfict) {
      if (this.callbackMap[event] !== undefined) {
        this.callbackMap[event]({
          data: null,
          isTimeouted: false
        })
      }
    }
    this.apiQueueMap[event].push({
      eventId,
      args
    })
    const result = await new Promise<WEBVIEW_API_RESULT>(resolve => {
      if (this.apiQueueMap[event].length === 1) {
        this.processApiQueue(event)
      }
      this.eventMap[eventId] = resolve
    })
    delete this.eventMap[eventId]
    return result
  }

  async processApiQueue(event: string) {
    const apiArgs = this.apiQueueMap[event][0]
    if (apiArgs) {
      const result = await this.callIOSAsAPICore(...apiArgs.args)
      this.eventMap[apiArgs.eventId](result)
      this.apiQueueMap[event].shift()
      this.processApiQueue(event)
    }
  }

  async callIOSAsAPICore(type: string, message: any, event: string, {
    timeout = 5000, retry = false, retryTimes = 0, cancelOnConfict = false
  } = {}): Promise<WEBVIEW_API_RESULT> {
    let result: WEBVIEW_API_RESULT
    try {
      if (timeout === -1) {
        result = (await (new Promise<{ data: WEBVIEW_API_RESULT, isTimeouted: boolean }>(resolve => {
          this.registerResolve(event, resolve)
          this.sendToIOS(type, message, true) // send message to iOS only when resolve is successfully registered
        }))).data
        delete this.callbackMap[event]
      } else {
        const raceResult = await Promise.race([
          new Promise<{ data: WEBVIEW_API_RESULT, isTimeouted: boolean }>(resolve => {
            this.registerResolve(event, resolve)
            this.sendToIOS(type, message, true) // send message to iOS only when resolve is successfully registered
          }),
          new Promise<{ data: WEBVIEW_API_RESULT, isTimeouted: boolean }>(resolve => {
            setTimeout(() => {
              resolve({
                data: null,
                isTimeouted: true
              })
            }, timeout)
          })
        ])
        delete this.callbackMap[event]
        result = raceResult.data
        if (raceResult.isTimeouted) {
          logUtils.setLogAndConsoleLog(`${type} timeouted after ${timeout}ms with message:`, message)
          if (retry && retryTimes < 2) {
            logUtils.setLogAndConsoleLog(`retry: ${retryTimes + 1}`)
            await generalUtils.sleep(1000)
            result = await this.callIOSAsAPI(type, message, event, {
              timeout, retry, retryTimes: retryTimes + 1
            })
          } else {
            if (!this.filterErrorModal(type, message, true)) {
              const errorId = generalUtils.generateRandomString(6)
              logUtils.setLog(errorId)

              logUtils.uploadLog().then(() => {
                const hint = `${uploadUtils.fullId},${generalUtils.generateTimeStamp()},${errorId}`
                modalUtils.setModalInfo(
                  `${i18n.global.t('NN0457')}(999)`,
                  hint,
                  {
                    msg: i18n.global.t('STK0023'),
                    action() {
                      generalUtils.copyText(hint).then(() => {
                        notify({ group: 'success', text: i18n.global.t('NN0923') })
                      })
                    },
                  },
                )
              })
            }
          }
        }
      }
    } catch (error) {
      logUtils.setLog(`Error occurs in callIOSAsAPI with type: ${type}, message: ${message}, event: ${event}`)
      logUtils.setLogForError(error as Error)
      if (!this.filterErrorModal(type, message, false)) {
        const errorId = generalUtils.generateRandomString(6)
        logUtils.setLog(errorId)

        logUtils.uploadLog().then(() => {
          const hint = `${uploadUtils.fullId},${generalUtils.generateTimeStamp()},${errorId}`
          modalUtils.setModalInfo(
            `${i18n.global.t('NN0457')}(500)`,
            hint,
            {
              msg: i18n.global.t('STK0023'),
              action() {
                generalUtils.copyText(hint).then(() => {
                  notify({ group: 'success', text: i18n.global.t('NN0923') })
                })
              },
            },
          )
        })
      }
      result = null
    }
    return result
  }

  handleCallback(event: string, data?: any) {
    if (this.callbackMap[event]) {
      this.callbackMap[event]({
        data,
        isTimeouted: false
      })
    }
  }
  // common interfaces

  get inBrowserMode(): boolean { return false }

  async getState(key: string): Promise<WEBVIEW_API_RESULT> { return undefined }
  async setState(key: string, value: any) { /* only interface */ }

  async fetchLoadedFonts(): Promise<void> { /* only interface */ }

  async recordLoadedFont(face: string): Promise<void> { /* only interface */ }

  async checkFontLoaded(face: string): Promise<boolean> { return false /* only interface */ }

  async listAsset(key: string, ...args: any[]): Promise<void |IListAssetResponse> { /* only interface */ }

  async listMoreAsset(key: string, nextPage: number, ...args: any[]): Promise<void |IListAssetResponse> { /* only interface */ }

  async addAsset(key: string, asset: any, limit = 100, ...args: any[]): Promise<void> { /* only interface */ }
  //
}
