---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Integro"
  text: "Seamless API integration with E2E integrity."
  tagline: Convert your app into an API server+client with end-to-end type safety in just 2 lines.
  actions:
    - theme: brand
      text: What is integro?
      link: /introduction/what-is-integro
    - theme: alt
      text: Getting Started
      link: /introduction/getting-started

features:
  - title: Seamless integration
    details: Write functions on the server. Call those functions from the client, types included. Don't waste time designing and maintaining your endpoints.
  - title: Go beyond JSON
    details: Integro uses MessagePack internally to send nearly any data type to and from the server, including binary data and JS Dates.
  - title: Pub/Sub
    details: With integro, publishing and subscribing to events couldn't be easier. Upgrade to web sockets with 1 additional line of code.
  - title: Framework agnostic
    details: Integro supports Node's http/s, Bun.serve, Express, and more. You can also plug it into your existing REST API.
  - title: Authentication/authorization
    details: Send authorization token with both requests and web sockets, to verify the user before responding or allowing subscriptions.
  - title: Server-side validation made easy
    details: Works with many popular validation libraries, including Zod, Typia, and Prisma's built-in validation.
---
