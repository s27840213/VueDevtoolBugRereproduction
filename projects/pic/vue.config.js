/**
 * Chain-webpack 文件
 * 規則處理順序:
 *  - pre 優先處理
 *  - normal 正常處理 (default)
 *  - inline 其次處理
 *  - post 最後處理
 *         config.module
            .rule('lint') // 定義一個叫 lint 的規則
                .test(/\.js$/) // 設置 lint 規則的 RexExp 來匹配對應檔案
                .pre()  // 指定此規則的優先級
                .include // 設置當前規則作用的資料夾
                    .add('src')
                    .end()
                .use('eslint') // 指定一个名叫 eslint 的 loader 配置
                    .loader('eslint-loader') // 該配置使用 eslint-loader 作為 loader
                    .options({ // 該 eslint-loader 的配置
                        rules: {
                            semi: 'off'
                        }
                    })
                    .end()
                .use('zidingyi') // 指定一个名叫 zidingyi 的 loader 配置
                    .loader('zidingyi-loader') // 该配置使用 zidingyi-loader 作為處理 loader
                    .options({ // 該 zidingyi-loader 的配置
                        rules: {
                            semi: 'off'
                        }
                    })
 */

/* eslint-disable indent */

const path = require('path')
// const webpack = require('webpack')
// const SentryWebpackPlugin = require('@sentry/webpack-plugin')
// const PrerenderSPAPlugin = require('@dreysolano/prerender-spa-plugin')
// const Renderer = PrerenderSPAPlugin.PuppeteerRenderer
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const { argv } = require('yargs')
const { defineConfig } = require('@vue/cli-service')

function resolve(...dir) {
  return path.join(__dirname, ...dir)
}

module.exports = defineConfig({
  transpileDependencies: true,
  chainWebpack: (config) => {
    /**
     * use esbuild-loader to replace babel-loader
     */
    const rule = config.module.rule('js')
    // 清理自带的 babel-loader
    rule.uses.clear()
    const tsRule = config.module.rule('ts')
    // 清理自带的 babel-loader
    tsRule.uses.clear()
    // 添加 esbuild-loader

    config.module
      .rule('js')
      .test(/\.(js|jsx|ts|tsx)$/)
      .use('esbuild-loader')
      .loader('esbuild-loader')
      .options({
        loader: 'tsx',
        target: 'es2015',
      })
      .end()

    /**
     * use esbuild-loader to replace babel-loader
     */

    // To prevent safari use cached app.js, https://github.com/vuejs/vue-cli/issues/1132#issuecomment-409916879
    if (process.env.NODE_ENV === 'development') {
      config.output.filename('[name].[chunkhash].js').end()
    }
    config.module
      .rule('mjs')
      .test(/\.mjs$/)
      .type('javascript/auto')
      .include.add(/node_modules/)
      .end()

    // set worker-loader
    // config.module
    //     .rule('worker')
    //     .test(/\.worker\.(j|t)s$/)
    //     .exclude.add(/node_modules/)
    //     .end()
    //     .use('worker-loader')
    //     .loader('worker-loader')
    //     .end()
    // config.module
    //     .rule('worker')
    //     .test(/\.worker\.ts$/)
    // .use('ts-loader')
    // .loader('ts-loader')
    // .end()

    // 解决：worker 热更新问题
    // config.module.rule('js').exclude.add(/\.worker\.js$/)
    // config.module.rule('ts').exclude.add(/\.worker\.ts$/)

    // 先刪除預設的svg配置，否則svg-sprite-loader會失效
    config.module.rules.delete('svg')
    // 新增 svg-sprite-loader 設定
    config.module
      .rule('svg-sprite-loader')
      .test(/\.svg$/)
      .include
        .add(resolve('src/assets/icon'))
        .add(resolve('../../packages/vivi-lib/dist/src/assets/icon'))
      .end()
      .use('svg-sprite-loader')
      .loader('svg-sprite-loader')
      .options({
        symbolId: '[name]',
        // extract: true,
        // outputPath: 'static/img/',
        // publicPath: 'static/img/',
        // spriteFilename: 'main.svg'
      })

    // config.plugin('svg-sprite') // extract: true 才需要
    // .use(require('svg-sprite-loader/plugin'))
    /**
     * 由於上面的代碼會讓 'src/assets/icon' 資料夾以外的svg全都不能用，
     * 但並不是所有svg圖檔都要拿來當icon，故設定另外一個loader來處理其他svg
     * 以下 API 已被棄用
     */
    // config.module
    //     .rule('file-loader')
    //     .test(/\.svg$/)
    //     .exclude.add(resolve('src/assets/icon'))
    //     .end()
    //     .use('file-loader')
    //     .loader('file-loader')

    config.module
      .rule('image-assets')
      .test(/\.(png|jpg|gif|svg|mp4)$/)
      .exclude
        .add(resolve('src/assets/icon'))
        .add(resolve('../../packages/vivi-lib/dist/src/assets/icon'))
      .end()
      .type('asset/resource')
    // config.module
    //     .rule('babel-loader')
    //     .test(/\.js$/)
    //     .exclude.add(/(node_modules)/)
    //     .include.add(/(js)/)
    //     .end()
    //     .use('babel-loader')
    //     .loader('babel-loader')
    //     .options({
    //         cacheDirectory: true,
    //         presets: [
    //             [
    //                 'es2015',
    //                 {
    //                     loose: true
    //                 }
    //             ]
    //         ]
    //     })

    config.module
      .rule('vue')
      .test(/\.(vue)$/)
      .exclude.add(/node_modules/)
      .end()
      .use('vue-loader')
      .loader('vue-loader')
      .tap((options) => {
        options.exposeFilename = true
        return options
      })

    // if (process.env.CI && ['production', 'staging'].includes(process.env.NODE_ENV)) {
    //     config.plugin('sentry')
    //         .use(SentryWebpackPlugin, [{
    //             authToken: process.env.SENTRY_AUTH_TOKEN,
    //             release: process.env.VUE_APP_VERSION,
    //             org: 'nuphoto',
    //             project: 'vivipic',
    //             include: './dist',
    //             ignore: ['node_modules', 'vue.config.js']
    //         }])
    // }
    if (process.env.BITBUCKET_BUILD_NUMBER) {
      config.plugin('define').tap((args) => {
        const name = 'process.env'
        args[0][name].VUE_APP_BUILD_NUMBER = process.env.BITBUCKET_BUILD_NUMBER || ''
        return args
      })
    }
    // Write build number to ver.txt in production.
    if (process.env.NODE_ENV === 'production') {
      const fs = require('fs')
      const content = process.env.BITBUCKET_BUILD_NUMBER || ''
      if (!fs.existsSync('dist')) fs.mkdirSync('dist')
      fs.writeFile('dist/ver.txt', content, (err) => {
        if (err) console.error(err)
      })
      config.plugin('html').tap((args) => {
        args[0].template = resolve('public', 'index.html')
        args[0].filename = 'app.html'
        return args
      })

      console.log('copy prerender files to dist')
      config.plugin('copy-plugin').use(CopyPlugin, [
        {
          patterns: [resolve('prerender')],
        },
      ])
    }

    //   config.plugin('prerender').use(PrerenderSPAPlugin, [
    //     {
    //       // Tell the Pre-SPA plugin not to use index.html as its template file.
    //       indexPath: resolve('dist', 'app.html'),
    //       staticDir: resolve('dist'),
    //       routes: [
    //         '/',
    //         '/tw',
    //         '/us',
    //         '/jp',
    //         '/templates',
    //         '/tw/templates',
    //         '/us/templates',
    //         '/jp/templates',
    //         '/pricing',
    //         '/tw/pricing',
    //         '/us/pricing',
    //         '/jp/pricing',
    //       ],
    //       minify: {
    //         minifyCSS: true,
    //         removeComments: true,
    //       },
    //       renderer: new Renderer({
    //         // The name of the property
    //         injectProperty: '__PRERENDER_INJECTED',
    //         // The values to have access to via `window.injectProperty` (the above property )
    //         inject: { PRERENDER: 1 },
    //         renderAfterDocumentEvent: 'render-event',
    //         headless: true,
    //       }),
    //     },
    //   ])
    // }

    // Webpack bundle analyzer
    // if (process.env.NODE_ENV === 'development') {
    //   config
    //     .plugin('webpack-bundle-analyzer')
    //     .use(require('webpack-bundle-analyzer').BundleAnalyzerPlugin)
    //     .end()
    //   config.plugins.delete('prefetch')
    //   config.plugin('speed-measure-webpack-plugin').use(SpeedMeasurePlugin).end()
    // }

    // .use(SpeedMeasurePlugin, [{
    //     outputFormat: 'humanVerbose',
    //     loaderTopFiles: 5
    // }])
  },

  devServer: {
    client: {
      overlay: {
        errors: true,
        warnings: true,
        runtimeErrors: false,
      },
    },
  },

  css: {
    loaderOptions: {
      scss: {
        // https://webpack.js.org/loaders/sass-loader/#function-1
        // https://sass-lang.com/documentation/at-rules/use/#configuration
        // additionalData: `@use "@nu/vivi-lib/assets/scss/utils" as * with($appName: ${process.env.VUE_APP_APP_NAME});`,
        additionalData: '@use "@nu/vivi-lib/assets/scss/utils" as *;',
      },
    },
  },

  pluginOptions: {
    i18n: {
      locale: 'us',
      fallbackLocale: 'us',
      localeDir: 'locales',
      enableInSFC: true,
      includeLocales: false,
      enableBridge: true,
      enableLegacy: true,
      runtimeOnly: false,
      fullInstall: true,
    },
  },

  configureWebpack: {
    resolve: {
      alias: {
        // Use shaked i18n JSON for prod.
        '@i18n': resolve(
          process.env.NODE_ENV === 'production' 
            ? 'src/i18n/shaked/'
            : '../../tools/i18n-tool/result'
        ),
        '@img': resolve('../../packages/vivi-lib/dist/src/assets/img'),
        '@': resolve('src/'),
      },
    }
  }
})