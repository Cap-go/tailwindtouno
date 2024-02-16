  <a href="https://capgo.app/"><img src='https://raw.githubusercontent.com/Cap-go/capgo/main/assets/capgo_banner.png' alt='Capgo - Instant updates for capacitor'/></a>

<div align="center">
<h2><a href="https://capgo.app/">Check out: Capgo — Instant updates for Capacitor app</a></h2>
</div>

# Tailwind to Unocss

This is a simple plugin to convert Tailwindcss plugins to Unocss presets.

It's not perfect, contributions are welcome.

## Installation

```bash
npm install --save-dev tailwindtouno
```

## Usage

The way tailwind plugins work require to give the unoConfig to the tailwindToUno function.
That why the unoConfig is declared before using tailwindToUno function.
If you use many tailwind plugins, repeat the 2 last lines for each plugin.

```typescript
import { defineConfig, presetAttributify, presetUno } from 'unocss'

import { pluginToPreset, TailwindColorToUno, TailwindThemeToUno } from 'tailwindtouno';
import containerQueries  from 'tailwindcss/container-queries';
import { colors } from 'tailwindcss/colors';

const unoConfig = defineConfig({
  presets: [
    presetAttributify({ /* preset options */}),
    presetUno(),
  ],
  theme: {
    extend: {
      colors: {
        ...TailwindColorToUno(colors),
      },
      ...TailwindThemeToUno({
        extend: {
          screens: {
            '3xl': '1600px',
          },
        },
      }),
    }
  }
})
const presetRes = pluginToPreset('tailwindContainerQueries', containerQueries, unoConfig)
unoConfig.presets.push(presetRes)

export default unoConfig
```
