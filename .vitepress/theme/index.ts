// https://vitepress.dev/guide/custom-theme
import type { Theme as VitePressTheme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import HomePage from './HomePage.vue'
import MermaidDiagram from './MermaidDiagram.vue'
import OnnxVisionLab from './OnnxVisionLab.vue'
import SectionIndex from './SectionIndex.vue'
import FrontendSectionIndex from './FrontendSectionIndex.vue'
import './style.css'

export default {
  ...DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('HomePage', HomePage)
    app.component('MermaidDiagram', MermaidDiagram)
    app.component('OnnxVisionLab', OnnxVisionLab)
    app.component('SectionIndex', SectionIndex)
    app.component('FrontendSectionIndex', FrontendSectionIndex)
  }
} satisfies VitePressTheme
