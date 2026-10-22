Encycla — Architecture Decision Records (ADR)Version : 1.0

Date : 2026-10-22

Statut : Validé pour implémentation

Nom du produit : Encycla

Objectif : Document unique et exhaustif. Le développeur n’a aucune décision d’architecture à prendre. Il exécute.1. Principes généraux
Le serveur est la seule source de vérité.
Le client React n’émet que des intentions (Join, Answer, Leave, Start, etc.). Il ne calcule jamais le score, le chrono, les vies ou le gagnant.
Toute transition illégale est droppée silencieusement (log côté serveur uniquement).
Aucune logique de jeu dans les composants React.
Types partagés entre client et serveur via un seul fichier types.ts.
Zéro secret côté client.
ADR-001 — Serveur autoritaireDécision : Toute la logique de jeu vit dans server/game-engine.ts.Fichiers à créer :
server/types-server.ts
server/game-engine.ts
Contenu exact de types-server.ts :TypeScriptimport { GameState, GameMode, Difficulty, Category, QuestionData } from '../types';

export interface PlayerConnection {
  socketId: string;
  playerId: string;
  roomCode: string;
  isHost: boolean;
  pseudo: string;
  lives: number;
  score: number;
  isReady: boolean;
}

export interface Room {
  code: string;
  mode: GameMode;
  isPublic: boolean;
  hostId: string;
  players: PlayerConnection[];
  gameState: GameState;
  createdAt: number;
  currentQuestion?: QuestionData;
  questionStartedAt?: number;
  questionsAnsweredThisLevel: number;
  level: number;
  usedQuestionIds: string[];
}

export type GameEvent =
  | { type: 'JOIN'; playerId: string; pseudo: string }
  | { type: 'LEAVE'; playerId: string }
  | { type: 'START' }
  | { type: 'ANSWER'; playerId: string; choiceIndex: number }
  | { type: 'TIMEOUT' }
  | { type: 'ROUND_END' }
  | { type: 'ACCEPT_SMALL_ROOM'; playerId: string; accepted: boolean };Comportement de GameEngine.handleEvent :
Vérifie que la transition est légale depuis l’état courant.
Si illégale → console.log + return null.
Si légale → applique les changements et retourne le nouvel état de la Room.
Le timer est géré exclusivement par le serveur (setInterval 200 ms).
À l’entrée en état Playing : stocke Date.now() dans questionStartedAt.
Broadcast timeRemaining à tous les clients de la room.
À 0 ms : le moteur émet lui-même l’événement TIMEOUT.
Scoring Encarta (constants existants) :
MAX_LIVES = 3
Mauvaise réponse → -1 vie.
0 vie → joueur éliminé pour la partie.
QUESTIONS_PER_LEVEL = 20 bonnes réponses → niveau suivant.
TOTAL_LEVELS_CLASSIC = 10.
ADR-002 — Transport temps réelDécision : Socket.io uniquement.Fichier : server/server.tsComportement :
Express sur port 3000.
Socket.io attaché au serveur HTTP.
À la connexion : le client envoie { type: 'JOIN', playerId, pseudo }.
Le serveur associe socketId ↔ playerId.
Reconnexion : le client renvoie son playerId. Le serveur retrouve le joueur par playerId (pas par socketId) et renvoie l’état complet de la room.
Déconnexion : timer de 30 secondes. Si pas de reconnexion → événement LEAVE automatique.
Nettoyage : toutes les 60 secondes, suppression des rooms vides depuis plus de 10 minutes.
CORS ouvert en développement, restreint au domaine de production en prod.
ADR-003 — Matchmaking (privé + public)Fichier : server/matchmaking.tsSalon privé :
Route POST /rooms
Body : { hostPseudo: string, mode: GameMode }
Génère un code de 6 caractères alphanumériques majuscules.
Crée la Room avec isPublic: false.
Retourne { code: string }.
Salon public :
Route POST /queue
Body : { playerId: string, pseudo: string, mode: GameMode }
Ajoute le joueur dans une file d’attente en mémoire.
Seuil de lancement : 4 joueurs.
Dès que 4 joueurs sont dans la file → création automatique d’une Room publique + notification match-found.
Timer de 2 minutes :
Si < 4 joueurs après 2 minutes → broadcast small-room-proposal avec le nombre actuel.
Chaque joueur répond avec { type: 'ACCEPT_SMALL_ROOM', accepted: boolean }.
Majorité accepte → lancement avec le nombre réel de joueurs.
Sinon → reset du timer.

ADR-004 — Client React purDécision : Aucune logique de jeu dans React.Modifications :
MindMazeGame.tsx devient un composant purement présentationnel.
Props : engineState + onAction(event: GameEvent).
Suppression de tous les useState de jeu existants (timer, scores, lobby, etc.).
Création de client/store.ts avec Zustand qui stocke uniquement l’état poussé par le serveur.
Adaptateurs de contrôle (émettent tous le même événement ANSWER) :
client/adapters/keyboard.ts : mapping AZERTY existant (joueur 1 et joueur 2).
client/adapters/touch.ts : 4 gros boutons A/B/C/D (visible < 768px).
server/tiktok-adapter.ts : voir ADR-007.
Overlay TikTok :
Query param ?mode=overlay → masque menu et contrôles, affiche uniquement le jeu en plein écran.
ADR-005 — Questions (Static + Gemini)Fichier : server/question-provider.tsInterface :TypeScriptinterface QuestionProvider {
  getQuestion(category: Category, difficulty: Difficulty): Promise<QuestionData | null>;
}Implémentations :
StaticProvider : lit data/questions.json. Tirage sans remise par session (usedQuestionIds dans la Room).
DynamicProvider : appelle Gemini uniquement si le pool statique de la catégorie est épuisé. La question générée est insérée dans la table questions_pending et n’entre jamais directement dans le jeu sans validation manuelle.
Corrections obligatoires :
Aligner Category de types.ts (17 valeurs) avec le contenu réel de data/questions.json.
Extraire TRIVIA_DATABASE de geminiService.ts vers data/questions.json.
Supprimer la duplication de l’interface QuestionData.
Switch : variable d’environnement QUESTION_SOURCE=static|dynamic|hybrid.ADR-006 — PersistanceTechnologie : better-sqlite3

Fichier : data/encycla.dbSchéma (compatible Postgres) :SQLCREATE TABLE players (
  id TEXT PRIMARY KEY,
  pseudo TEXT NOT NULL,
  avatar TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL,
  mode TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER
);

CREATE TABLE scores (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  points INTEGER NOT NULL,
  rank INTEGER,
  FOREIGN KEY(player_id) REFERENCES players(id),
  FOREIGN KEY(match_id) REFERENCES matches(id)
);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  category TEXT NOT NULL,
  source TEXT NOT NULL,
  difficulty TEXT NOT NULL
);

CREATE TABLE questions_pending (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
Écriture dans scores à chaque ROUND_END.
Route GET /leaderboard → top 50.
ADR-007 — Adaptateur TikTokFichier : server/tiktok-adapter.tsComportement :
Utilise tiktok-live-connector.
Se connecte au pseudo du créateur.
Mappe uniqueId → playerId de la room TikTok.
Commentaire A, B, C ou D → événement ANSWER avec choiceIndex correspondant.
Injecte dans GameEngine.handleEvent comme n’importe quel autre client.
Fallback documenté dans le README : si le connecteur tombe, l’animateur tape les réponses manuellement.
ADR-008 — SonsDossier : public/sounds/

Fichiers : correct.mp3, wrong.mp3, lobby-join.mp3, countdown-tick.mp3, level-up.mp3Hook : client/hooks/useSound.ts

Déclenché uniquement par les événements socket reçus.ADR-009 — Accessibilité
Contraste minimum AA sur tous les composants UI.
aria-label sur chaque option de réponse.
Navigation clavier complète (Tab, Entrée, Échap).
Test obligatoire avec VoiceOver avant release.
ADR-010 — Gestion d’erreurs et robustesse
Toutes les routes Express et tous les handlers Socket.io sont entourés de try/catch.
Gemini : timeout 5 s + 1 retry. En cas d’échec → fallback StaticProvider.
SQLite corrompu → le serveur démarre quand même, persistance désactivée pour la session, log d’erreur.
Rate limiting : 100 req/min par IP (HTTP) + 10 événements/seconde par socket.
ADR-011 — TestsOutil : VitestCouverture minimale : 80 % sur le dossier server/.Tests obligatoires :
Toutes les transitions légales et illégales de la machine à états.
Timer avec fake timers.
Scoring (vies, niveaux).
File d’attente publique (4 joueurs + proposition 2-3).
Reconnexion socket.
ADR-012 — Déploiement
Dockerfile multi-stage (build Vite + runtime Node).
docker-compose.yml avec volume pour data/.
Variables d’environnement : GEMINI_API_KEY, PORT, NODE_ENV, QUESTION_SOURCE.
CI GitHub Actions : lint + build + tests sur chaque push main.
ADR-013 — Sécurité
GEMINI_API_KEY uniquement côté serveur.
Validation stricte des événements socket (choiceIndex entre 0 et 3).
CORS restreint en production.
ADR-014 — Critères de sortie
Partie complète jouable à 2 joueurs minimum (privé + public).
Overlay TikTok fonctionnel.
Live d’1 heure avec 20 viewers sans crash (testé sur compte secondaire).
Latence chat → événement serveur < 500 ms.
Classement persistant après redémarrage.
