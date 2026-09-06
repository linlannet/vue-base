---
layout: home

hero:
  name: ll-editor
  text: A Plugin-based Code Editor Core
  tagline: A pluggable Monaco-powered editor core + runtime + plugin marketplace
  actions:
    - theme: brand
      text: Getting Started
      link: /en/guide/getting-started
    - theme: alt
      text: API Reference
      link: /en/api/ll-editor

features:
  - title: Plugin-based core
    details: Layered core / editor / languages / storage / runtime / plugin-api, with dependency guards enforced by unit tests.
  - title: Monaco-powered
    details: Reuses the VS Code editor core — syntax highlight, multi-cursor, breakpoint glyph margin, worker language services.
  - title: Tabs + Storage
    details: Multi-document tabs with LocalStorage / IndexedDB / REST backends, all injected via config.
  - title: Bilingual
    details: Docs site ships with i18n (switch via the top-right control); editor UI locale supports zh-CN / en.
  - title: Framework-agnostic core
    details: The LLEditor orchestrator is a plain TS class with no Vue dependency; UI is decoupled from the host framework.
  - title: Type-safe
    details: Whitelisted public exports, with vue-tsc type checking and .d.ts (see repo build).

footer: MIT License © 2026 ll-editor
---
