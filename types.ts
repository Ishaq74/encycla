
export enum GameState {
  MENU = 'MENU',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  ARTICLE = 'ARTICLE', // Reading the article after a correct answer
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  TURN_SWITCH = 'TURN_SWITCH' // New state for swapping players in contest
}

export enum GameMode {
  CLASSIC = 'CLASSIC', // 10 Levels, 20 Questions each, Mixed categories
  SUBJECT = 'SUBJECT',  // 1 Level, 20 Questions, Fixed Category
  CONTEST = 'CONTEST'   // 2 Players, 10 Rounds, Head to Head
}

export enum Difficulty {
  NOVICE = 'Novice',
  ADVENTURER = 'Adventurer',
  WIZARD = 'Wizard'
}

export enum Category {
  FAUNA = 'Fauna',
  FLORA = 'Flora',
  FLAGS = 'Flags',
  BIRDS = 'Birds',
  TREES = 'Trees',
  INSECTS = 'Insects',
  MUSHROOMS = 'Mushrooms',
  ARCHITECTURE = 'Architecture',
  INVENTIONS = 'Inventions',
  ARTS = 'Arts & Literature',
  GEOGRAPHY = 'Geography',
  SPACE = 'Space & Astronomy',
  HISTORY = 'History',
  MYTHOLOGY = 'Mythology',
  FOOD = 'Gastronomy',
  MUSIC = 'Music',
  SPORTS = 'Sports',
  SCIENCE = 'Science'
}

export interface QuestionData {
  subject: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  articleTitle: string;
  articleBody: string;
  base64Image?: string;
}

export interface PlayerStats {
  score: number;
  level: number;       // Current level (1-10)
  questionsAnswered: number; // 0-20
  lives: number;
}
