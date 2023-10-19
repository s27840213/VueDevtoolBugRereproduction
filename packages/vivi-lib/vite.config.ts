import vue from '@vitejs/plugin-vue'
import * as path from 'path'
// import AutoImport from 'unplugin-auto-import/vite'
// import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import extractImg from '../../tools/vite-plugin-lib-extract-img'
import removePugAssertion from '../../tools/vite-plugin-remove-pug-type-assertion'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // When Using pug with option api, it will treat ts in pug as js,
    // so remove type assertions to resolve the issue.
    // https://github.com/vitejs/vite-plugin-vue/issues/18#issuecomment-1719035794
    removePugAssertion(),
    vue(),
    // Components({
    //   dirs: ['src/components'],
    //   extensions: ['vue'],
    //   dts: 'src/components.d.ts'
    // }),
    // // https://github.com/antfu/unplugin-auto-import
    // AutoImport({
    //   imports: ['vue', 'vue-router', 'vue-i18n'],
    //   dts: 'src/auto-import.d.ts'
    // })
    viteStaticCopy({
      targets: [{
        src: [
          path.resolve(__dirname, 'src/assets/scss').replace(/\\/g, '/'),
          path.resolve(__dirname, 'src/assets/icon').replace(/\\/g, '/'),
          path.resolve(__dirname, 'src/assets/img').replace(/\\/g, '/'),
        ],
        dest: 'src/assets',
      }]
    }),
    // Extracts resource files referenced in lib mode instead of embedded them as base64.
    extractImg,
  ],
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: 'src/main.ts',
      name: '@nu/vivi-lib',
      // To reduce build time, only compile es files, not both es & cjs.
      formats: ['es'],
      // formats: ['es', 'cjs'],
      fileName: (format, entry) => `${entry}.${format}.js`
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled into your library
      external: ['vue'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue'
        },
        // preserveModules can keep dist folder structure
        // https://github.com/vitejs/vite/discussions/2447#discussioncomment-6768114
        preserveModules: true,
        preserveModulesRoot: './',
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // https://sass-lang.com/documentation/at-rules/use/#configuration
        // additionalData: `@use "@/assets/scss/utils" as * with($appName: ${process.env.VUE_APP_APP_NAME});`,
        additionalData: `@use "@/assets/scss/utils" as *;`,
      },
    },
  },
})
