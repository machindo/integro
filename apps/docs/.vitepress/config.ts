import { defineConfig } from 'vitepress'
import taskLists from 'markdown-it-task-lists';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Integro",
  description: "Seamless API integration",
  markdown: {
    config: md => {
      md.use(taskLists);
    }
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/introduction/getting-started' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is Integro?', link: '/introduction/what-is-integro' },
          { text: 'Getting Started', link: '/introduction/getting-started' },
        ],
      },
      {
        text: 'API reference',
        items: [
          {
            text: 'Server API',
            items: [
              { text: 'createController', link: '/api/createController' },
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
      { icon: 'github', link: 'https://github.com/jpsilva/integro' }
    ]
  }
})
