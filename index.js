
function get(unoConfig, path, defaultValue) {
  // Convert the path from Tailwind's dot notation to UnoCSS's structure
  const keys = Array.isArray(path) ? path : path.split('.');
  let result = unoConfig;

  // Map the keys from Tailwind's theme structure to UnoCSS's equivalent
  const unoThemeMap = {
    colors: 'theme.colors',
    // Add other mappings based on UnoCSS's theme structure
    // ...
  };

  for (const key of keys) {
    // If the key exists in the mapping, use the mapped key
    const mappedKey = unoThemeMap[key] || key;
    const mappedKeys = mappedKey.split('.');

    // Traverse the UnoCSS config using the mapped keys
    for (const subKey of mappedKeys) {
      result = result[subKey];
      if (result === undefined) {
        return defaultValue;
      }
    }
  }

  return result;
}

export default pluginToPreset = (presetName, tailwindPlugin, unoConfig) => {
  const unoPreset = {
    name: presetName,
    variants: [],
    rules: [],
  };

  const tailwindAPI = {
    addVariant: (name, variantFunction) => {
      unoPreset.variants.push({
        name,
        match: (selector) => {
          let modifiedSelector;
          variantFunction({
            modifySelectors: ({ selector: modifySelector }) => {
              modifiedSelector = modifySelector(({ className }) => {
                return `.${name}\\:${className}`;
              });
            },
            separator: ':',
          });
          if (selector.startsWith(`${name}:`)) {
            return selector.replace(`${name}:`, modifiedSelector);
          }
          return selector;
        },
      });
    },
    matchVariant: (variants, options) => {
      Object.entries(variants).forEach(([key, variantFunction]) => {
        unoPreset.variants.push({
          name: key,
          match: (selector) => {
            let modifiedSelector;
            variantFunction({
              modifySelectors: ({ selector: modifySelector }) => {
                modifiedSelector = modifySelector(({ className }) => {
                  return `.${key}\\:${className}`;
                });
              },
              separator: ':',
            });
            if (selector.startsWith(`${key}:`)) {
              return selector.replace(`${key}:`, modifiedSelector);
            }
            return selector;
          },
        });
      });
    },
    theme: (path, defaultValue) => {
      // Access the theme configuration from unoConfig
      const themeConfig = unoConfig.theme || {};
      return get(themeConfig, path, defaultValue);
    },
    config: (path, defaultValue) => {
      // Access the full UnoCSS configuration
      return get(unoConfig, path, defaultValue);
    },
    corePlugins: (pluginName) => {
      // Assuming `unoConfig.presets` is the list of enabled presets in UnoCSS configuration
      return unoConfig.presets && unoConfig.presets.some(preset => preset.name === presetName);
    },
    addUtilities: (utilities, options) => {
      Object.entries(utilities).forEach(([key, value]) => {
        unoPreset.rules.push([key, value]);
      });
    },
    matchUtilities: (utilities, options) => {
      Object.entries(utilities).forEach(([key, utilityFunction]) => {
        unoPreset.rules.push([
          new RegExp(`^${key}-(.+)$`), 
          (match, value) => utilityFunction(value, options)
        ]);
      });
    },
    addComponents: (components, options) => {
      Object.entries(components).forEach(([key, value]) => {
        unoPreset.rules.push([key, value]);
      });
    },
    matchComponents: (components, options) => {
      Object.entries(components).forEach(([key, componentFunction]) => {
        unoPreset.rules.push([
          new RegExp(`^${key}-(.+)$`), 
          (match, value) => componentFunction(value, options)
        ]);
      });
    },
    addBase: (baseStyles) => {
      Object.entries(baseStyles).forEach(([key, value]) => {
        unoPreset.rules.push([key, value]);
      });
    },
    e: (className) => {
      return className.replace(/([:.])/g, '\\$1');
    }
  };

  // Execute the Tailwind plugin with the mocked API
  tailwindPlugin(tailwindAPI);

  return unoPreset;
};
