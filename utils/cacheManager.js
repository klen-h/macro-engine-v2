import fs from 'fs';
import path from 'path';

/**
 * Ensures the directory for a given file path exists.
 * @param {string} filePath - The full path to the file.
 */
export function ensureDirForFile(filePath) {
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Loads a JSON file from the filesystem.
 * @param {string} filePath - The path to the JSON file.
 * @param {any} defaultValue - The default value to return if the file does not exist or is unreadable.
 * @returns {any} The parsed JSON content or the default value.
 */
export function loadJsonFile(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`[cacheManager] Error reading or parsing ${filePath}:`, e.message);
    return defaultValue;
  }
}

/**
 * Saves content to a JSON file.
 * Ensures the directory exists before writing.
 * @param {string} filePath - The path to the JSON file.
 * @param {any} content - The JavaScript object to be stringified and saved.
 */
export function saveJsonFile(filePath, content) {
  ensureDirForFile(filePath);
  try {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
  } catch (e) {
    console.error(`[cacheManager] Error writing to ${filePath}:`, e.message);
  }
}