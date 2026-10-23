# Encycla — Spécification fonctionnelle et règles de jeu

- Version : 1.0
- Date : 2026-10-22
- Statut : référence d'implémentation
- Décisions d'architecture : [ADR.md](ADR.md)
- Contrat réseau : [PROTOCOL.md](PROTOCOL.md)
- Modèle de données : [DATA-MODEL.md](DATA-MODEL.md)

## 1. Objet du produit

Encycla est un jeu de quiz visuel en temps réel, inspiré des encyclopédies multimédias des années 90. Le joueur identifie un sujet à partir d'une image et de quatre propositions, puis lit une fiche encyclopédique. Le jeu est jouable en solo, en rooms privées/publiques sur le web, et en direct sur TikTok où les viewers répondent dans le chat.

Le produit doit être :

- **autoritaire** : le serveur décide de tout ;
- **équitable** : aucun joueur ne reçoit la réponse avant la révélation ;
- **reprenable** : une coupure réseau courte ne détruit pas la partie ;
- **lisible** : l'état de la room est explicite à tout moment ;
- **testable** : chaque règle est déterministe et couverte par des tests.

## 2. Glossaire

| Terme | Définition |
| --- | --- |
| Room | Session de jeu identifiée par un code, contenant des joueurs et un état de partie. |
| Host | Joueur créateur d'une room privée, ou opérateur d'une room TikTok. |
| Player | Joueur web authentifié par session. |
| Viewer | Utilisateur TikTok identifié par son `uniqueId`, devenant player au premier vote valide. |
| Overlay | Vue lecture seule destinée à OBS. |
| Control | Console host TikTok permettant pause/skip/réponse manuelle. |
| Question résolue | Question dont tous les joueurs actifs connectés ont répondu (s'il y en a), ou dont le timer a expiré. |
| Level | Bloc de 20 questions (CLASSIC/SUBJECT) ou de 10 questions (CONTEST, traité comme un unique level). |
| Round | Synonyme de question en CONTEST dans l'UI ; le moteur utilise le même compteur. |
| Reveal | Phase où la bonne réponse, l'explication et l'article sont envoyés. |
| Article | Fiche encyclopédique affichée après chaque question. |
| Small room | Room publique lancée avec 2 ou 3 joueurs après vote. |
| Snapshot | État complet public d'une room, versionné. |
| Phase token | Identifiant aléatoire d'une phase, utilisé pour rejeter les `CONTINUE` périmés. |

## 3. Acteurs et rôles

### 3.1 Player web

- Obtient une session via `POST /api/sessions`.
- Crée une room privée, rejoint par code, ou entre en file publique.
- Reçoit les snapshots et envoie des intentions.
- Peut se reconnecter pendant 30 s.
- Ne voit jamais la bonne réponse avant `REVEAL`.

### 3.2 Host web

- Est le créateur de la room privée.
- Peut lancer la partie quand tous les joueurs connectés sont prêts.
- Peut transférer implicitement son rôle en quittant le lobby.
- N'a aucun privilège de triche : il ne voit pas la réponse avant les autres.

### 3.3 Host TikTok

- Crée une room TikTok via une route administrateur.
- Est spectateur, pas joueur.
- Contrôle start, pause, resume, skip et réponses manuelles depuis la console.
- Peut couper la room.

### 3.4 Viewer TikTok

- Ne possède pas de session web.
- Devient joueur au premier commentaire valide A/B/C/D pendant une question.
- Possède les mêmes vies, score et règles qu'un joueur web.
- Ne peut pas se reconnecter : son identité est son `uniqueId`.

### 3.5 Overlay

- Lecture seule.
- Reçoit les snapshots publics.
- Ne peut envoyer aucune intention de jeu.
- Ne joue pas de son par défaut.

### 3.6 Control

- Reçoit les snapshots publics.
- Peut envoyer les événements host.
- Doit être protégé par un token dédié.

### 3.7 Admin

- Crée les rooms TikTok.
- Approuve/rejette les questions générées.
- Peut fermer une room bloquée.
- Authentification par `ADMIN_TOKEN`, jamais exposé au client joueur.

## 4. Modes de jeu

### 4.1 Table de configuration

| Paramètre | CLASSIC | SUBJECT | CONTEST |
| --- | --- | --- | --- |
| Levels | 10 | 1 | 1 |
| Questions par level | 20 | 20 | 10 |
| Joueurs | 1 à 8 web ; 0 au départ, jusqu'à 100 TikTok | 1 à 8 web ; 0 au départ, jusqu'à 100 TikTok | exactement 2 |
| Catégories | toutes, mélangées | catégorie fixe | toutes, mélangées |
| Vies | 3 | 3 | aucune |
| Politique de vies solo | recharge à chaque level | recharge (sans effet) | n/a |
| Politique de vies room/TikTok | persistante | persistante | n/a |
| Difficulté | progressive : 1-3 Novice, 4-7 Adventurer, 8-10 Wizard | fixe, choisie | Adventurer fixe |
| Timer | 25 / 20 / 15 s selon le level en web ; 15 s par défaut sur TikTok | 25 / 20 / 15 s selon la difficulté en web ; 15 s par défaut sur TikTok | 20 s |
| Score | formule CLASSIC | formule CLASSIC | formule CONTEST |
| Article | après chaque question | après chaque question | après chaque question |
| Fin | 10 levels ; en web ≤ 1 actif | 1 level ; en web ≤ 1 actif | 10 questions ou ≤ 1 actif |

### 4.2 Solo

- Une room solo est créée par `POST /api/solo` et démarre immédiatement.
- `playerCount = 1`, `isSolo = true`.
- Aucun code de room n'est nécessaire ; la room n'est pas rejoignable.
- En CLASSIC et SUBJECT, les vies sont rechargées à chaque `LEVEL_COMPLETE`.
- Une élimination solo termine la partie.
- Le score est enregistré mais exclu du leaderboard public.

### 4.3 Room privée

- Créée par un host avec un code à 6 caractères.
- 2 à 8 joueurs web.
- Démarrage manuel par le host, tous les joueurs connectés prêts.
- Aucun join après `COUNTDOWN`.

### 4.4 Room publique

- Créée par le matchmaking.
- CLASSIC/SUBJECT : cible 4, minimum 2 après small-room.
- CONTEST : cible 2, lancement immédiat.
- Auto-start après `MATCH_FOUND` et connexion de tous les joueurs.
- Host = plus ancien joueur, purement informatif : aucun contrôle de pause, skip ou fermeture.
- Une room publique n'est jamais rejoignable par code ; elle est remplie uniquement par le matchmaking.

### 4.5 Room TikTok

- Créée par l'admin pour un `TIKTOK_USERNAME`.
- CLASSIC ou SUBJECT.
- Le host est spectateur.
- Les viewers rejoignent au premier vote valide.
- Article auto-avancé après 8 s.
- Timer de 15 s par défaut, fixé à la création entre 10 et 30 s.
- Démarrage possible avec 0 viewer ; les viewers rejoignent au fil des questions.
- Pas de fin anticipée sur `< 2` actifs ou élimination collective : fin naturelle ou `HOST_CLOSE`.
- Maximum 100 viewers rejoints, éliminés inclus.
- Pas de matchmaking public.

## 5. Cycle de vie d'une room

### 5.1 Phases

| Phase | Rôle | Réponses acceptées | Fin |
| --- | --- | --- | --- |
| `LOBBY` | Attente, prêts, code | Non | Start valide |
| `COUNTDOWN` | Décompte 3 s | Non | Fin du décompte |
| `QUESTION` | Question active | Oui | Tous les actifs connectés ont répondu (s'il y en a) ou timer |
| `REVEAL` | Bonne réponse, résultats | Non | 2,5 s |
| `ARTICLE` | Fiche encyclopédique | Non | Tous les actifs connectés `CONTINUE` (s'il y en a) ou 30 s en web, 8 s en TikTok |
| `LEVEL_COMPLETE` | Bilan de niveau | Non | Tous les actifs connectés `CONTINUE` (s'il y en a) ou 15 s |
| `MATCH_OVER` | Classement final | Non | TTL de room |
| `PAUSED` | Pause host | Non | `HOST_RESUME` ou auto-reprise 120 s (web/solo) |
| `CLOSED` | Room terminée/abandonnée | Non | Nettoyage |

`PAUSED` mémorise `pausedFrom`, `remainingMs` et `pausedAt`. Le scheduler ne fait pas avancer le timer pendant la pause.

Une **fin naturelle** (dernière question du dernier niveau) affiche l'article final puis `MATCH_OVER`. Une **fin anticipée web/solo** (élimination solo, moins de 2 actifs, tous éliminés sur la même question) passe directement de `REVEAL` à `MATCH_OVER`. Une room TikTok ne s'arrête jamais de façon anticipée : elle va jusqu'à la fin naturelle ou `HOST_CLOSE`. Si la dernière question coïncide avec une fin anticipée web, la fin naturelle est prioritaire et l'article final est affiché.

### 5.2 Statuts de joueur

| Statut | Signification |
| --- | --- |
| `CONNECTED` | Présent, actif et connecté. |
| `DISCONNECTED` | Socket perdu, fenêtre de reconnexion de 30 s ; reste actif pour la poursuite du match, mais ne peut ni répondre ni envoyer `CONTINUE`. |
| `ELIMINATED` | Plus de vie, spectateur ; non actif. |
| `FORFEITED` | Forfait volontaire (retiré) ou expiration de reconnexion (reste membre en lecture seule) : score conservé, non actif. |
| `LEFT` | A quitté la room (lobby) ; non actif. |

Un joueur **actif** est `CONNECTED` ou `DISCONNECTED` (dans sa fenêtre de 30 s) ; un joueur **connecté actif** est `CONNECTED`. Les conditions de fin de room comptent les actifs ; les actions `ANSWER` et `CONTINUE` exigent `CONNECTED`. Un joueur `ELIMINATED` ne bloque ni la résolution ni le `CONTINUE`. Un joueur `DISCONNECTED` ne les bloque pas non plus ; s'il ne revient pas avant la résolution, il est traité comme timeout.

### 5.3 Table de transitions

| Depuis | Déclencheur | Garde | Vers | Effets |
| --- | --- | --- | --- | --- |
| LOBBY | `GAME_START` | web privé : host, ≥ 2 connectés, tous prêts ; TikTok : control, 0+ viewers | COUNTDOWN | Créer le match, précharger la question |
| LOBBY | `HOST_CLOSE` | host privé/control | CLOSED | Fermer sans match |
| COUNTDOWN | fin 3 s | question préchargée | QUESTION | Armer le timer, incrémenter la séquence |
| COUNTDOWN | joueur requis quitte ou n'est pas connecté | web/solo : actifs < 2 ; public : tout joueur requis non connecté ou parti | CLOSED | Annuler le match ; si la ligne `matches` existe déjà, la passer `abandoned` avec ses scores non finalisés ; remettre les autres joueurs publics en file |
| QUESTION | tous les actifs connectés ont répondu | ≥ 1 actif connecté | REVEAL | Calculer scores/vies, persister, émettre le snapshot |
| QUESTION | timer expiré | — | REVEAL | Timeouts, calculs, persister |
| QUESTION | `HOST_SKIP` | control TikTok uniquement | REVEAL | Traiter les non-réponses comme timeouts |
| QUESTION | plus aucun actif | web/solo uniquement | REVEAL puis MATCH_OVER | Résoudre puis classer |
| REVEAL | fin 2,5 s | hors fin anticipée | ARTICLE | Envoyer l'article |
| REVEAL | fin 2,5 s | fin anticipée | MATCH_OVER | Classer et persister |
| ARTICLE | tous les actifs connectés `CONTINUE` | ≥ 1 actif connecté | QUESTION, LEVEL_COMPLETE ou MATCH_OVER | Question suivante, bilan ou fin |
| ARTICLE | timeout (30 s web / 8 s TikTok) | — | QUESTION, LEVEL_COMPLETE ou MATCH_OVER | Avancer |
| ARTICLE | `HOST_SKIP` | host privé/control | QUESTION, LEVEL_COMPLETE ou MATCH_OVER | Avancer |
| LEVEL_COMPLETE | tous les actifs connectés `CONTINUE` | ≥ 1 actif connecté | QUESTION ou MATCH_OVER | Niveau suivant ou fin |
| LEVEL_COMPLETE | timeout 15 s | — | QUESTION ou MATCH_OVER | Avancer |
| LEVEL_COMPLETE | `HOST_SKIP` | host privé/control | QUESTION ou MATCH_OVER | Avancer |
| QUESTION/REVEAL/ARTICLE/LEVEL_COMPLETE | `HOST_PAUSE` | host privé/solo/control | PAUSED | Mémoriser phase et temps restant |
| PAUSED | `HOST_RESUME` | host privé/solo/control | resumePhase | Recalculer l'échéance |
| PAUSED | 120 s de pause | web/solo uniquement | resumePhase | Reprise automatique |
| Toute phase non terminale | `HOST_CLOSE` | host privé/control | CLOSED | Abandonner le match |
| Toute phase non terminale | aucun socket connecté depuis 10 min | — | CLOSED | Abandonner le match |
| MATCH_OVER | TTL 10 min | — | CLOSED | Libérer la room |

En web, si la sortie d'`ARTICLE` ou de `LEVEL_COMPLETE` laisse moins de 2 actifs, la cible est `MATCH_OVER` au lieu d'une question ou d'un bilan supplémentaire.

### 5.4 Règles de fin de match

Le match se termine dans les cas suivants :

1. Le dernier level est terminé.
2. SUBJECT : l'unique level est terminé.
3. CONTEST : les 10 questions sont résolues.
4. Solo : le joueur est éliminé, quitte ou expire.
5. Room web multi : il reste moins de 2 joueurs actifs.
6. Room web : tous les joueurs sont éliminés lors de la même question.
7. Le host ferme la room (`HOST_CLOSE`) : match abandonné, non classé.

Un match terminé naturellement ou par élimination est `completed` s'il reste au moins un joueur non-forfait classable ; sinon il est `abandoned`. Une fermeture host reste toujours `abandoned`.

Une room TikTok ne se termine pas sur `< 2` actifs ni sur une élimination collective : elle continue jusqu'à la fin naturelle ou `HOST_CLOSE`, et de nouveaux viewers peuvent rejoindre à chaque `QUESTION`. Si elle atteint la fin naturelle avec `player_count=0`, le match est `abandoned`.

Le classement final applique l'ordre de l'ADR-005. Le serveur l'expose à `MATCH_OVER` dans `PublicRoomState.finalRanking` ; `winnerId` vaut l'unique joueur de rang 1, ou `null` en cas d'égalité parfaite au premier rang ou de match abandonné. Le client ne recalcule ni le rang ni le vainqueur.

## 6. Déroulement d'une question

### 6.1 Séquence

1. Le serveur précharge la question pendant `COUNTDOWN`, `ARTICLE` ou `LEVEL_COMPLETE`.
2. À l'entrée en `QUESTION` :
   - `questionsResolvedThisLevel` reste inchangé jusqu'à la résolution ;
   - `questionStartedAt = now` ;
   - `phaseEndsAt = now + timerMs` ;
   - un `phaseToken` est généré ;
   - les options sont mélangées si ce n'est pas déjà fait ;
   - le snapshot est diffusé avec `QuestionView` (sans réponse).
3. Les joueurs envoient `ANSWER { questionId, choiceIndex }`.
4. Le serveur accepte la première réponse valide par joueur et par question.
5. S'il y a au moins un actif connecté et que tous les actifs connectés ont répondu, ou à `phaseEndsAt`, la question est résolue. Une room TikTok avec 0 viewer attend donc le timer ; les déconnectés ne bloquent pas et sont résolus en timeout.
6. À `REVEAL`, le serveur diffuse le snapshot avec :
   - `subject`, `questionText`, `options` et l'image (le snapshot `reveal` est autoportant) ;
   - `correctIndex` (index mélangé) ;
   - les résultats par joueur : choix, correct, temps, points ;
   - les scores, vies, séries et statuts mis à jour ;
   - `explanation`, `articleTitle`, `articleBody`.
7. Après 2,5 s, `ARTICLE` (ou `MATCH_OVER` si fin anticipée web/solo).
8. En web, après `CONTINUE` de tous les actifs connectés (s'il y en a) ou timeout 30 s ; en TikTok, après 8 s automatiques. Puis question suivante, `LEVEL_COMPLETE` ou `MATCH_OVER`.

### 6.2 Règles de réponse

- `choiceIndex` doit être un entier `0..3`.
- `questionId` doit correspondre à la question courante.
- Un joueur ne peut répondre qu'une fois par question.
- Un joueur `ELIMINATED`, `FORFEITED`, `LEFT` ou `DISCONNECTED` ne peut pas répondre.
- Une réponse reçue après `phaseEndsAt` est rejetée avec `ANSWER_TOO_LATE`.
- Une réponse reçue pendant `REVEAL` ou `ARTICLE` est rejetée avec `INVALID_PHASE`.
- L'ack d'une réponse acceptée ne contient jamais la justesse.
- Le temps de réponse est calculé côté serveur, jamais fourni par le client.

### 6.3 Résolution

Pour chaque joueur non éliminé et non forfait au début de la question, y compris les déconnectés :

```text
choice = réponse ou null
correct = choice !== null && choice === correctIndex
timeout = choice === null
responseTimeMs = correct || choice !== null ? clamp(receivedAt - questionStartedAt - pausedMs, 0, timerMs) : null
```

- Correct : points selon la formule, série +1.
- Faux : 0 point, série = 0, vies -1, `wrongCount +1`.
- Timeout : 0 point, série = 0, vies -1, `timeoutCount +1`.
- `wrongCount` ne compte que les réponses fausses ; les timeouts sont comptés séparément dans `timeoutCount`.
- `totalResponseMs` ajoute `responseTimeMs` pour une réponse fournie, et `timerMs` pour un timeout.
- Un joueur `DISCONNECTED` non revenu à la résolution est traité comme timeout s'il n'est pas forfait avant.
- Si `lives == 0` : `ELIMINATED`.
- Les scores ne sont visibles qu'à partir du snapshot `REVEAL`.

### 6.4 Mélange des options

À chaque tirage :

1. Copier `options`.
2. Fisher-Yates avec le RNG de la room.
3. Calculer `shuffledCorrectIndex`.
4. Stocker `optionOrder` dans l'instance de question de la room.
5. Ne jamais réutiliser l'ordre d'une autre room.

Le JSON garde l'ordre éditorial. Le client ne voit que l'ordre mélangé.

## 7. Score et classement

### 7.1 Formule CLASSIC et SUBJECT

```text
difficulty = CLASSIC ? difficulté du level (1-3 Novice, 4-7 Adventurer, 8-10 Wizard) : difficulté choisie en SUBJECT
difficultyMultiplier = { Novice: 1.0, Adventurer: 1.25, Wizard: 1.5 }[difficulty]
levelMultiplier = level (1..10)
basePoints = round(100 * difficultyMultiplier * levelMultiplier)
speedBonus = correct ? max(0, round(50 * (1 - max(0, responseTimeMs - 3000) / 10000))) : 0
streakBonus = correct ? min(streakBefore, 10) * 20 : 0
points = correct ? basePoints + speedBonus + streakBonus : 0
```

Propriétés :

- À 0-3 000 ms : bonus de vitesse 50.
- À 3 001 ms : 49,995 arrondi à 50.
- À 8 000 ms : bonus 25.
- À 13 000 ms et plus : bonus 0.
- Série 0 : bonus 0 ; série 10+ : bonus 200.
- Arrondi `Math.round` (demi vers le haut), appliqué au bonus de vitesse et à `basePoints`.
- `basePoints` n'est arrondi qu'une seule fois.
- `responseTimeMs` est un entier de millisecondes.

### 7.2 Formule CONTEST

```text
points = correct ? 1000 : 0
si >= 2 joueurs corrects :
  maxSpeed = minimum des responseTimeMs des corrects
  chaque correct avec responseTimeMs == maxSpeed reçoit +200
```

Pas de série, pas de vies, pas de multiplicateur.

### 7.3 Exemples

| Cas | Calcul | Points |
| --- | --- | --- |
| Novice, level 1, 2 s, série 0 | 100 + 50 + 0 | 150 |
| Adventurer, level 5, 8 s, série 3 | 625 + 25 + 60 | 710 |
| Novice, level 1, 3 001 ms, série 0 | 100 + 50 + 0 | 150 |
| Wizard, level 10, 14 s, série 12 (plafonnée 10) | 1500 + 0 + 200 | 1700 |
| Mauvaise réponse | 0 | 0 |
| Timeout | 0 | 0 |
| Contest, seul correct | 1000 | 1000 |
| Contest, deux corrects, 1,2 s et 2,4 s | 1000 + 200 au premier | 1200 / 1000 |
| Contest, deux corrects ex æquo 1,5 s | 1000 + 200 chacun | 1200 / 1200 |

### 7.4 Statistiques par joueur

Le serveur conserve pour chaque joueur :

- `score`
- `correctCount`
- `wrongCount` (réponses fausses uniquement)
- `timeoutCount`
- `totalResponseMs` (réponses fournies + `timerMs` par timeout)
- `streak`
- `bestStreak`
- `lives`
- `status`
- `joinedAt`

### 7.5 Départage

Ordre final :

1. Statut : survivant/vainqueur avant éliminé, puis forfait.
2. `score` décroissant.
3. `correctCount` décroissant.
4. `wrongCount + timeoutCount` croissant.
5. `totalResponseMs` croissant.
6. `joinedAt` croissant.
7. Égalité.

Les entrées ex æquo partagent le même `rank` et portent `tied: true` ; le rang suivant saute les places occupées. À `MATCH_OVER` d'un match complété, `finalRanking` contient une entrée par joueur encore membre de la room, forfaits par déconnexion inclus ; les forfaits volontaires retirés n'y figurent pas. Il est vide pour tout match abandonné.

## 8. Vies, élimination, forfait

- `MAX_LIVES = 3`.
- Une mauvaise réponse ou un timeout retire 1 vie.
- Une bonne réponse ne rend pas de vie.
- `lives == 0` : `ELIMINATED`, les réponses suivantes sont refusées.
- En room, un joueur éliminé reste dans la room comme spectateur.
- En solo, l'élimination termine le match.
- En solo, un forfait ou une expiration de reconnexion termine aussi le match, marqué `abandoned`.
- En room web, le match continue tant qu'il reste au moins 2 joueurs actifs. En room TikTok, il continue même avec 0 ou 1 actif.
- Un joueur qui quitte volontairement en partie est `FORFEITED` : score conservé, non actif, non gagnant, retiré de la room. En lobby, `ROOM_LEAVE` retire simplement le joueur (`LEFT`).
- Une déconnexion de plus de 30 s équivaut à un forfait en partie ; le joueur reste membre en lecture seule.
- En lobby, un joueur déconnecté est retiré après 30 s.

## 9. Difficulté, timer, pause

### 9.1 Profils

| Difficulté | Timer | Multiplicateur |
| --- | --- | --- |
| Novice | 25 000 ms | 1.0 |
| Adventurer | 20 000 ms | 1.25 |
| Wizard | 15 000 ms | 1.5 |

- CLASSIC : niveaux 1-3 Novice, 4-7 Adventurer, 8-10 Wizard.
- SUBJECT : difficulté choisie à la création.
- CONTEST : Adventurer.
- TikTok : timer de 15 000 ms par défaut, difficulté choisie pour SUBJECT, progressive pour CLASSIC.

### 9.2 Horloge

- Toutes les dates sont des entiers Unix en millisecondes.
- Le serveur est la seule horloge autoritaire.
- Le client estime `clockOffset` à partir de `serverNow` et affiche le temps restant.
- `TIMER_SYNC` est émis toutes les 5 s pendant `COUNTDOWN`, `QUESTION`, `ARTICLE` et `LEVEL_COMPLETE`, et après une reprise.
- Aucun `TIMEOUT` client n'existe.

### 9.3 Pause

- Autorisée en `QUESTION`, `REVEAL`, `ARTICLE`, `LEVEL_COMPLETE`.
- Autorisée au host d'une room privée, au joueur solo et au control TikTok.
- Interdite au host d'une room publique.
- Le temps restant est gelé.
- Les `ANSWER` et `CONTINUE` sont refusés pendant la pause.
- `HOST_RESUME` recalcule `phaseEndsAt = now + remainingMs`.
- Une pause web/solo est reprise automatiquement après 120 s.
- Une pause TikTok n'a pas de limite et reste sous contrôle de l'opérateur.
- Le temps de pause est exclu du calcul de `responseTimeMs`.

## 10. Article et continuation

### 10.1 Contenu

L'article contient :

- `articleTitle`
- `articleBody` (texte brut, max 5 000 caractères)
- `image.url`, `image.alt`
- `explanation` (résumé court)

Le rendu :

- premier caractère en lettrine ;
- paragraphes séparés par `\n\n` ;
- aucun HTML, aucun `dangerouslySetInnerHTML`.

### 10.2 Continuation web

- Chaque joueur actif et connecté envoie `CONTINUE { phaseToken }`.
- Le serveur mémorise `readyForPhase`.
- S'il y a au moins un actif connecté et que tous les actifs connectés sont prêts : avancer immédiatement.
- Sinon : attendre le timeout de phase (30 s ARTICLE, 15 s LEVEL_COMPLETE).
- Les éliminés, forfaits, partis et déconnectés ne bloquent pas.
- Un `CONTINUE` avec un `phaseToken` périmé est rejeté.

### 10.3 Continuation TikTok

- Pas de `CONTINUE`.
- Article affiché 8 s, puis avance automatique.
- `HOST_SKIP` avance immédiatement.

## 11. LEVEL_COMPLETE

Affiché entre deux niveaux CLASSIC, après l'article de la 20e question.

Contenu :

- numéro du niveau terminé ;
- score courant ;
- vies restantes ;
- indication « vies rechargées » en solo ;
- bouton `CONTINUE` (host/control `HOST_SKIP` en TikTok).

En room multi, les vies ne sont pas rechargées. En solo, elles reviennent à 3.

## 12. Matchmaking

### 12.1 Room privée

1. `POST /api/rooms`.
2. Le serveur crée la room `LOBBY`, code unique à 6 caractères.
3. Le host est le créateur.
4. Les joueurs rejoignent par `ROOM_JOIN { code }`.
5. Capacité 2-8, défaut 8 ; CONTEST est forcé à 2.
6. Le host lance quand tous les connectés sont prêts et qu'il y a au moins 2 joueurs connectés.
7. Un join après `COUNTDOWN` échoue avec `ROOM_IN_PROGRESS`.

### 12.2 File publique

1. `POST /api/queue { mode, category?, difficulty? }`.
2. Clé : `mode | difficulty | category`.
3. Cible : CONTEST 2 ; CLASSIC/SUBJECT 4.
4. Minimum : 2. Maximum : 8.
5. À `size >= target`, prendre les `target` plus anciens et créer la room.
6. À 120 s avec `2 <= size < target`, proposer une small room.
7. Vote 15 s, majorité stricte des électeurs présents au moment de la proposition.
8. Non-réponse = refus.
9. Acceptants ≥ 2 : room avec les acceptants ; refusants restent en file.
10. Acceptants < 2 : pas de room ; timer remis à 120 s.
11. Si la cible est atteinte pendant le vote : annulation de la proposition et lancement normal.
12. Déconnexion : retrait de la file.
13. Pas de matchmaking cross-instance en v1.

### 12.3 Auto-start public

- Le serveur crée la room et associe directement les sockets matchés.
- `MATCH_FOUND` est émis.
- `COUNTDOWN` de 3 s.
- Si un joueur n'est pas connecté ou part avant la fin du `COUNTDOWN` : room annulée (`MATCH_CANCELLED`), match `abandoned`, les autres remis en file.
- Aucun host ne peut annuler.

### 12.4 Codes de room

- Alphabet : `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- Longueur : 6.
- Génération cryptographique.
- Collision vérifiée parmi les rooms actives.
- 10 tentatives maximum, puis `INTERNAL_ERROR`.

## 13. Reconnexion et déconnexion

### 13.1 Reconnexion

1. Socket.io se reconnecte avec le même token.
2. Le serveur retrouve le joueur par session.
3. Si le joueur est dans une room : `SESSION_READY` puis snapshot complet.
4. Le joueur reste `DISCONNECTED` jusqu'à la reconnexion.
5. Les réponses déjà verrouillées sont conservées.
6. Le timer n'est pas suspendu pour une déconnexion individuelle.

### 13.2 Expiration

- 30 s sans reconnexion : `LEFT` en lobby, `FORFEITED` en partie.
- En lobby : retrait de la room, la place est libérée.
- En partie : forfait, score conservé, non actif ; le joueur reste membre en lecture seule et peut se reconnecter sans capacité de jeu. En solo, le match est immédiatement `abandoned`.
- En room publique avant le start : room annulée si le minimum n'est plus atteint.

### 13.3 Conflit d'onglets

- Un nouveau socket avec le même token remplace l'ancien.
- L'ancien reçoit `SESSION_REPLACED` puis est déconnecté.
- Le nouveau reçoit le snapshot courant.

### 13.4 Host

- En lobby privé, si le host quitte ou reste déconnecté plus de 30 s, transfert au plus ancien connecté.
- En partie privée, le host peut pause/resume, skip `ARTICLE`/`LEVEL_COMPLETE` et fermer ; s'il part, la partie continue.
- En room publique, le host est informatif et n'a aucun contrôle.
- En TikTok, la console host est liée à un token control ; si elle se déconnecte, la room continue et l'overlay affiche l'état.

## 14. TikTok

### 14.1 Création

- `POST /api/tiktok/rooms` avec `ADMIN_TOKEN`.
- Body : `{ mode, category?, difficulty?, timerMs? }`, avec `mode` `CLASSIC`/`SUBJECT`, `timerMs` entre 10 000 et 30 000 ms (défaut 15 000). `CLASSIC` refuse `category`/`difficulty` ; `SUBJECT` exige les deux.
- Retourne `{ roomCode, overlayToken, controlToken }`. Les tokens n'ont pas d'expiration propre ; ils sont révoqués à la fermeture de la room.
- `settings.maxPlayers` vaut 100 pour une room TikTok, éliminés inclus ; l'overlay compare `players.length` à cette valeur pour le message de capacité.
- Le host n'est pas joueur.
- Le serveur connecte `tiktok-live-connector` au `TIKTOK_USERNAME` configuré.

### 14.2 Join des viewers

- Un viewer devient joueur au premier commentaire valide A/B/C/D pendant `QUESTION` ; ce commentaire vaut réponse pour la question en cours.
- A/B/C/D correspondent aux options **affichées**, donc à l'ordre mélangé, pas à l'ordre éditorial du JSON.
- Identité : `provider='tiktok'`, `external_id=uniqueId`.
- Pseudo : `nickname` si disponible, sinon `uniqueId`, normalisé.
- Avatar : initiale ou avatar généré par hash ; pas d'URL arbitraire.
- Capacité : 100 joueurs rejoints par room, éliminés inclus. Les suivants sont ignorés (log et message overlay discret).
- Un viewer éliminé ne peut plus répondre.

### 14.3 Parsing

Algorithme :

1. NFKC.
2. Trim.
3. Supprimer les mentions `@...` en tête.
4. Refuser le commentaire s'il contient une URL.
5. Supprimer ponctuation, emojis, espaces.
6. Lowercase.
7. Accepter si le résultat est exactement `a`, `b`, `c` ou `d`.

Exemples acceptés : `A`, `a.`, `@user B`, `C !`.
Exemples refusés : `réponse A`, `AB`, `A ou B`, `https://... A`, `bonjour`.
La lettre est ensuite convertie en index de l'option affichée (`A=0`, `B=1`, `C=2`, `D=3`).

### 14.4 Déduplication

- Clé : `(playerId, questionId)`.
- Première réponse valide uniquement.
- Les réponses suivantes sont ignorées sans erreur visible.

### 14.5 Connecteur

- Backoff 1 s → 30 s.
- `PublicRoomState.tiktokConnected` reflète l'état du connecteur (`true` connecté, `false` déconnecté) et pilote les badges overlay/control.
- En `LOBBY`, un connecteur déconnecté fait refuser `GAME_START` avec `TIKTOK_NOT_CONNECTED` ; la room reste ouverte.
- En `COUNTDOWN`, la déconnexion n'interrompt pas le décompte ; la pause automatique s'applique à l'entrée en `QUESTION`.
- Déconnexion : `tiktokConnected=false` et pause au prochain point sûr, overlay `Chat reconnecting…`.
- La pause automatique utilise `PAUSED` avec `pausedFrom` et n'a pas d'auto-reprise.
- Reconnexion automatique.
- Le host peut reprendre la room puis continuer en manuel.
- Aucun cookie de session n'est loggué.
- Le connecteur est non officiel ; tests sur compte secondaire obligatoires.

### 14.6 Fallback manuel

- Console host : recherche d'un joueur, boutons A/B/C/D.
- Envoie `HOST_MANUAL_ANSWER { playerId, choiceIndex }`.
- Mêmes validations qu'une réponse normale.
- Utile si le connecteur est indisponible ou pour corriger un problème.

## 15. Overlay et control

### 15.1 Overlay

URL : `/?mode=overlay&room=CODE#token=OVERLAY_TOKEN`.

Affichage :

- **Idle** : titre, code, consigne, top 5.
- **Countdown** : grand chiffre.
- **Question** : image, question, options, timer, top 10.
- **Reveal** : bonne réponse, explication, top 10.
- **Article** : titre, image, extrait 3 lignes, 8 s.
- **Match over** : top 10 final construit depuis `finalRanking`, vainqueur, « Draw » ou « No winner » si abandonné.
- Badge « Chat reconnecting… » si `tiktokConnected=false`.
- Pas de contrôles, pas de son par défaut.
- Tokens invalides : écran d'erreur sans détail.

### 15.2 Control

URL : `/?mode=control&room=CODE#token=CONTROL_TOKEN`.

Fonctions :

- start ;
- pause / resume ;
- skip ;
- réponse manuelle ;
- fermer la room ;
- copier les liens overlay/control.

Badges `LIVE`/`CHAT OFFLINE` pilotés par `tiktokConnected`. La console ne montre jamais la bonne réponse avant `REVEAL`.

## 16. Sons

| Son | Déclencheur | Qui l'entend |
| --- | --- | --- |
| `lobby-join.mp3` | Un joueur rejoint le lobby | Joueurs du lobby |
| `countdown-tick.mp3` | Chaque seconde du countdown | Joueurs |
| `correct.mp3` | Le joueur a répondu correctement à la révélation | Le joueur concerné |
| `wrong.mp3` | Le joueur a répondu faux ou timeout | Le joueur concerné |
| `level-up.mp3` | Entrée en `LEVEL_COMPLETE` | Joueurs |

Règles :

- Préchargement après la première interaction utilisateur.
- Bouton mute persistant (`localStorage`).
- L'overlay est muet par défaut.
- Les sons sont dérivés du snapshot, pas d'un événement séparé.
- Aucun son ne doit être joué avant la révélation.

## 17. Accessibilité

- WCAG 2.1 AA.
- Contraste vérifié.
- `aria-label` sur chaque option.
- `aria-live="polite"` pour les phases et résultats.
- Timer annoncé à 10 s, 5 s et 0 uniquement.
- Navigation clavier complète.
- `KeyboardEvent.code` pour les raccourcis.
- Cibles tactiles ≥ 44 px.
- `prefers-reduced-motion`.
- Justesse indiquée par texte + icône, pas seulement par couleur.
- Test axe-core + NVDA/VoiceOver avant release.

## 18. i18n et marque

- Produit : **Encycla**.
- Jeu : **Encycla MindMaze**.
- Le nom de la marque encyclopédique historique est interdit partout.
- UI et contenu : anglais en v1.
- Documentation : français.
- Les chaînes UI sont centralisées dans `client/i18n/en.ts`.
- Les catégories et questions restent en anglais.

## 19. Non-objectifs v1

- Multi-instance / scaling horizontal.
- Mode hors-ligne.
- Génération Gemini en direct.
- Comptes email/mot de passe.
- Matchmaking classé/ELO.
- Chat entre joueurs.
- Modération de contenu TikTok.
- Replay ou historique de partie.
- Spectateurs web.
- Rematch.
- Personnalisation d'avatar par upload.

## 20. Critères d'acceptation produit

1. Une room privée CLASSIC à 2 joueurs se joue de bout en bout.
2. Une room publique CONTEST à 2 joueurs se lance immédiatement.
3. Une room publique CLASSIC attend 4 joueurs ou propose une small room après 2 minutes.
4. Un joueur peut se reconnecter dans les 30 s et retrouver son état.
5. Les réponses correctes ne sont jamais présentes dans un snapshot avant `REVEAL`.
6. Le score final est identique côté serveur et côté client pour les mêmes réponses.
7. Un timeout retire une vie hors CONTEST (et affiche l'article sauf fin anticipée).
8. En solo CLASSIC, les vies sont rechargées à chaque niveau.
9. En room, les vies ne sont pas rechargées.
10. Un joueur éliminé ne bloque pas la progression.
11. Le leaderboard survit à un redémarrage.
12. L'overlay TikTok affiche la question, la révélation et le top 10 sans contrôles.
13. Le parsing TikTok rejette les commentaires ambigus.
14. Aucun accès direct à `correctIndex` avant révélation n'est possible via l'API.
15. Les tests serveur atteignent la couverture exigée.
