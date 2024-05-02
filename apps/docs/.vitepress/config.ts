import { defineConfig } from 'vitepress'
import taskLists from 'markdown-it-task-lists';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Integro",
  description: "Seamless API integration",
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
  ],
  markdown: {
    config: md => {
      md.use(taskLists);
    }
  },
  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/introduction/getting-started' },
    ],

    search: {
      provider: 'local'
    },

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is Integro?', link: '/introduction/what-is-integro' },
          { text: 'Getting Started', link: '/introduction/getting-started' },
          { text: 'Subscriptions', link: '/introduction/subscriptions' },
        ],
      },
      {
        text: 'API reference',
        items: [
          {
            text: 'Server API',
            items: [
              { text: 'createController', link: '/api/createController' },
              { text: 'createSubject', link: '/api/createSubject' },
              { text: 'createSubscriptionController', link: '/api/createSubscriptionController' },
              { text: 'respondWith', link: '/api/respondWith' },
              { text: 'unwrap', link: '/api/unwrap' },
              { text: 'defineApp', link: '/api/defineApp' },
            ]
          },
          {
            text: 'Client API',
            items: [
              { text: 'createClient', link: '/api/createClient' },
              { text: 'batch', link: '/api/batch' },
            ]
          },
        ]
      },
      {
        text: 'Recipes',
        items: [
          { text: 'Server-side validation', link: '/recipes/server-side-validation' },
          { text: 'CORS', link: '/recipes/cors' },
          { text: 'React', link: '/recipes/react' },
        ]
      },
      {
        text: 'Roadmap',
        link: 'roadmap',
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/jpsilva/integro' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/integro' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Justin Paul Silva'
    },
  }
})
