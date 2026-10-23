# Encycla — Architecture Decision Records

- Version : 2.0
- Date : 2026-10-22
- Statut global : accepté pour implémentation
- Remplace : `README.md` v1.0 (ADR-001 à ADR-014)
- Documents liés : [Spécification](SPECIFICATION.md), [Protocole](PROTOCOL.md), [Modèle de données](DATA-MODEL.md), [Sécurité](SECURITY.md), [Tests](TESTING.md), [Déploiement](DEPLOYMENT.md), [UI/UX](UI-UX.md), [Plan d'implémentation](IMPLEMENTATION-PLAN.md), [Journal des décisions](DECISIONS.md)

## Comment lire ce document

Chaque ADR contient le contexte, la décision, les conséquences et les alternatives rejetées. Une décision marquée **Accepté** est contraignante : elle ne peut être changée que par un nouvel ADR. Les ADR v1 qui étaient ambiguës, contradictoires ou irréalisables sont explicitement remplacées.

Les règles de jeu détaillées, les formules, les tables de transition et les contraintes de contenu vivent dans [SPECIFICATION.md](SPECIFICATION.md). Le présent fichier fixe l'architecture et les arbitrages.

## Index

| ADR | Sujet | Statut |
| --- | --- | --- |
| ADR-001 | Autorité serveur et moteur pur | Accepté |
| ADR-002 | Transport HTTP + Socket.io | Accepté |
| ADR-003 | Room comme unité de jeu et modes | Accepté |
| ADR-004 | Cycle de partie et progression | Accepté |
| ADR-005 | Score, vies, élimination, égalités | Accepté |
| ADR-006 | Temps, horloge, pause | Accepté |
| ADR-007 | Questions, sélection, mélange, sources | Accepté |
| ADR-008 | Difficulté | Accepté |
| ADR-009 | Identité, sessions, reconnexion | Accepté |
| ADR-010 | Matchmaking privé et public | Accepté |
| ADR-011 | Protocole d'événements et snapshots | Accepté |
| ADR-012 | Client React, Zustand, rôles | Accepté |
| ADR-013 | Persistance SQLite et leaderboard | Accepté |
| ADR-014 | Adaptateur TikTok | Accepté |
| ADR-015 | Overlay et console host | Accepté |
| ADR-016 | Sécurité | Accepté |
| ADR-017 | Accessibilité et sons | Accepté |
| ADR-018 | Tests, outillage, déploiement, limites | Accepté |

---

## ADR-001 — Le serveur est la seule source de vérité

### Contexte

Le prototype initial calcule le score, les vies, le chrono, la progression et le gagnant dans `components/EncyclaGame.tsx`. Il est impossible de garantir l'équité, la reconnexion, le multi-joueurs ou l'anti-triche avec cette architecture.

### Décision

1. Toute la logique de jeu vit dans `server/game/engine.ts` et ses modules (`scoring.ts`, `questions.ts`, `state-machine.ts`).
2. Le moteur est un **réducteur pur** : `handleEvent(state, event, ctx) -> { state, effects }` et `tick(state, now) -> { state, effects }`.
3. Le moteur ne connaît ni HTTP, ni Socket.io, ni SQLite, ni TikTok. Il produit des **effets** décrits en données (`BroadcastState`, `PersistScores`, `CloseRoom`, etc.). L'orchestrateur serveur applique ces effets.
4. Les dépendances non déterministes sont injectées : horloge (`now`), générateur aléatoire, générateur d'identifiants, fournisseur de questions.
5. Le client n'émet que des intentions (`ANSWER`, `CONTINUE`, `LOBBY_READY`, etc.) et n'interprète jamais une intention comme un résultat.
6. Une transition illégale ne modifie pas l'état. Le serveur loggue l'événement et renvoie une erreur typée à l'émetteur. Le silence total est interdit : il rend le débogage et la reconnexion impossibles.
7. Le client ne reçoit jamais `correctIndex`, `explanation` ou `articleBody` avant la phase `REVEAL`.

### Conséquences

- Le moteur est testable sans réseau ni base de données.
- Les timers et l'aléatoire sont reproductibles dans les tests.
- Le serveur peut être redémarré sans conserver les rooms en mémoire ; les parties en cours sont perdues et marquées abandonnées en base.
- Toute nouvelle règle doit être implémentée dans le moteur et testée, jamais dans un composant React.

### Alternatives rejetées

- Logique partagée client/serveur : duplication et divergence garanties.
- Moteur couplé à Socket.io : tests d'intégration lents et logique de transport mélangée aux règles.
- Moteur avec callbacks internes : impossible à sérialiser dans les tests et dans les effets.

---

## ADR-002 — Transport : HTTP pour les intentions durables, Socket.io pour le temps réel

### Contexte

Le README v1 impose Socket.io. Les opérations de création de session, de room et de file d'attente sont des requêtes ponctuelles ; les réponses aux questions et les changements de phase sont des événements temps réel.

### Décision

1. **HTTP/JSON** pour : création de session, mise à jour du pseudo, création de room privée, entrée/sortie de file publique, leaderboard, santé, administration, création de room TikTok.
2. **Socket.io** pour : connexion authentifiée, entrée/sortie de room, ready, start, answer, continue, pause/resume/skip, votes small-room, et toutes les notifications serveur → client.
3. Un seul processus Node expose Express et Socket.io sur le même port (`PORT`, 3000 par défaut).
4. Socket.io utilise un namespace `/game`. L'authentification se fait dans `handshake.auth.token`.
5. Les événements client → serveur utilisent des accusés de réception (`ack`) typés. Sans ack, le client ne peut pas distinguer un drop d'un succès.
6. Les snapshots serveur → client sont versionnés (`stateVersion` monotone par room). Le client ignore tout snapshot dont la version est inférieure ou égale à la sienne.
7. Les ticks de timer ne sont pas des snapshots complets : le serveur envoie une échéance absolue (`phaseEndsAt`) et une synchronisation périodique. Le client interpole localement.

### Conséquences

- En développement : serveur sur 3000, Vite sur 5173, proxy Vite pour `/api` et `/socket.io`.
- En production : Express sert le build Vite et l'API sur le même origin, ce qui simplifie CORS et CSP.
- Le transport est remplaçable : le moteur et les tests ne dépendent pas de Socket.io.

### Alternatives rejetées

- Tout en Socket.io, y compris les sessions et le leaderboard : moins cacheable, moins observable.
- Tout en HTTP polling : latence et charge inacceptables pour le jeu.
- WebSocket brut : perte des rooms, accusés de réception, reconnexion et fallback de Socket.io.

---

## ADR-003 — La room est l'unité de jeu ; les modes sont des presets

### Contexte

Le prototype a trois modes qui ne se projettent pas naturellement sur des rooms multi-joueurs : CLASSIC solo, SUBJECT solo et CONTEST local à deux sur le même clavier. Le README v1 parle de rooms de 4 joueurs sans dire comment les modes s'y appliquent.

### Décision

1. **Toute partie est une room**, y compris une partie solo. Une room solo contient un seul joueur humain.
2. Un mode est un **preset de règles** appliqué à la room, pas une implémentation séparée.
3. Le mode `CONTEST` local est supprimé. `CONTEST` devient un duel en ligne à deux joueurs, chacun sur son propre appareil.
4. Il n'existe plus de mode hors-ligne : le serveur est obligatoire.
5. Configuration des modes :

| Mode | Niveaux | Questions/niveau | Joueurs | Vies | Difficulté | Article |
| --- | --- | --- | --- | --- | --- | --- |
| CLASSIC | 10 | 20 | 1 à 8 en web, 0 au départ puis 1 à 100 en TikTok | 3, persistantes en room, rechargées par niveau en solo | progressive : niveaux 1-3 Novice, 4-7 Adventurer, 8-10 Wizard | après chaque question |
| SUBJECT | 1 | 20 | 1 à 8 en web, 0 au départ puis 1 à 100 en TikTok | 3, persistantes en room, rechargées en solo (sans effet sur 1 niveau) | fixe, choisie à la création | après chaque question |
| CONTEST | 1 | 10 | exactement 2 | aucune | fixe Adventurer | après chaque question |

6. `GameMode` reste `CLASSIC | SUBJECT | CONTEST` dans `types.ts`.
7. Une room possède un `RoomSettings` explicite : `maxPlayers`, `timerMs`, `lifePolicy`, `articlePolicy`, `autoAdvanceMs`, `isTikTok`, `isPublic`.
8. Les places web sont limitées à 8 par défaut. Les rooms TikTok sont limitées à 100 viewers rejoints, éliminés inclus ; au-delà, les nouveaux commentaires sont ignorés avec un log et un message overlay.

### Conséquences

- Un seul moteur, un seul protocole, une seule UI de jeu.
- Les règles de vies diffèrent entre solo et room ; c'est un choix explicite, pas un accident.
- Le clavier « joueur 1 / joueur 2 » du prototype disparaît : chaque client web contrôle un seul joueur.

### Alternatives rejetées

- Conserver le CONTEST local avec deux identités dans un même navigateur : contraire à l'autorité serveur et impossible à sécuriser.
- Faire de CONTEST un mode à 4 joueurs : contredit la définition d'un duel et le plateau actuel.
- Faire de SUBJECT un mode multi-niveaux : aucun intérêt produit et pool insuffisant.

---

## ADR-004 — Cycle de partie et progression

### Contexte

Le README v1 dit « 20 bonnes réponses → niveau suivant », mais ses structures stockent `questionsAnsweredThisLevel` au niveau de la room, pas du joueur. Le prototype n'incrémente ce compteur que sur une bonne réponse. Ces deux lectures sont incompatibles avec une room multi-joueurs où les joueurs répondent différemment.

### Décision

Terminologie : un joueur **actif** n'est ni éliminé ni forfait ; un joueur `DISCONNECTED` reste actif pendant sa fenêtre de 30 s. Un joueur **actif connecté** est `CONNECTED`.

1. La progression est **partagée par la room**.
2. Un niveau se termine après **20 questions résolues**, pas après 20 bonnes réponses. Une question est résolue quand tous les joueurs actifs connectés ont répondu (s'il y en a) ou quand le timer expire.
3. Une réponse correcte, incorrecte ou un timeout compte comme une question résolue.
4. Chaque question donne lieu à : `QUESTION` → `REVEAL` (2,5 s) → `ARTICLE` → question suivante ou `LEVEL_COMPLETE`. Exception : une fin anticipée web/solo (élimination, moins de 2 actifs) passe directement de `REVEAL` à `MATCH_OVER`.
5. L'article est affiché après **chaque** question, correcte ou non, pour conserver la vocation encyclopédique.
6. En web, la sortie d'`ARTICLE` et de `LEVEL_COMPLETE` nécessite que tous les joueurs actifs et connectés aient cliqué sur `CONTINUE`, ou expire après 30 s (ARTICLE) / 15 s (LEVEL_COMPLETE). Les joueurs éliminés, forfaits, déconnectés ou partis ne bloquent pas.
7. En TikTok, l'article avance automatiquement après 8 s ; le host peut accélérer avec `HOST_SKIP`.
8. Fin naturelle : après le dernier niveau CLASSIC, ou après l'unique niveau SUBJECT/CONTEST, la room affiche l'article final puis passe à `MATCH_OVER`, sans `LEVEL_COMPLETE`.
9. La progression solo suit les mêmes règles : 20 questions résolues par niveau, 10 niveaux en CLASSIC, 1 en SUBJECT.
10. `questionsResolvedThisLevel` est la source de vérité ; `questionIndex` affiché = `questionsResolvedThisLevel + 1`.
11. Une room TikTok ne s'arrête pas sur `< 2` actifs ou une élimination collective : elle continue jusqu'à la fin naturelle ou `HOST_CLOSE`. Si elle termine avec `player_count=0`, le match est `abandoned`.

### Conséquences

- Le libellé « 20 bonnes réponses » du README v1 est remplacé par « 20 questions résolues ».
- Le compteur `questionsAnswered` par joueur devient une statistique, pas un déclencheur de niveau.
- Un joueur lent peut bloquer la room jusqu'à l'expiration du timer, ce qui est borné par la durée de la question.

### Alternatives rejetées

- Progression par joueur : les joueurs ne verraient plus les mêmes questions et l'article ne serait plus synchronisable.
- Progression basée sur les bonnes réponses : une room peut rester bloquée si personne ne répond juste, et le pool de questions devient imprévisible.
- Article uniquement après une bonne réponse : perte de la valeur pédagogique et comportement différent du prototype.

---

## ADR-005 — Score, vies, élimination et égalités

### Contexte

Le README v1 ne définit aucune formule de score, alors que le prototype en contient deux (CLASSIC et CONTEST). Les vies sont rechargées à chaque niveau dans le prototype, mais le README dit « éliminé pour la partie ».

### Décision

#### Constantes

```ts
MAX_LIVES = 3
QUESTIONS_PER_LEVEL = 20
TOTAL_LEVELS_CLASSIC = 10
CONTEST_QUESTIONS = 10
BASE_POINTS = 100
CONTEST_BASE_POINTS = 1000
SPEED_BONUS_MAX = 50
SPEED_BONUS_FULL_WINDOW_MS = 3_000
SPEED_BONUS_DECAY_WINDOW_MS = 10_000
STREAK_BONUS_PER_CORRECT = 20
STREAK_BONUS_CAP = 10
CONTEST_SPEED_BONUS = 200
DIFFICULTY_MULTIPLIER = { Novice: 1.0, Adventurer: 1.25, Wizard: 1.5 }
```

#### Formule CLASSIC et SUBJECT

Pour une réponse correcte :

```text
responseTimeMs = clamp(answerReceivedAt - questionStartedAt - pausedDurationMs, 0, timerMs)
speedBonus = max(0, round(SPEED_BONUS_MAX * (1 - max(0, responseTimeMs - 3000) / 10000)))
basePoints = round(100 * difficultyMultiplier * level)
streakBonus = min(streakBeforeAnswer, 10) * 20
pointsAwarded = basePoints + speedBonus + streakBonus
```

- En CLASSIC, `difficultyMultiplier` suit la difficulté du level ; en SUBJECT, la difficulté choisie à la création.
- Le bonus de vitesse vaut 50 points à 0-3 s, puis décroît linéairement jusqu'à 0 à 13 s.
- Le bonus de série utilise la série **avant** la réponse, puis la série est incrémentée si la réponse est correcte.
- La série est plafonnée à 10 pour le bonus (200 points maximum) mais la valeur affichée peut continuer à augmenter.
- La série est remise à zéro sur une mauvaise réponse ou un timeout.
- La série persiste d'un niveau à l'autre.
- Une mauvaise réponse ou un timeout donne 0 point.
- Une réponse correcte ne rend pas de vie.

#### Formule CONTEST

```text
pointsAwarded = correct ? 1000 : 0
si au moins deux joueurs ont répondu correctement :
  le ou les joueurs les plus rapides reçoivent +200
  en cas d'égalité exacte au milliseconde, tous les ex æquo reçoivent +200
```

- Pas de multiplicateur de niveau, pas de série, pas de vies, pas d'élimination.
- Une mauvaise réponse ou un timeout donne 0.

#### Vies et élimination

1. `MAX_LIVES = 3`.
2. Mauvaise réponse ou timeout : `lives -= 1`.
3. `lives == 0` : le joueur passe `ELIMINATED`. Il ne peut plus répondre et devient spectateur.
4. En room multi-joueurs et en TikTok, les vies sont **persistantes** pour toute la partie.
5. En solo CLASSIC/SUBJECT, les vies sont **rechargées à 3** à chaque `LEVEL_COMPLETE`. Ce choix garde la campagne solo jouable sur 200 questions.
6. Si un joueur est éliminé en solo, la partie se termine immédiatement après la révélation.
7. En room web multi-joueurs, la partie continue tant qu'il reste au moins deux joueurs actifs. Dès qu'il n'en reste qu'un, ce dernier est déclaré vainqueur et la partie se termine après la révélation. Une room TikTok ne s'arrête pas sur `< 2` actifs.
8. En room web, si tous les joueurs sont éliminés lors de la même question, la partie se termine et le classement est calculé au score. Une room TikTok continue. Si aucun joueur non-forfait ne peut être classé (tous forfaits), le match est abandonné.
9. Un joueur qui quitte volontairement la room en partie est forfait : `forfeited = true`, il conserve son score courant, ne peut pas gagner, n'est pas compté comme actif et est retiré de la room. En lobby, il est simplement retiré.
10. Si un joueur se déconnecte sans revenir dans les 30 s, il est traité comme forfait (`FORFEITED`) en partie.

#### Classement final

Ordre déterministe :

1. Statut : survivant/vainqueur avant éliminés/forfaits.
2. Points décroissants.
3. Nombre de bonnes réponses décroissant.
4. Nombre de mauvaises réponses croissant (timeouts inclus).
5. Temps de réponse cumulé croissant.
6. Ordre d'arrivée dans la room croissant.
7. Si tout est égal : égalité.

Le serveur expose ce classement dans `PublicRoomState.finalRanking` à `MATCH_OVER`, avec des rangs 1-based par compétition et un indicateur `tied`. Les joueurs encore membres sont inclus, y compris les forfaits par déconnexion ; les départs volontaires retirés ne le sont pas. `winnerId` est l'unique rang 1, ou `null` en cas d'égalité parfaite au premier rang ou de match abandonné ; un match abandonné a toujours `finalRanking=[]`. Le client affiche ces valeurs sans recalculer le classement.

### Conséquences

- Les scores sont calculés exclusivement côté serveur à partir de l'horodatage de réception.
- Le client ne calcule jamais le moindre point.
- Les scores sont mis à jour dans le snapshot uniquement à `REVEAL`, pour ne pas révéler la justesse d'une réponse avant la révélation.
- Les formules sont testées avec des cas exacts et des bornes.

### Alternatives rejetées

- Reprendre tel quel le score CONTEST du prototype (1000/200) pour tous les modes : déséquilibre CLASSIC et rend le bonus de série inutile.
- Score uniquement basé sur le temps : punit les joueurs qui lisent et favorise le clic au hasard.
- Vies rechargées en multi-joueurs : supprime l'élimination, qui est le cœur du mode room/TikTok.
- Vies non rechargées en solo : 3 erreurs sur 200 questions rendent la campagne irréaliste.

---

## ADR-006 — Le temps est serveur ; le client ne fait qu'afficher

### Contexte

Le prototype gère un `setInterval` local de 1 s et un timeout différent selon les modes. Le README v1 impose un timer serveur de 200 ms mais ne décrit ni la source de l'échéance ni la gestion de la pause.

### Décision

1. Le serveur stocke `phaseStartedAt`, `phaseEndsAt`, `pausedAt` et `remainingMsWhenPaused`.
2. Le client reçoit `phaseEndsAt` et `serverNow` dans chaque snapshot. Il estime l'offset d'horloge et affiche le compte à rebours localement.
3. Le serveur envoie `TIMER_SYNC` toutes les 5 s pendant `COUNTDOWN`, `QUESTION`, `ARTICLE` et `LEVEL_COMPLETE` pour corriger la dérive. Pas de sync en `REVEAL` (2,5 s) ni en `LOBBY`.
4. Le serveur résout la question à `now >= phaseEndsAt`, ou dès que tous les joueurs actifs connectés ont répondu s'il y en a au moins un.
5. Le client ne peut jamais provoquer un timeout ; il n'existe aucun événement `TIMEOUT` client.
6. Durées par défaut :
   - `Novice` : 25 s
   - `Adventurer` : 20 s
   - `Wizard` : 15 s
   - TikTok : 15 s par défaut, fixé à la création entre 10 et 30 s.
7. `REVEAL` : 2,5 s. `ARTICLE` : 30 s maximum en web, 8 s en TikTok. `LEVEL_COMPLETE` : 15 s maximum. `COUNTDOWN` : 3 s.
8. Pause : le host d'une room privée, le joueur solo et la console host TikTok peuvent mettre la room en pause. Le host d'une room publique n'a aucun contrôle. Le timer est gelé, les `ANSWER` et `CONTINUE` sont refusés pendant la pause, et le temps de pause est exclu du temps de réponse. Une pause web ou solo est automatiquement reprise après 120 s ; une pause TikTok n'a pas de limite.
9. Commandes host : le host privé peut démarrer, mettre en pause/reprendre, passer un `ARTICLE` ou un `LEVEL_COMPLETE`, et fermer la room. Il ne peut pas passer une `QUESTION`. Le control TikTok peut aussi passer une `QUESTION`. Le host public ne peut rien faire. Le joueur solo peut seulement mettre en pause/reprendre.
10. Le serveur ne diffuse pas un tick toutes les 200 ms. Cette décision remplace le README v1 : une échéance absolue + une synchronisation à 5 s suffisent et réduisent la charge de 20 à 100 fois.

### Conséquences

- Aucune horloge client n'est autoritaire.
- Une room peut être mise en pause sans perdre le temps restant.
- Les tests utilisent une horloge injectée et `tick(now)`.

### Alternatives rejetées

- Tick serveur à 200 ms : coût réseau inutile, toujours pas de garantie de précision côté client.
- Timer purement client : triviale à manipuler, incohérent entre joueurs.
- Pause automatique à chaque déconnexion joueur : casse le rythme d'un live TikTok et peut être abusée.

---

## ADR-007 — Questions : source statique, sélection sans remise, mélange des options

### Contexte

Les questions sont codées en dur dans `services/geminiService.ts`. Le README v1 demande un fichier `data/questions.json`, un provider, du tirage sans remise et un mode Gemini avec validation manuelle. La banque contient 257 entrées : 237 questions catégorisées, dont 236 sujets uniques, et 20 questions générales, dont 12 recoupent des sujets catégorisés ; 13 groupes de doublons au total, soit 244 sujets uniques. Les catégories contiennent 12 à 16 questions. Le pool est donc insuffisant pour un niveau SUBJECT de 20 questions, et la bonne réponse est en position B dans 155 cas sur 257.

### Décision

1. **Source canonique** : `data/questions.json`, versionné, relu et validé à chaque démarrage.
2. **Runtime** : SQLite est la source opérationnelle. Au démarrage, le serveur synchronise les questions approuvées du JSON vers la table `questions` (upsert par `id`). Si SQLite est indisponible, le serveur peut servir les questions depuis le JSON en mémoire et désactive la persistance.
3. **Pas de Gemini au runtime**. Gemini devient un outil de production de contenu hors ligne. Une question générée est écrite dans `questions_pending`, revue, puis approuvée et ajoutée au JSON/DB. Aucune question générée ne peut entrer dans une partie sans approbation humaine.
4. **Pas de filtre par difficulté au niveau de la question** : la difficulté est un preset de room (timer + multiplicateur). Voir ADR-008.
5. **Tirage sans remise par room** : `usedQuestionIds` est maintenu pour toute la partie.
6. **Sélection** :
   - CLASSIC : toutes catégories confondues.
   - SUBJECT : catégorie fixe.
   - CONTEST : toutes catégories confondues.
   - Exclure les `usedQuestionIds`, puis choisir uniformément avec le RNG injecté.
7. **Mélange des options** : à chaque tirage, les quatre options sont mélangées par Fisher-Yates avec le RNG de la room. L'index correct est remappé. Le JSON conserve l'ordre éditorial ; le client ne reçoit que l'ordre mélangé.
8. **Épuisement** : si le pool éligible est vide, le serveur recycle la plus ancienne question utilisée et loggue un avertissement. Ce cas ne doit pas arriver avec le pool CLASSIC validé, mais il ne doit jamais bloquer une partie.
9. **Contenu** :
   - CLASSIC exige au moins 200 questions approuvées uniques.
   - SUBJECT exige au moins 20 questions approuvées dans la catégorie. Tant que ce seuil n'est pas atteint, la catégorie est désactivée côté API/UI.
   - Le pool actuel ne satisfait pas SUBJECT pour la plupart des catégories. C'est une dette de contenu explicite, pas un bug d'implémentation.
10. Le champ `base64Image` est renommé `image.url`. Les images restent des URLs HTTPS ; aucune image n'est envoyée en base64 dans le protocole.
11. Les articles sont du **texte brut** (sauts de ligne autorisés, HTML interdit). Le rendu ne doit jamais utiliser `dangerouslySetInnerHTML`.

### Conséquences

- Le mode SUBJECT est partiellement indisponible jusqu'à l'extension du dataset. L'API renvoie `CATEGORY_INSUFFICIENT_QUESTIONS` et l'UI explique pourquoi.
- Le mélange des options supprime le biais de position B.
- Le JSON est la source de vérité éditoriale ; SQLite est la source d'exécution.
- Un script `data:validate` bloque la CI sur les erreurs structurelles et signale les seuils de couverture.

### Alternatives rejetées

- Garder les questions dans un service client : viole l'autorité serveur et expose les réponses.
- Générer des questions à la volée avec Gemini : latence, coût, qualité non contrôlée, validation impossible en live.
- Répéter les questions dans SUBJECT pour atteindre 20 : expérience dégradée et mémorisation.
- Réduire SUBJECT à 12 questions : changement produit silencieux et incohérent avec CLASSIC.
- Ne pas mélanger les options : les joueurs apprennent que B est souvent correcte.

---

## ADR-008 — La difficulté est un preset de règles, pas un tag de question

### Contexte

Le README v1 expose `Difficulty` dans le provider de questions, mais aucune question n'a de difficulté et le prototype ignore le paramètre. Tagger 244 questions et garantir 20 questions par catégorie et par difficulté est irréaliste.

### Décision

1. `Difficulty` (`Novice`, `Adventurer`, `Wizard`) décrit un **profil de room** : durée du timer, multiplicateur de score.
2. CLASSIC utilise une difficulté progressive : niveaux 1-3 Novice, 4-7 Adventurer, 8-10 Wizard.
3. SUBJECT utilise la difficulté choisie à la création de la room.
4. CONTEST utilise Adventurer, sans choix.
5. Le provider de questions ne reçoit pas de difficulté. Il reçoit la catégorie éventuelle et les exclusions.
6. Les questions peuvent un jour avoir un tag éditorial de difficulté, mais ce tag ne filtre pas le gameplay en v1.

### Conséquences

- Aucune dette de tagging ne bloque l'implémentation.
- La difficulté est immédiatement significative : moins de temps, plus de points.
- La documentation de contenu n'a pas besoin de garantir une distribution par difficulté.

### Alternatives rejetées

- Filtrer par difficulté : pools vides et expérience imprévisible.
- Supprimer `Difficulty` : perte du réglage de rythme et de score.

---

## ADR-009 — Identité, sessions et reconnexion

### Contexte

Le README v1 fait confiance au `playerId` envoyé par le client. N'importe qui peut usurper un joueur, rejoindre sa room ou reprendre sa partie. Le prototype n'a aucune notion de session.

### Décision

1. Le serveur génère les identifiants : `playerId = UUID v4`.
2. `POST /api/sessions` crée un joueur et un token de session opaque (`sess_` + 32 octets aléatoires en base64url).
3. Le token est stocké **haché** (SHA-256) dans `player_sessions`. Il n'est affiché qu'une fois.
4. Le client stocke le token dans `localStorage` sous `encycla.session.v1`.
5. Le token est envoyé dans `Authorization: Bearer` pour HTTP et dans `handshake.auth.token` pour Socket.io.
6. Durée de vie fixe : 30 jours, sans prolongation à l'usage. Nettoyage quotidien des sessions expirées.
7. Reconnexion en partie : 30 s de grâce. Le joueur retrouve son état complet (score, vies, réponses déjà verrouillées) via un snapshot.
8. Au-delà de 30 s : `LEFT` en lobby, `FORFEITED` en partie ; en partie, le joueur reste membre en lecture seule.
9. Plusieurs onglets avec le même token : le socket le plus récent remplace l'ancien ; l'ancien reçoit `SESSION_REPLACED` puis est déconnecté.
10. Le host est un joueur (`room.hostId`). S'il quitte le lobby ou se déconnecte plus de 30 s, le rôle est transféré au plus ancien joueur connecté. En partie, le host privé conserve pause, skip `ARTICLE`/`LEVEL_COMPLETE` et close ; en TikTok, ces commandes appartiennent au control ; en public, le host n'a aucun pouvoir. La partie continue sans transfert nécessaire.
11. Aucun mot de passe, aucun email. Le pseudo n'est pas unique ; les doublons dans une room sont affichés avec un suffixe court (`Pseudo (a1b2)`).

### Conséquences

- Un token vole est un problème, mais un `playerId` seul ne suffit plus.
- Le serveur doit pouvoir restaurer un joueur dans une room à la connexion.
- Les rooms restent en mémoire : un redémarrage serveur invalide la reprise de partie.

### Alternatives rejetées

- `playerId` fourni par le client : usurpation triviale.
- JWT signé sans révocation : impossible de déconnecter un token compromis simplement.
- Cookies HttpOnly : complique les clients OBS/overlay et les tests ; le token Bearer est plus simple et tout aussi sûr si le XSS est maîtrisé.

---

## ADR-010 — Matchmaking privé et public

### Contexte

Le README v1 mélange `JOIN` sans code de room, un seuil public de 4, un critère de sortie à 2 joueurs et un vote small-room sans quorum. Le prototype n'a pas de matchmaking.

### Décision

#### Room privée

1. `POST /api/rooms` authentifié, body `{ mode, category?, difficulty?, maxPlayers? }` ; `maxPlayers` vaut 8 par défaut.
2. Le créateur devient host et premier joueur.
3. Code de room : 6 caractères, alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sans I, O, 0, 1), généré avec `crypto.randomInt`, collision vérifiée.
4. Les autres joueurs rejoignent via l'événement socket `ROOM_JOIN { code }`.
5. Capacité : 2 à 8 joueurs en web. 1 joueur est autorisé uniquement en mode solo, pas via une room privée multi.
6. Démarrage : le host clique `GAME_START`. Tous les joueurs connectés doivent être prêts. Minimum 2 joueurs connectés.
7. Aucun joueur ne peut rejoindre après `COUNTDOWN`.

#### File publique

1. `POST /api/queue` authentifié, body `{ mode, category?, difficulty? }`.
2. Clé de file : `mode | difficulty | category` (catégorie seulement pour SUBJECT).
3. Cibles :
   - CONTEST : 2 joueurs, lancement immédiat à 2.
   - CLASSIC/SUBJECT : 4 joueurs.
4. Minimum : 2 joueurs.
5. Maximum : 8 joueurs web.
6. Si la file atteint la cible : prendre les `target` plus anciens, créer une room publique, auto-joindre leurs sockets, émettre `MATCH_FOUND`, puis `COUNTDOWN` de 3 s.
7. Si la file a entre 2 et `target - 1` joueurs après 120 s : émettre `SMALL_ROOM_PROPOSAL` à tous les membres.
8. Vote : 15 s. Majorité stricte des **électeurs présents à la création de la proposition** (`floor(n/2) + 1`). Non-réponse = refus. Les déconnexions ne réduisent pas le quorum.
9. Si le nombre d'acceptants est ≥ 2 : créer une room avec les acceptants. Les refusants restent en file ; leur timer repart à 120 s.
10. Si le nombre d'acceptants est < 2 : aucune room ; timer remis à 120 s.
11. Si la file atteint la cible pendant un vote : annuler la proposition et lancer la room normale.
12. Un joueur qui se déconnecte est retiré de la file. Une reconnexion ne rend pas sa place ; il doit rejoindre à nouveau.
13. La file est en mémoire, par instance. Le multi-instance est hors périmètre v1.

#### Room publique

1. `isPublic = true`.
2. Auto-start après `MATCH_FOUND` et connexion de tous les joueurs matchés.
3. Si un joueur ne se connecte pas ou se déconnecte avant la fin du `COUNTDOWN`, la room est annulée et les autres joueurs sont remis en file.
4. Le host est le plus ancien joueur ; il n'a aucun privilège de démarrage en public.

### Conséquences

- CONTEST est un duel immédiat ; les autres modes attendent 4 joueurs ou un vote small-room.
- Les règles sont déterministes et testables.
- Aucun matchmaking cross-instance en v1.

### Alternatives rejetées

- Seuil 4 pour CONTEST : impossible de jouer un duel à 4.
- Lancer immédiatement à 2 en CLASSIC : vide le concept de room publique à 4 et rend le vote inutile.
- Vote à la majorité des votants : un seul votant pourrait lancer une room à 2.
- Matchmaking Redis : complexité prématurée pour 100 viewers max (20 visés).

---

## ADR-011 — Protocole : snapshots versionnés, intentions explicites, erreurs typées

### Contexte

Le README v1 liste des événements incomplets, mélange les événements client et internes, et demande de dropper silencieusement les transitions illégales. Il n'existe aucun contrat de snapshot.

### Décision

1. Le serveur émet un **snapshot complet** `ROOM_STATE` à chaque changement de phase ou de composition de room. Les réponses individuelles produisent un événement léger `PLAYER_LOCKED`, pas un snapshot complet.
2. Chaque snapshot porte `stateVersion`, monotone par room. Le client ignore les versions inférieures ou égales.
3. Les événements client → serveur ont un ack typé `{ ok: true } | { ok: false, error }`.
4. Les événements serveur → client sont : `SESSION_READY`, `ROOM_STATE`, `PLAYER_LOCKED`, `TIMER_SYNC`, `MATCH_FOUND`, `SMALL_ROOM_PROPOSAL`, `QUEUE_STATE`, `CONTROL_READY`, `ROOM_CLOSED`, `SESSION_REPLACED`, `ERROR`.
5. `TIMEOUT` et `ROUND_END` ne sont **jamais** des événements client. Ils sont internes au moteur.
6. `ANSWER` contient `questionId`. Le serveur rejette une réponse si l'identifiant ne correspond pas à la question courante, si le joueur a déjà répondu, s'il est éliminé/déconnecté, ou si la phase n'est pas `QUESTION`.
7. `CONTINUE` contient le `phaseToken` de la phase concernée. Un token périmé est rejeté.
8. Les erreurs sont typées (`ROOM_FULL`, `INVALID_PHASE`, `ANSWER_TOO_LATE`, etc.) et incluent un `requestId`. Le serveur loggue l'événement et le refus.
9. Aucun snapshot ne contient de bonne réponse avant `REVEAL`.
10. Le protocole complet est dans [PROTOCOL.md](PROTOCOL.md).

### Conséquences

- Le client peut reconstruire son état à partir d'un seul snapshot après reconnexion.
- Les drops silencieux sont remplacés par des erreurs observables.
- La taille des snapshots est maîtrisée : l'article n'est inclus qu'à partir de `REVEAL`, jamais avant.

### Alternatives rejetées

- Delta d'états complexe : prématuré pour 8 joueurs web et 100 viewers TikTok, source de bugs de synchronisation.
- Événements granulaires sans snapshot : reconnexion impossible à fiabiliser.
- Drop silencieux : non observable et frustrant pour les clients légitimes.

---

## ADR-012 — Client React/Zustand, rôles et absence de logique de jeu

### Contexte

Le prototype concentre toute la logique dans un composant de 746 lignes et gère trois modes, deux claviers, un lobby local et un timer. Le README v1 demande un client purement présentationnel.

### Décision

1. Le client a trois rôles :
   - **player** : menu, lobby, jeu, article, résultats.
   - **overlay** : lecture seule pour OBS/TikTok, sans contrôles.
   - **control** : console host TikTok, avec pause/skip/réponse manuelle.
2. Zustand stocke uniquement : session, connexion, offset d'horloge, snapshot de room, question/révélation, file, erreurs, préférences UI (son, réduction des animations).
3. Les actions du store sont des intentions envoyées par Socket.io. Aucune action ne calcule un score, une vie, un gagnant ou un timeout ; le vainqueur et les rangs viennent de `winnerId` et `finalRanking`.
4. Les composants sont présentationnels. Le seul état local autorisé est l'UI transitoire : onglet sélectionné, confirmation de sortie, focus, option en attente d'ack.
5. `EncyclaGame.tsx` est remplacé par des composants de phase (`LobbyView`, `QuestionView`, `RevealView`, `ArticleView`, `LevelCompleteView`, `ResultsView`, `OverlayView`, `ControlView`).
6. Le store applique les snapshots versionnés et ignore les snapshots périmés.
7. Reconnexion : Socket.io se reconnecte automatiquement ; le serveur renvoie `SESSION_READY` puis le snapshot de room si le joueur est encore dans une room.
8. Le client affiche un bandeau `Reconnecting…` et un état `Room closed` si le serveur a redémarré.
9. Le client ne stocke jamais la bonne réponse avant `REVEAL` ; même en mémoire, elle n'est pas disponible.
10. Le mode local CONTEST est supprimé ; chaque client contrôle un seul joueur.

### Conséquences

- Les composants deviennent testables en isolation avec des snapshots fixtures.
- Le store est la seule frontière entre transport et UI.
- Une panne réseau ne corrompt pas l'état local.

### Alternatives rejetées

- Context React + reducers : possible, mais Zustand est déjà imposé par le README et plus simple hors arbre.
- Conserver la logique dans les composants : impossible à tester et à sécuriser.
- Deux joueurs sur un clavier : contraire au modèle un socket = un joueur.

---

## ADR-013 — Persistance SQLite et leaderboard

### Contexte

Le README v1 fournit un schéma incomplet : pas de sessions, pas de cycle de vie des matchs, pas de règle d'agrégation du leaderboard, et une écriture par round sans clé d'unicité. Le prototype ne persiste rien.

### Décision

1. SQLite via `better-sqlite3`, fichier `data/encycla.db`, mode WAL, `foreign_keys=ON`, `busy_timeout=5000`.
2. Migrations versionnées dans `server/db/migrations/`, appliquées au démarrage dans une transaction.
3. Tables : `schema_migrations`, `players`, `player_sessions`, `matches`, `scores`, `questions`, `questions_pending`.
4. `scores` a une clé primaire composite `(match_id, player_id)`. Les scores sont mis à jour à chaque `REVEAL` par upsert, puis le classement final est calculé à `MATCH_OVER` et exposé dans le snapshot (`finalRanking`, `winnerId`) ; `rank` et `finalRanking` ne sont pas stockés en base, seul `winning_player_id` l'est.
5. Un `match` est créé au début du `COUNTDOWN`, passé à `completed` à `MATCH_OVER`, ou `abandoned` en cas de crash/fermeture.
6. Au démarrage, tout match `in_progress` est marqué `abandoned` : les rooms en mémoire ne survivent pas à un redémarrage.
7. Leaderboard :
   - Agrégation par joueur sur les matchs `completed` avec `player_count >= 2` (les parties solo ne polluent pas le classement).
   - Seuls les scores `completed` et `eliminated` sont inclus ; les scores `forfeited` et `abandoned` sont exclus.
   - Filtres optionnels `mode` et `source` (`web`, `tiktok`).
   - Tri : somme des points décroissante, meilleur match décroissant, bonnes réponses décroissantes, date du premier match croissante, puis `player_id` pour un ordre déterministe.
   - Top 50 par défaut, maximum 100.
8. SQLite indisponible/corrompu : le serveur démarre, désactive la persistance, expose `db: "disabled"` sur `/api/health`, et renvoie `PERSISTENCE_DISABLED` sur le leaderboard. Le jeu continue.
9. Aucune donnée personnelle sensible : pas d'email, pas de mot de passe. Les IP ne sont pas stockées en base.
10. Le schéma complet est dans [DATA-MODEL.md](DATA-MODEL.md).

### Conséquences

- Une seule instance serveur en v1. Le scaling horizontal nécessiterait Redis et une base partagée ; hors périmètre.
- Les parties en cours sont perdues au redémarrage ; les joueurs reviennent au menu.
- Le leaderboard est simple, requêtable et testable.

### Alternatives rejetées

- Postgres : surdimensionné pour une instance et un volume de 100 viewers max (20 visés).
- Écriture uniquement en fin de match : perte de toutes les données en cas de crash.
- Inclure le solo dans le leaderboard : farming trivial.
- Stocker les rooms en base : complexité sans bénéfice en v1.

---

## ADR-014 — Adaptateur TikTok

### Contexte

Le README v1 mentionne `tiktok-live-connector`, un mapping `uniqueId → playerId` et un fallback manuel, sans définir le cycle de vie, le parsing, la déduplication ou la capacité.

### Décision

1. Dépendance optionnelle `tiktok-live-connector`, activée par `TIKTOK_ENABLED=true`.
2. Une room TikTok est créée par l'opérateur via `POST /api/tiktok/rooms` avec `ADMIN_TOKEN`. Elle n'est pas publique et n'entre pas dans le matchmaking.
3. Le host est spectateur, pas joueur.
4. Le serveur se connecte au live de `TIKTOK_USERNAME` au démarrage de la room et se déconnecte à la fin.
5. Un viewer rejoint la partie **au premier commentaire valide A/B/C/D pendant une phase `QUESTION`**. Son identité est `(provider='tiktok', external_id=uniqueId)`, avec un `playerId` stable en base.
6. Parsing strict :
   - Normaliser Unicode NFKC, trim, supprimer les mentions `@...` en tête, la ponctuation et les emojis.
   - Accepter uniquement si le résultat normalisé est exactement `a`, `b`, `c` ou `d`.
   - Ignorer les messages plus longs, les liens et les commandes.
7. Une seule réponse par viewer et par question : la première réponse valide gagne. Les suivantes sont ignorées.
8. Capacité : 100 viewers rejoints par défaut, éliminés inclus. La room peut démarrer avec 0 viewer. Au-delà de 100, les nouveaux viewers sont ignorés.
9. Une room TikTok ne se termine pas sur `< 2` actifs ou une élimination collective : elle continue jusqu'à la fin naturelle ou `HOST_CLOSE`, et de nouveaux viewers peuvent rejoindre à chaque `QUESTION`.
10. Reconnexion du connecteur : backoff exponentiel 1 s → 30 s. En cas de déconnexion, la room est mise en pause au prochain point sûr ; l'overlay affiche l'état. Le host peut reprendre puis continuer en mode manuel.
11. Fallback manuel : la console host permet de sélectionner un joueur et d'envoyer A/B/C/D via `HOST_MANUAL_ANSWER`.
12. Le connecteur est non officiel : aucune promesse de stabilité, aucune donnée de connexion logguée. L'opérateur doit tester sur un compte secondaire avant un live.
13. Aucune réponse TikTok ne transite par un socket viewer : l'adaptateur injecte directement l'événement moteur côté serveur, jamais depuis un client.

### Conséquences

- Le code moteur ne dépend pas de TikTok ; l'adaptateur est remplaçable.
- Les viewers n'ont pas de session web ; leur `socketId` est `null`.
- Un live peut continuer en mode dégradé si le connecteur tombe.

### Alternatives rejetées

- Créer un socket par viewer : impossible à l'échelle et inutile.
- Accepter n'importe quel commentaire contenant A/B/C/D : bruit massif et triche.
- Faire du host un joueur : il ne peut pas surveiller le chat et le jeu correctement.
- Dépendre de l'API officielle TikTok : indisponible pour ce cas d'usage.

---

## ADR-015 — Overlay et console host

### Contexte

`?mode=overlay` du README v1 ne définit ni l'authentification, ni les données affichées, ni la console de secours.

### Décision

1. `GET /?mode=overlay&room=CODE#token=OVERLAY_TOKEN` affiche une vue lecture seule.
2. `GET /?mode=control&room=CODE#token=CONTROL_TOKEN` affiche la console host.
   Le token est placé dans le fragment pour ne jamais apparaître dans les logs HTTP. Il est lu par le client puis envoyé dans `handshake.auth.token`.
3. Les tokens sont générés à la création de la room TikTok, stockés hachés en mémoire, scoped à la room, et jamais loggués. Ils n'ont pas d'expiration propre : ils restent valides jusqu'à la fermeture de la room et sont révoqués à ce moment.
4. L'overlay reçoit les mêmes snapshots publics que les joueurs, sans données de session.
5. L'overlay affiche :
   - idle : code de room, consigne « Comment A, B, C or D to join », top 5.
   - question : image, question, options A-D, timer, top 10.
   - reveal : bonne réponse, explication courte, top 10.
   - article : titre, image, extrait de 3 lignes, 8 s.
   - fin : top 10 final.
6. L'overlay ne joue aucun son par défaut, pour éviter le double audio avec le host. Un réglage local permet de l'activer.
7. La console host permet : start, pause, resume, skip, réponse manuelle, fermeture de room. Elle ne révèle jamais la bonne réponse avant la phase `REVEAL`.
8. Les liens overlay/control sont copiables depuis la console. L'overlay peut être placé dans OBS en Browser Source.
9. Les tokens overlay/control sont révoqués à la fermeture de la room.

### Conséquences

- L'overlay est isolé du client joueur et ne peut pas agir.
- La console host est l'outil de secours du live.
- Une fuite d'un token overlay permet seulement de regarder la room ; une fuite du token control permet de la piloter. Le token control ne doit jamais être affiché à l'antenne.

### Alternatives rejetées

- Overlay sans token : n'importe qui pourrait observer une room privée.
- Overlay qui agit : risque de clic accidentel en direct.
- Contrôles dans l'overlay : mauvaise ergonomie OBS.

---

## ADR-016 — Sécurité

### Contexte

Le prototype expose la clé Gemini dans le bundle client, rend `articleBody` via `dangerouslySetInnerHTML`, accepte un `playerId` client et n'a aucune limitation de débit.

### Décision

1. Aucun secret dans le client. `GEMINI_API_KEY` n'est pas nécessaire en v1 ; s'il est réintroduit, il reste côté serveur.
2. Toute entrée est validée avec Zod : HTTP body/query, événements socket, contenu des questions, variables d'environnement.
3. Les réponses correctes ne quittent jamais le serveur avant `REVEAL`.
4. `articleBody` est du texte brut rendu par React. Interdiction de `dangerouslySetInnerHTML`.
5. CSP stricte, `helmet`, CORS restreint à `PUBLIC_ORIGIN` en production, corps HTTP limité à 16 Ko.
6. Rate limiting : 100 requêtes HTTP/min/IP, 10 événements socket/s par socket, 10 créations de session/min/IP, 10 tentatives de join/min/IP. Bucket mémoire en v1.
7. Les codes de room ne sont pas une authentification. Les rooms privées restent accessibles par code, avec rate limit sur les tentatives.
8. Les tokens de session et les tokens overlay/control sont hachés au repos et jamais loggués.
9. Les pseudos sont normalisés, limités à 24 graphèmes, sans caractères de contrôle ni chevrons ; React échappe le rendu.
10. TikTok : parsing strict, première réponse uniquement, pas de liens cliquables, pas de HTML.
11. Les images sont chargées depuis une allowlist HTTPS (Wikimedia en v1) ; le self-hosting d'images est hors périmètre v1. Toute nouvelle source doit être ajoutée à la CSP.
12. Les dépendances sont auditées en CI (`pnpm audit --prod`) et les versions verrouillées par `pnpm-lock.yaml`.

Le détail et le modèle de menace sont dans [SECURITY.md](SECURITY.md).

### Conséquences

- Le XSS est maîtrisé par construction, pas par filtrage a posteriori.
- Une fuite de token de session est le principal risque résiduel.
- Le rate limiting mémoire ne survit pas à un redémarrage et ne fonctionne pas en multi-instance.

### Alternatives rejetées

- Sanitizer HTML côté client : surface d'attaque inutile pour du texte brut.
- Confiance au client pour le `playerId` : usurpation.
- CORS ouvert en production : violation directe du README v1.

---

## ADR-017 — Accessibilité et sons

### Contexte

Le prototype utilise la couleur comme unique indicateur de justesse, n'a pas d'`aria-live`, et n'a aucun son. L'ADR v1 exige AA, `aria-label`, navigation clavier et VoiceOver.

### Décision

1. Cible WCAG 2.1 AA.
2. Palette à contraste vérifié : texte principal `#f8fafc` sur `#0f172a`, texte secondaire `#cbd5e1`, accents `#60a5fa`, `#34d399`, `#fb7185`, `#fbbf24`. Interdiction de `slate-500` pour le texte < 18 px.
3. Chaque option est un bouton avec `aria-label="Option A: ..."`.
4. La justesse est indiquée par la couleur **et** un texte/icône (`Correct`, `Incorrect`, `Time's up`).
5. `aria-live="polite"` pour les changements de phase et les résultats ; le timer n'est pas annoncé chaque seconde, seulement à 10 s, 5 s et 0.
6. Navigation clavier complète : Tab, Entrée/Espace, Échap pour la confirmation de sortie. Raccourcis de réponse : `1-4` et `A-D` via `KeyboardEvent.code` (compatible AZERTY).
7. Cibles tactiles ≥ 44 px. Responsive mobile : 4 boutons A-D en bas.
8. `prefers-reduced-motion` désactive shake, pulsations et animations non essentielles.
9. Sons : `correct.mp3`, `wrong.mp3`, `lobby-join.mp3`, `countdown-tick.mp3`, `level-up.mp3`. Préchargement après la première interaction utilisateur. Bouton mute persistant.
10. En overlay, sons coupés par défaut.
11. Tests : axe-core dans les tests de composants + checklist manuelle NVDA/VoiceOver avant release.

### Conséquences

- Les composants doivent exposer des rôles et des libellés, pas seulement des classes Tailwind.
- Les animations ne doivent jamais être le seul signal.
- Les fichiers audio doivent être fournis et licenciés.

### Alternatives rejetées

- Accessibilité après coup : coût de refonte élevé.
- Son uniquement : exclut les joueurs sourds et les environnements silencieux.
- Timer annoncé chaque seconde : fatigue auditive.

---

## ADR-018 — Tests, outillage, déploiement et limites

### Contexte

Le README v1 exige 80 % de couverture, Docker, CI et un live d'une heure avec 20 viewers. Le prototype n'a ni test, ni lint, ni build serveur ; le lockfile a depuis été restauré.

### Décision

1. **Stack** : Node.js 22, pnpm, TypeScript strict, React 19, Vite 6, Express 5, Socket.io 4, better-sqlite3, Zustand, Zod, Vitest.
2. **Scripts** : `dev`, `dev:client`, `dev:server`, `build`, `build:client`, `build:server`, `start`, `test`, `test:watch`, `test:coverage`, `test:integration`, `test:e2e`, `test:load`, `lint`, `format`, `typecheck`, `data:validate`, `data:import`, `data:extract`, `content:generate`, `db:migrate`.
3. **Ports** : serveur 3000, Vite 5173 avec proxy. En production, un seul port 3000.
4. **Tests** : Vitest, couverture minimale 80 % sur `server/`, 95 % de branches sur le moteur, 70 % sur `client/`. Tests d'intégration HTTP/socket, tests de reconnexion, de matchmaking, de persistance et du parser TikTok.
5. **CI GitHub Actions** : `pnpm install --frozen-lockfile`, lint, typecheck, data:validate, tests unitaires et d'intégration avec couverture, build, E2E Chromium, Gitleaks et audit. Sur chaque PR et push sur `main`.
6. **Docker multi-stage** : build client + serveur, runtime Node slim non-root, volume `/app/data`, healthcheck `/api/health`.
7. **Limites v1** :
   - une seule instance serveur ;
   - rooms en mémoire ;
   - pas de scaling horizontal ;
   - pas de mode hors-ligne ;
   - pas de génération Gemini en direct ;
   - pas de modération de contenu TikTok ;
   - pas de comptes email/mot de passe.
8. **Critères de sortie** : partie complète à 2 joueurs en privé et en public, overlay TikTok fonctionnel, live d'une heure avec 20 viewers sans crash, latence chat → serveur p95 < 500 ms, leaderboard persistant après redémarrage.

Le détail est dans [TESTING.md](TESTING.md), [DEPLOYMENT.md](DEPLOYMENT.md) et [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md).

### Conséquences

- Le déploiement est reproductible.
- Le mode multi-instance est explicitement hors périmètre ; il faudra un nouvel ADR pour le supporter.
- Les tests sont une condition de merge, pas une option.

### Alternatives rejetées

- Ajouter Redis et un load balancer en v1 : complexité prématurée.
- Playwright sur Firefox/WebKit dès la v1 : Chromium suffit pour les parcours critiques ; le cross-browser est nocturne.
- Génération de questions en direct : qualité et sécurité insuffisantes.
