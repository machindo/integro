import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Integro",
  description: "Seamless API integration",
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
        ]
      },
      {
        text: 'API',
        items: [
          { text: 'integro', link: '/api/integro' },
          { text: 'createClient', link: '/api/createClient' },
          { text: 'respondWith', link: '/api/respondWith' },
          { text: 'unwrap', link: '/api/unwrap' },
          { text: 'defineApp', link: '/api/defineApp' },
        ]
      },
      {
        text: 'Recipes',
        items: [
          { text: 'CORS', link: '/recipes/cors' },
          { text: 'React', link: '/recipes/react' },
          { text: 'Server side validation', link: '/recipes/server-side-validation' },
        ]
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/jpsilva/integro' }
    ]
  }
})
