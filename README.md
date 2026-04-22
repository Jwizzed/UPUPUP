# Remix: UPUPUP

**Remix: UPUPUP** is an endless vertical jumper arcade game built with Next.js, React, and TypeScript. Players jump endlessly upward on platforms, avoiding a rising "void" and enemies, while progressing through dynamic zones. The goal is simple: survive as long as possible and achieve the highest score.

---

## Features

- **Endless Vertical Jumping** – Jump from platform to platform in an infinite upward climb.
- **Dynamic Zones** – Progress through themed zones with unique mechanics:
  - **Normal** – Standard platforming.
  - **Ice** – Slippery platforms that challenge your control.
  - **Wind** – Gusts that push you sideways.
  - **Low-G** – Reduced gravity changes your jump arc.
- **Combo / Frenzy System** – Chain actions to build combos and enter a frenzy mode for bonus points.
- **Multiple Difficulties** – Choose from **Easy**, **Hard**, and **Hell** modes to match your skill level.
- **Crumbling Platforms** – Some platforms break after you land on them, forcing quick decisions.
- **Moving Platforms** – Platforms that shift horizontally add an extra layer of challenge.
- **Shooting Mechanic (Hell Mode)** – Take aim and shoot to survive the toughest difficulty.
- **Rising Void** – A deadly void rises from below, keeping the pressure on.
- **Enemies** – Avoid or overcome enemies scattered throughout the climb.
- **Canvas-Based Rendering** – Smooth, high-performance 2D gameplay via HTML5 Canvas.
- **Custom Web Audio Soundtrack** – Procedural sound effects and music powered by the Web Audio API.
- **Celebration Effects** – Confetti and visual flair powered by `canvas-confetti`.

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| [Next.js](https://nextjs.org/) | 15.4.9 | React framework & app router |
| [React](https://react.dev/) | 19.2.1 | UI library |
| [TypeScript](https://www.typescriptlang.org/) | 5.9.3 | Type-safe development |
| [Tailwind CSS](https://tailwindcss.com/) | 4.1.11 | Utility-first styling |
| [Motion](https://motion.dev/) (Framer Motion successor) | 12.23.24 | Animations & transitions |
| [Lucide React](https://lucide.dev/) | latest | Iconography |
| [canvas-confetti](https://github.com/catdad/canvas-confetti) | 1.9.4 | Celebration particle effects |
| Custom Web Audio API | – | Procedural sound & music |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm (comes with Node.js)

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open the app**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
.
├── app/
│   ├── globals.css          # Global styles & Tailwind directives
│   ├── layout.tsx           # Root layout component
│   └── page.tsx             # Main page / game entry point
├── components/
│   └── Game.tsx             # Core game engine & canvas logic
├── hooks/
│   └── use-mobile.ts        # Mobile device detection hook
├── lib/
│   ├── sounds.ts            # Custom Web Audio API sound library
│   └── utils.ts             # Utility functions (cn, etc.)
├── public/                  # Static assets (images, audio, etc.)
├── .env.example             # Example environment variables
├── next.config.ts           # Next.js configuration
├── package.json             # Dependencies & scripts
├── postcss.config.mjs       # PostCSS configuration
├── tailwind.config.ts       # Tailwind CSS configuration
└── tsconfig.json            # TypeScript configuration
```

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start the development server with hot reload |
| `build` | `npm run build` | Create an optimized production build |
| `start` | `npm run start` | Start the production server |
| `lint` | `npm run lint` | Run ESLint across the codebase |
| `clean` | `npm run clean` | Clean the Next.js build cache |

---

## License

This project is private and not licensed for public distribution.
