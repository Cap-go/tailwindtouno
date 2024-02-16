
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

export const TailwindColorToUno = (tailwindColors) => {
  const unoColors = {};
  Object.entries(tailwindColors).forEach(([colorName, colorValues]) => {
    if (typeof colorValues === 'string') {
      // If the color value is a string, it's a single color without shades.
      unoColors[colorName] = colorValues;
    } else if (typeof colorValues === 'object') {
      // If the color value is an object, it has shades.
      Object.entries(colorValues).forEach(([shade, shadeValue]) => {
        const unoColorName = `${colorName}-${shade}`;
        unoColors[unoColorName] = shadeValue;
      });
    }
  });

  return unoColors;
}

export const pluginToPreset = (presetName, tailwindPlugin, unoConfig) => {
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
      function HandleComplexValues(value) {
        const processedValue = {};
      
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          Object.entries(value).forEach(([property, propertyValue]) => {
            if (typeof propertyValue === 'object' && !Array.isArray(propertyValue) && propertyValue !== null) {
              // If the property value is an object, it might represent multiple CSS properties
              Object.assign(processedValue, propertyValue);
            } else if (Array.isArray(propertyValue)) {
              // If the property value is an array, it might represent a series of responsive styles
              propertyValue.forEach((responsiveValue, index) => {
                // You would need to define how you want to handle the responsive array index
                // For example, you might map it to a breakpoint name
                const breakpointName = `breakpoint-${index}`;
                processedValue[`${breakpointName} ${property}`] = responsiveValue;
              });
            } else {
              // If the property value is neither an object nor an array, it's a direct rule
              processedValue[property] = propertyValue;
            }
          });
        } else {
          // If the value is a string or a number, it's a direct rule
          return value;
        }
      
        return processedValue;
      }
      utilities = HandleComplexValues(utilities);    

      function HandleNested(utilities) {
        const processedUtilities = {};
      
        Object.entries(utilities).forEach(([key, value]) => {
          if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
            Object.entries(value).forEach(([nestedKey, nestedValue]) => {
              if (nestedKey.includes('&')) {
                // Replace '&' with the parent selector
                const nestedSelector = nestedKey.replace(/&/g, key);
      
                if (typeof nestedValue === 'object' && !Array.isArray(nestedValue) && nestedValue !== null) {
                  Object.entries(nestedValue).forEach(([prop, val]) => {
                    // Add the nested selector and its properties to the processed utilities
                    processedUtilities[nestedSelector] = { ...processedUtilities[nestedSelector], [prop]: val };
                  });
                } else {
                  // If nestedValue is not an object, it's a direct rule
                  processedUtilities[nestedSelector] = nestedValue;
                }
              } else {
                // If there's no nested selector, add the property and value directly
                const selector = `${key} ${nestedKey}`;
                processedUtilities[selector] = nestedValue;
              }
            });
          } else {
            // If the value is not an object with nested selectors, add it directly
            processedUtilities[key] = value;
          }
        });
      
        return processedUtilities;
      }
      utilities = HandleNested(utilities);    
      Object.entries(utilities).forEach(([key, value]) => {
        // Check if the `important` option is set and modify the value accordingly
        if (options && options.important) {
          // Ensure value is an object before adding !important
          if (typeof value === 'object' && !Array.isArray(value)) {
            Object.keys(value).forEach((property) => {
              // Append !important to each property's value
              value[property] = `${value[property]} !important`;
            });
          } else if (typeof value === 'string') {
            // If the value is a string, simply append !important
            value = `${value} !important`;
          }
        }
        // Check for negative values and transform the key
        if (key.startsWith('-')) {
          // Replace the leading '-' with the escape sequence for negative classes in UnoCSS
          key = `-${key.slice(1)}`;
        }
        // Check if the utility includes a color property
        if (value.hasOwnProperty('color')) {
          // Convert the Tailwind color to UnoCSS color
          const unoColors = TailwindColorToUno(value.color);
          // Replace the color value with the converted UnoCSS color
          value.color = unoColors;
        }
        // Add the utility to the UnoCSS rules
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


export const TailwindThemeToUno = (tailwindTheme) => {
  const unoTheme = {};

  // Iterate over each key in the Tailwind theme object
  Object.entries(tailwindTheme).forEach(([key, value]) => {
    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      // If the value is an object, it might represent a theme section with nested values
      unoTheme[key] = {};

      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        // Convert the nested theme values
        unoTheme[key][nestedKey] = nestedValue;
      });
    } else {
      // If the value is not an object, it's a direct theme value
      unoTheme[key] = value;
    }
  });

  // Handle specific theme conversions, such as colors
  if (tailwindTheme.colors) {
    unoTheme.colors = TailwindColorToUno(tailwindTheme.colors);
  }
  if (tailwindTheme.screens) {
    unoTheme.breakpoints = tailwindTheme.screens;
  }

  // Add other specific conversions as needed
  // ...

  return unoTheme;
}
