import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { unified } from '@astrojs/markdown-remark';

export default defineConfig({
  site: 'https://mantains.github.io',
  output: 'static',
  trailingSlash: 'always',
  integrations: [mdx(), sitemap({
    i18n: { defaultLocale: 'en', locales: { en: 'en', zh: 'zh-CN' } }
  })],
  markdown: {
    processor: unified({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }),
    shikiConfig: { theme: 'github-light' }
  }
});
