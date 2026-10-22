
import { Category, Difficulty } from './types';

export const CATEGORIES = Object.values(Category);
export const DIFFICULTIES = Object.values(Difficulty);

export const MAX_LIVES = 3;
export const QUESTIONS_PER_LEVEL = 20;
export const TOTAL_LEVELS_CLASSIC = 10;

export const LOADING_MESSAGES = [
  "Accessing Archives...",
  "Consulting the Library...",
  "Retrieving Scroll...",
  "Loading Question...",
  "Opening Encarta Database...",
  "Reading Microfilm...",
];

// No longer used, but kept as empty string to prevent import errors in other files if any exist
export const SYSTEM_INSTRUCTION_TRIVIA = "";
