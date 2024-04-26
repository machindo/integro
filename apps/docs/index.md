---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Integro"
  text: "Seamless API integration with E2E integrity."
  tagline: Node API service with automatic client-side type safety.
  actions:
    - theme: brand
      text: What is integro?
      link: /introduction/what-is-integro
    - theme: alt
      text: Getting Started
      link: /introduction/getting-started

features:
  - title: Seamless integration
    details: |
      Write functions on the server. Call those functions from the client. It's that easy.
  - title: E2E type-safety
    details: |
      The client app is automatically typed to match the server functions' parameters and return types, with no build step.
  - title: Framework agnostic
    details: |
      On the backend, integro works with Node's http or https module, Bun's serve method, Express.js, and more.
      On the frontend, integro works with with any framework or vanilla JavaScript.
---
