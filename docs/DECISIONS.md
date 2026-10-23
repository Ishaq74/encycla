# Encycla — Journal des décisions

- Version : 1.0
- Date : 2026-10-22
- Statut : toutes les questions ouvertes de la revue initiale sont tranchées
- Règle : une décision ci-dessous est contraignante. La modifier exige un ADR de remplacement et une mise à jour de ce journal.

Ce fichier répond point par point aux ambiguïtés relevées dans le README v1 et dans le prototype. Il sert de matrice de traçabilité entre un doute, la décision, sa justification et le document de référence.

## A. Produit et modes

| ID | Question | Décision | Justification | Référence |
| --- | --- | --- | --- | --- |
| D-01 | Le socle existant doit-il être conservé tel quel ? | Non. Le client actuel devient une base visuelle ; toute la logique de jeu est réécrite côté serveur. | Le prototype est mono-client, sans autorité, sans reconnexion et sans anti-triche. | ADR-001, ADR-012 |
| D-02 | Quels sont les modes en v1 ? | CLASSIC, SUBJECT, CONTEST. CLASSIC et SUBJECT sont solo ou room ; CONTEST est un duel en ligne à 2. | Préserve les trois entrées du prototype tout en supprimant le local. | ADR-003 |
| D-03 | Le CONTEST local à deux sur un clavier est-il conservé ? | Non. Il est remplacé par un duel en ligne, un joueur par appareil. | Un socket = un joueur ; l'autorité serveur et la reconnexion deviennent possibles. | ADR-003, ADR-012 |
| D-04 | Le jeu peut-il fonctionner hors-ligne ? | Non en v1. Toute partie nécessite le serveur. | Source de vérité unique et anti-triche. | ADR-001, ADR-018 |
| D-05 | Une partie solo est-elle une room ? | Oui, une room avec un seul joueur humain. | Un seul moteur et un seul protocole. | ADR-003 |
| D-06 | Combien de joueurs par room web ? | 2 à 8 en room privée/publique ; 1 en solo. | Le prototype est à 2, le README parle de 4 ; 8 laisse de la marge sans complexifier l'UI. | ADR-003, ADR-010 |
| D-07 | Combien de viewers TikTok ? | 100 viewers rejoints maximum (éliminés inclus), 20 visés pour le live de validation. | Le README cible 20 viewers ; 100 absorbe un pic sans changer l'architecture. | ADR-003, ADR-014 |
| D-08 | Le host est-il un joueur ? | Oui en web ; non en TikTok (il est spectateur et opérateur). | En live, le host doit surveiller le chat et l'overlay. | ADR-009, ADR-014 |

## B. Progression, vies, temps

| ID | Question | Décision | Justification | Référence |
| --- | --- | --- | --- | --- |
| D-09 | Progression partagée ou par joueur ? | Partagée par la room. | Tous les joueurs doivent voir la même question et le même article. | ADR-004 |
| D-10 | Un niveau se termine sur 20 bonnes réponses ou 20 questions ? | 20 questions résolues. | Une room peut avoir des joueurs faux ; la progression ne doit pas dépendre de la performance. | ADR-004 |
| D-11 | Les vies sont-elles rechargées ? | Solo CLASSIC/SUBJECT : oui, à chaque niveau. Rooms et TikTok : non, persistantes. | Campagne solo jouable ; élimination significative en compétition. | ADR-005 |
| D-12 | Que fait un timeout ? | Mauvaise réponse automatique : 0 point, -1 vie, série remise à zéro. | Comportement uniforme et testable. | ADR-005, ADR-006 |
| D-13 | L'article est-il affiché après une mauvaise réponse ? | Oui, après chaque question. | Vocation encyclopédique et cohérence du prototype. | ADR-004 |
| D-14 | Combien de temps dure un article ? | 2,5 s de révélation puis article ; 30 s maximum en web, 8 s en TikTok. | Laisse le temps de lire sans bloquer un live. | ADR-004, ADR-006 |
| D-15 | Qui peut passer à la suite ? | Tous les joueurs actifs connectés doivent cliquer `CONTINUE`, ou le timeout de phase avance. | Synchronisation de la room ; les éliminés, forfaits et déconnectés ne bloquent pas. | ADR-004 |
| D-16 | Le timer peut-il être mis en pause ? | Oui : host d'une room privée, joueur solo et control TikTok. Jamais le host d'une room publique. Auto-reprise après 120 s hors TikTok. | Fiabilité du live et secours manuel, sans permettre à un host public de bloquer la partie. | ADR-006, ADR-015 |
| D-17 | Le timer est-il un tick serveur de 200 ms ? | Non. Échéance absolue + synchronisation toutes les 5 s. | Même garantie d'autorité, charge réseau bien moindre. | ADR-006 |

## C. Score et classement

| ID | Question | Décision | Justification | Référence |
| --- | --- | --- | --- | --- |
| D-18 | Formule CLASSIC/SUBJECT ? | `round(100 × multiplicateur difficulté × niveau) + bonus vitesse + bonus série`. | Reprend l'esprit du prototype et rend la difficulté significative. | ADR-005 |
| D-19 | Formule CONTEST ? | 1000 points par bonne réponse ; +200 au(x) plus rapide(s) si au moins deux bonnes réponses. | Reprend le duel existant. | ADR-005 |
| D-20 | Le bonus de série est-il plafonné ? | Oui, 10 niveaux de série = 200 points maximum. | Évite les scores exponentiels. | ADR-005 |
| D-21 | Les points sont-ils visibles avant la révélation ? | Non. Les scores du snapshot sont mis à jour à `REVEAL`. | Ne pas révéler la justesse d'une réponse par le score. | ADR-005, ADR-011 |
| D-22 | Comment départager deux joueurs ? | Survie, points, bonnes réponses, mauvaises réponses + timeouts, temps cumulé, ordre d'arrivée, égalité. | Classement déterministe et reproductible. | ADR-005 |
| D-23 | Un joueur éliminé peut-il encore gagner ? | Non, sauf si tous les joueurs sont éliminés en même temps : classement au score. | L'élimination doit avoir un sens. | ADR-005 |
| D-24 | Que devient un joueur qui quitte ? | Forfait : score conservé, non actif, non gagnant. | Empêche le farming et clarifie les rooms. | ADR-005, ADR-009 |

## D. Questions et contenu

| ID | Question | Décision | Justification | Référence |
| --- | --- | --- | --- | --- |
| D-25 | Où vivent les questions ? | `data/questions.json` (source éditoriale) synchronisée vers SQLite (source d'exécution). | Une source relue, versionnée, et une lecture rapide en jeu. | ADR-007, DATA-MODEL |
| D-26 | Gemini est-il utilisé en direct ? | Non. Gemini est un outil de production hors ligne ; validation humaine obligatoire. | Qualité, latence, coût et sécurité. | ADR-007 |
| D-27 | Combien de questions pour CLASSIC ? | Au moins 200 approuvées uniques ; 10 niveaux × 20. | Le pool actuel en contient 244 uniques. | ADR-007 |
| D-28 | Combien de questions par catégorie pour SUBJECT ? | Au moins 20 ; sinon la catégorie est désactivée. | Le pool actuel en contient 12 à 16 ; c'est une dette de contenu assumée. | ADR-007 |
| D-29 | Que fait-on des questions générales en doublon ? | Fusion et déduplication par titre/question/options ; pas de pool général au runtime. | 12 des 20 questions générales recoupent des sujets catégorisés, soit 13 groupes de doublons au total avec un doublon interne à une catégorie. | DATA-MODEL |
| D-30 | La difficulté filtre-t-elle les questions ? | Non. C'est un profil de timer et de score. | Évite une distribution impossible par difficulté. | ADR-008 |
| D-31 | Faut-il mélanger les options ? | Oui, à chaque tirage, avec un RNG injecté. | 155 bonnes réponses sur 257 sont en position B ; biais majeur. | ADR-007 |
| D-32 | Que faire si le pool est épuisé ? | Recycler la plus ancienne question et logguer un avertissement. | Ne jamais bloquer une partie. | ADR-007 |
| D-33 | Les articles peuvent-ils contenir du HTML ? | Non, texte brut uniquement. | Supprime la surface XSS. | ADR-007, ADR-016 |
| D-34 | Quel champ image ? | `image.url`, `image.alt`, crédit et licence. | Le champ `base64Image` actuel contient des URLs, pas du base64. | DATA-MODEL |

## E. Sessions et reconnexion

| ID | Question | Décision | Justification | Référence |
| --- | --- | --- | --- | --- |
| D-35 | Qui génère le `playerId` ? | Le serveur. | Empêche l'usurpation. | ADR-009 |
| D-36 | Comment authentifier un joueur ? | Token opaque `sess_...`, stocké haché en base, envoyé en Bearer/Socket auth. | Révocable et sans mot de passe. | ADR-009 |
| D-37 | Combien de temps pour se reconnecter ? | 30 s en partie. | Laisse le temps à une coupure réseau courte. | ADR-009 |
| D-38 | Que se passe-t-il si le host part ? | Transfert au plus ancien joueur connecté en lobby ; en partie, la room continue. | Évite les rooms orphelines. | ADR-009 |
| D-39 | Plusieurs onglets ? | Le dernier socket remplace l'ancien. | Une seule connexion active par session. | ADR-009 |

## F. Matchmaking

| ID | Question | Décision | Justification | Référence |
| --- | --- | --- | --- | --- |
| D-40 | Seuil public ? | CONTEST : 2. CLASSIC/SUBJECT : 4. | Un duel à 4 n'a pas de sens ; les autres modes gardent le seuil du README. | ADR-010 |
| D-41 | Que se passe-t-il après 2 minutes ? | Proposition small-room, vote de 15 s, majorité stricte des électeurs. | Règles déterministes et anti-abus. | ADR-010 |
| D-42 | Les non-réponses au vote ? | Comptées comme refus. | Pas de majorité fantôme. | ADR-010 |
| D-43 | Qui devient host en public ? | Le plus ancien joueur, sans privilège de démarrage. | Auto-start. | ADR-010 |
| D-44 | Un joueur peut-il rejoindre une partie en cours ? | Non. | Évite les déséquilibres et les fuites d'état. | ADR-010 |

## G. TikTok, overlay, sécurité

| ID | Question | Décision | Justification | Référence |
| --- | --- | --- | --- | --- |
| D-45 | Quand un viewer rejoint-il ? | Au premier commentaire valide A/B/C/D pendant `QUESTION`. | Évite les listes de joueurs fantômes. | ADR-014 |
| D-46 | Comment parser un commentaire ? | Normalisation stricte ; résultat exactement `a`, `b`, `c` ou `d`. | Évite les faux positifs et le bruit. | ADR-014 |
| D-47 | Une seule réponse par question ? | Oui, la première réponse valide gagne. | Anti-spam et équité. | ADR-014 |
| D-48 | Que faire si le connecteur TikTok tombe ? | Pause automatique, overlay en état dégradé, fallback manuel via console host. | Le live doit continuer. | ADR-014 |
| D-49 | Comment protéger l'overlay ? | Token overlay en lecture seule, token control séparé, tous deux hachés et scoped à la room. | Évite l'observation/pilotage non autorisé. | ADR-015 |
| D-50 | La bonne réponse est-elle envoyée au client ? | Jamais avant `REVEAL`. | Anti-triche. | ADR-001, ADR-016 |
| D-51 | Comment éviter le XSS ? | Aucun `dangerouslySetInnerHTML`, article en texte brut, CSP, React escaping. | Supprime la classe d'attaque. | ADR-016 |
| D-52 | Où est la clé Gemini ? | Nulle part en v1 ; si réintroduite, serveur uniquement. | Le prototype l'injecte dans le bundle client. | ADR-016 |
| D-53 | Rate limiting ? | 100 req/min/IP, 10 événements/s/socket, limites renforcées sur sessions/join. | Protège le serveur et les rooms. | ADR-016 |

## H. Client, UI, accessibilité

| ID | Question | Décision | Justification | Référence |
| --- | --- | --- | --- | --- |
| D-54 | Quelle est la source d'état du client ? | Zustand, alimenté uniquement par les snapshots serveur. | Une seule frontière transport/UI. | ADR-012 |
| D-55 | Le client calcule-t-il quelque chose ? | Non. Il affiche, envoie des intentions et gère l'UI transitoire. | Autorité serveur. | ADR-001, ADR-012 |
| D-56 | Clavier AZERTY ? | Utiliser `KeyboardEvent.code` (`Digit1..Digit4`, `KeyA..KeyD`) et non `key`. | Indépendant de la disposition. | ADR-017, UI-UX |
| D-57 | Mobile ? | 4 gros boutons A-D, cibles ≥ 44 px, pas de split-screen. | Un seul joueur par appareil. | ADR-017, UI-UX |
| D-58 | Langue ? | UI et contenu en anglais en v1 ; documentation en français ; chaînes centralisées pour l'i18n future. | Le contenu existant est anglais ; ne pas mélanger les langues à l'écran. | UI-UX |
| D-59 | Marque ? | Encycla. Le nom de la marque encyclopédique historique est banni. « MindMaze » peut rester comme nom du jeu. | Risque de marque et cohérence. | README, UI-UX |
| D-60 | Sons ? | 5 fichiers, préchargés après interaction, mute persistant, overlay muet par défaut. | Autoplay navigateur et confort. | ADR-017 |

## I. Plateforme et exploitation

| ID | Question | Décision | Justification | Référence |
| --- | --- | --- | --- | --- |
| D-61 | Ports de développement ? | Serveur 3000, Vite 5173, proxy. | Le prototype et le README se disputent le port 3000. | ADR-002, DEPLOYMENT |
| D-62 | Ports de production ? | Un seul port 3000, Express sert le build Vite. | Simplicité CORS/CSP. | ADR-002, DEPLOYMENT |
| D-63 | Base de données ? | SQLite WAL, better-sqlite3, migrations versionnées. | Volume et simplicité v1. | ADR-013 |
| D-64 | Leaderboard ? | Matchs terminés avec ≥ 2 joueurs ; scores `completed` et `eliminated` ; forfaits et abandons exclus ; somme des points ; top 50. | Évite le farming solo et la récompense de l'abandon. | ADR-013 |
| D-65 | Plusieurs instances serveur ? | Non en v1. | Rooms en mémoire et SQLite local. | ADR-018 |
| D-66 | Redémarrage serveur ? | Rooms perdues ; matchs en cours marqués abandonnés ; joueurs renvoyés au menu. | Cohérence et simplicité. | ADR-013 |
| D-67 | CI ? | lint, typecheck, data:validate, tests unitaires/intégration + couverture, build, E2E Chromium, Gitleaks et audit sur PR et main. | Qualité reproductible. | ADR-018, DEPLOYMENT |
| D-68 | Docker ? | Multi-stage, runtime non-root, volume `/app/data`, healthcheck. | Déploiement reproductible. | DEPLOYMENT |
| D-69 | Critères de sortie ? | 2 joueurs privé/public, overlay TikTok, 1 h / 20 viewers, latence p95 < 500 ms, leaderboard persistant. | Reprend et rend mesurables les critères du README. | TESTING, DEPLOYMENT |

## J. Précisions de contrat

| ID | Question | Décision | Justification | Référence |
| --- | --- | --- | --- | --- |
| D-70 | Que peut passer le host ? | Host privé : `ARTICLE` et `LEVEL_COMPLETE` uniquement. Control TikTok : les mêmes phases, plus `QUESTION` ; jamais `REVEAL`. Solo et host public : aucun skip. | Empêche un host de sauter une question pour fausser la partie, et interdit de masquer la révélation. | ADR-006 |
| D-71 | Comment lancer une partie solo ? | `POST /api/solo` avec `mode`, `category?`, `difficulty?` ; room à 1 joueur, auto-start immédiat. | Évite de faire passer le solo par le lobby ou le matchmaking. | PROTOCOL, SPECIFICATION |
| D-72 | Une room publique est-elle rejoignable par code ? | Non. Les rooms publiques sont remplies uniquement par le matchmaking ; `ROOM_JOIN` est réservé aux rooms privées. | Empêche de contourner la file et de choisir ses adversaires. | SPECIFICATION, PROTOCOL |
| D-73 | Quels scores entrent au leaderboard ? | `completed` et `eliminated` uniquement ; `forfeited` et `abandoned` exclus. | Un forfait ne doit pas être récompensé. | ADR-013, DATA-MODEL |
| D-74 | Que contient `totalResponseMs` ? | La somme des temps des réponses fournies, plus `timerMs` pour chaque timeout. | Un timeout ne doit pas améliorer le départage au temps. | ADR-005 |
| D-75 | `wrongCount` inclut-il les timeouts ? | Non. `wrongCount` compte les réponses fausses ; `timeoutCount` compte les timeouts. | Évite le double comptage dans le départage. | ADR-005, DATA-MODEL |
| D-76 | Où sont transmis les tokens overlay/control ? | Dans le fragment d'URL (`#token=...`), puis dans `handshake.auth.token`. | Le fragment n'est jamais envoyé au serveur HTTP ni loggué. | ADR-015, SECURITY |
| D-77 | Que faire si SQLite est indisponible ? | Le serveur démarre en mode dégradé : sessions et scores en mémoire, questions depuis le JSON, leaderboard `PERSISTENCE_DISABLED`. | Le jeu reste jouable ; la persistance est sacrifiée, pas la disponibilité. | ADR-013, DATA-MODEL |
| D-78 | Quelle est la longueur maximale d'un pseudo ? | 2 à 24 graphèmes après normalisation. | Aligné sur ADR-016 et lisible dans le lobby. | ADR-016, SECURITY |

## Points qui ne sont plus des questions ouvertes

Les sujets suivants ont été explicitement fermés et ne doivent plus être rediscutés sans ADR :

- le mode CONTEST local ;
- le calcul du score côté client ;
- le timer côté client ;
- les vies rechargées en multi-joueurs ;
- le seuil public unique de 4 pour tous les modes ;
- le vote small-room à la majorité des votants ;
- le `playerId` fourni par le client ;
- la génération Gemini en direct ;
- le HTML dans les articles ;
- l'overlay sans token ;
- l'inclusion du solo dans le leaderboard ;
- le support multi-instance en v1.

## Dette de contenu explicitement assumée

Le pool actuel ne permet pas SUBJECT à 20 questions par catégorie. La décision est de **bloquer proprement** les catégories insuffisantes plutôt que de répéter des questions ou de changer silencieusement la longueur. La dette est traitée dans [DATA-MODEL.md](DATA-MODEL.md) et [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md).

## Dette d'exploitation explicitement assumée

- Une seule instance serveur.
- Rooms en mémoire, perdues au redémarrage.
- Rate limiting en mémoire.
- Connecteur TikTok non officiel.
- Pas de CDN pour les polices, le JS ou le CSS, ni de self-hosting des images en v1 ; les images éditoriales Wikimedia passent par l'allowlist CSP.

Ces limites sont des décisions, pas des oublis.
