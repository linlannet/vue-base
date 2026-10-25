import { defineConfig } from 'vitepress'

/**
 * ll-editor 文档站配置（顶部导航 + 左侧分类树 + 右侧页内 TOC 三栏结构），内置中英双语 i18n。
 *
 * 目录约定：
 *   docs/zh-CN/   -> 简体中文
 *   docs/en-US/   -> English
 *   docs/index.md -> 根路径重定向到 /zh-CN/
 */

const zhSidebar = {
  '/zh-CN/guide/': [
    {
      text: '指南',
      items: [
        { text: '产品介绍', link: '/zh-CN/guide/introduction' },
        { text: '快速开始', link: '/zh-CN/guide/getting-started' },
        { text: '框架集成', link: '/zh-CN/guide/integration' },
        { text: '配置参考', link: '/zh-CN/guide/configuration' }
      ]
    }
  ],
  '/zh-CN/api/': [
    {
      text: 'API 参考',
      items: [
        { text: 'LLEditor', link: '/zh-CN/api/ll-editor' },
        { text: '插件 API（LLEditorAPI）', link: '/zh-CN/api/plugin-api' },
        { text: '事件（LLEditorEvents）', link: '/zh-CN/api/events' }
      ]
    }
  ]
}

const enSidebar = {
  '/en-US/guide/': [
    {
      text: 'Guide',
      items: [
        { text: 'Introduction', link: '/en-US/guide/introduction' },
        { text: 'Getting Started', link: '/en-US/guide/getting-started' },
        { text: 'Framework Integration', link: '/en-US/guide/integration' },
        { text: 'Configuration', link: '/en-US/guide/configuration' }
      ]
    }
  ],
  '/en-US/api/': [
    {
      text: 'API Reference',
      items: [
        { text: 'LLEditor', link: '/en-US/api/ll-editor' },
        { text: 'Plugin API (LLEditorAPI)', link: '/en-US/api/plugin-api' },
        { text: 'Events (LLEditorEvents)', link: '/en-US/api/events' }
      ]
    }
  ]
}

export default defineConfig({
  title: 'll-editor',
  description: '插件化代码编辑器内核 + 可插拔运行时 + 插件市场',
  lastUpdated: true,
  cleanUrls: true,
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh-CN/',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh-CN/guide/introduction' },
          { text: 'API', link: '/zh-CN/api/ll-editor' },
          { text: 'GitHub', link: 'https://github.com/' }
        ],
        sidebar: zhSidebar,
        docFooter: { prev: '上一篇', next: '下一篇' },
        outline: { label: '本页目录' },
        lastUpdatedText: '最后更新于',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '返回顶部',
        langMenuLabel: '切换语言'
      }
    },
    'en-US': {
      label: 'English',
      lang: 'en-US',
      link: '/en-US/',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en-US/guide/introduction' },
          { text: 'API', link: '/en-US/api/ll-editor' },
          { text: 'GitHub', link: 'https://github.com/' }
        ],
        sidebar: enSidebar,
        docFooter: { prev: 'Previous', next: 'Next' },
        outline: { label: 'On this page' },
        lastUpdatedText: 'Last updated',
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Return to top',
        langMenuLabel: 'Change language'
      }
    }
  }
})
