/**
 * Modifiers System
 * 
 * This module dynamically discovers and registers all task modifiers.
 * Import this file to register all modifiers with the ModifierRegistry.
 */
import { ModifierRegistry } from '../models/modifiers';
// @ts-ignore
import fs from 'fs';
// @ts-ignore
import path from 'path';

// For CommonJS compatibility
// @ts-ignore
const __dirname = __dirname || '.';

/**
 * Dynamically import and register all modifiers from the types directory
 */
async function registerAllModifiers() {
  // Get the path to the types directory
  const typesDir = path.join(__dirname, 'types');
  
  try {
    // Read all files in the types directory
    const files = fs.readdirSync(typesDir);
      // Filter for TypeScript files
    const typeScriptFiles = files.filter((file: string) => file.endsWith('.ts') || file.endsWith('.js'));
    
    // Log discovery
    console.log(`Found ${typeScriptFiles.length} potential modifier files in ${typesDir}`);
    
    // Import each file and register its default export
    for (const file of typeScriptFiles) {
      try {
        // Get the file name without extension to use as the modifier type
        const modifierType = path.basename(file, path.extname(file));
          // Dynamic import
        const modulePath = `./types/${modifierType}`;
        
        // Using require for simplicity in a CommonJS environment
        // For ESM, we'd use import() but that requires more setup
        // @ts-ignore
        const modifierModule = require(modulePath);
        
        // Get the class (assuming it's exported as "ModifierNameModifier")
        const ModifierClass = modifierModule[`${capitalizeFirstLetter(modifierType)}Modifier`];
        
        if (ModifierClass) {
          // Instantiate and register
          const modifier = new ModifierClass();
          ModifierRegistry.register(modifierType, modifier);
          console.log(`Registered modifier: ${modifierType}`);
        } else {
          console.warn(`Could not find modifier class in ${file}`);
        }
      } catch (err) {
        console.error(`Error loading modifier from file ${file}:`, err);
      }
    }
    
    console.log(`Successfully registered modifiers: ${ModifierRegistry.getAvailableTypes().join(', ')}`);
  } catch (err) {
    console.error('Error discovering modifiers:', err);
  }
}

/**
 * Helper function to capitalize the first letter of a string
 */
function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Register all modifiers on import
registerAllModifiers();

// Export nothing - importing this file is enough to register all modifiers