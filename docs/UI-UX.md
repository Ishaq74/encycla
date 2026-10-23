# Encycla — Direction artistique, écrans et expérience utilisateur

- Version : 1.0
- Date : 2026-10-22
- Statut : référence d'implémentation UI
- Accessibilité : [ADR-017](ADR.md), [SPECIFICATION.md](SPECIFICATION.md)
- Protocole : [PROTOCOL.md](PROTOCOL.md)

## 1. Intention

Encycla doit évoquer une encyclopédie multimédia de salon, mais rester un jeu compétitif lisible en 1080p et sur mobile. L'ambiance est sombre, éditoriale et précise :

- **sombre** : fond `#0f172a`, panneaux `#1e293b`, pas de noir pur ;
- **encyclopédique** : titres serif, filets fins, petites capitales, références visuelles ;
- **arcade sobre** : timer proéminent, options franches, transitions courtes ;
- **accessible** : contraste AA, focus visible, aucun signal uniquement coloré ;
- **scène TikTok** : overlay lisible à 1080p, sans contrôles, sans son.

Aucune référence à la marque encyclopédique historique dans l'interface, les assets, les textes ou les métadonnées. Le nom du jeu est **Encycla MindMaze**.

## 2. Rôles et routes

| Route | Rôle | Vue |
| --- | --- | --- |
| `/` | Player | Accueil |
| `/` + état room | Player | Lobby / Countdown / Question / Reveal / Article / Level complete / Results |
| `/?mode=overlay&room=CODE#token=...` | Overlay | Vue OBS lecture seule |
| `/?mode=control&room=CODE#token=...` | Control | Console host TikTok |
| `/?mode=leaderboard` | Player | Leaderboard |
| `/?mode=join&code=CODE` | Player | Join prérempli |

- Le token overlay/control est dans le fragment, jamais dans la query.
- Aucune route `/game` séparée : le store Zustand décide de la vue.
- Un rechargement restaure la session, puis le snapshot de room.

## 3. Tokens de design

### 3.1 Couleurs

Palette imposée par ADR-017. Les valeurs Tailwind sont indiquées pour l'implémentation.

| Token | Valeur | Tailwind | Usage |
| --- | --- | --- | --- |
| `--bg` | `#0f172a` | `slate-900` | Fond principal |
| `--surface` | `#1e293b` | `slate-800` | Cartes, panneaux |
| `--surface-raised` | `#263449` | custom | Panneau élevé, hover |
| `--border` | `#334155` | `slate-700` | Filets, séparateurs |
| `--border-strong` | `#475569` | `slate-600` | Bordures focus/hover |
| `--text` | `#f8fafc` | `slate-50` | Texte principal |
| `--text-secondary` | `#cbd5e1` | `slate-300` | Texte secondaire |
| `--text-muted` | `#94a3b8` | `slate-400` | Icônes, labels ≥ 18 px |
| `--accent` | `#60a5fa` | `blue-400` | Action primaire, focus |
| `--success` | `#34d399` | `emerald-400` | Correct, succès |
| `--danger` | `#fb7185` | `rose-400` | Erreur, incorrect |
| `--warning` | `#fbbf24` | `amber-400` | Timer bas, avertissement |
| `--on-accent` | `#0f172a` | `slate-900` | Texte sur fond accentué |

Règles :

- `slate-500` (`#64748b`) est interdit pour tout texte < 18 px.
- Le texte secondaire utilise `--text-secondary`, jamais une opacité < 80 %.
- Les états correct/incorrect utilisent couleur + icône + texte.
- Le fond d'une option correcte est `--success` avec texte `--on-accent`.
- Le fond d'une option incorrecte est `--danger` avec texte `--on-accent`.
- Les panneaux ne sont jamais transparents sur l'overlay sans fond de secours.

### 3.2 Typographie

| Rôle | Police | Taille / interligne | Graisse |
| --- | --- | --- | --- |
| Wordmark | Merriweather | 32 / 40 | 700 |
| H1 | Merriweather | 40 / 48 (mobile 32/40) | 700 |
| H2 | Merriweather | 28 / 36 | 700 |
| H3 | Inter | 22 / 30 | 600 |
| Body | Inter | 16 / 26 | 400 |
| Body small | Inter | 14 / 22 | 400 |
| Label | Inter | 12 / 16, uppercase, tracking 0.08em | 600 |
| Timer | system-ui mono | 48 / 48 tabular | 700 |
| Code room | ui-monospace | 40 / 48, tracking 0.15em | 700 |

- Polices auto-hébergées : Merriweather (400, 700), Inter (400, 500, 600, 700), fichiers `.woff2`.
- Aucun Google Fonts, aucun CDN de polices, de JS ou de CSS ; les images éditoriales suivent l'allowlist CSP.
- `font-display: swap`.
- Chiffres tabulaires pour le timer et les scores.
- Les titres d'articles utilisent Merriweather ; le corps reste Inter pour la lisibilité.

### 3.3 Espacement et rayons

| Token | Valeur |
| --- | --- |
| `space-1` | 4 px |
| `space-2` | 8 px |
| `space-3` | 12 px |
| `space-4` | 16 px |
| `space-6` | 24 px |
| `space-8` | 32 px |
| `space-12` | 48 px |
| `space-16` | 64 px |
| `radius-sm` | 6 px |
| `radius-md` | 10 px |
| `radius-lg` | 14 px |
| `radius-pill` | 999 px |

- Les panneaux principaux utilisent `radius-lg`.
- Les boutons utilisent `radius-md`.
- Les badges et pills utilisent `radius-pill`.
- Les filets internes font 1 px `--border`.

### 3.4 Ombres et profondeur

- Pas d'ombre lourde.
- Panneau : `0 1px 0 rgba(248,250,252,0.04) inset`, `0 16px 40px rgba(2,6,23,0.35)`.
- Bouton primaire : pas d'ombre, bordure claire.
- Overlay : panneau `rgba(15,23,42,0.92)` avec bordure `rgba(248,250,252,0.12)`.

### 3.5 Mouvement

| Token | Durée | Usage |
| --- | --- | --- |
| `motion-fast` | 120 ms | Hover, focus |
| `motion-base` | 180 ms | Apparition, option |
| `motion-slow` | 240 ms | Panneau, modal |

- Courbe : `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Aucune animation > 300 ms hors countdown.
- `prefers-reduced-motion: reduce` : désactive shake, pulsations, confettis, transitions non essentielles.
- Le countdown reste un changement de chiffre, pas une animation de scale si reduced motion.
- Aucune animation ne bloque une action.

### 3.6 Focus

- Anneau `2 px` `--accent`, offset `2 px`.
- Ne jamais supprimer `outline` sans remplacement.
- Focus initial sur le titre de la vue.
- `:focus-visible` uniquement, sauf pour les options au clavier.

## 4. Tailwind et CSS

- Tailwind compilé via PostCSS, pas de CDN.
- `tailwind.config.ts` mappe les tokens.
- Les composants utilisent des classes utilitaires et des classes de variantes.
- Les couleurs dynamiques passent par des classes complètes, jamais par concaténation de chaînes.
- Aucun attribut `style="..."` : CSP `style-src 'self'`.
- Les jauges utilisent `<progress>` ou un SVG avec attributs `stroke-dasharray` / `stroke-dashoffset`.
- Les variables CSS globales vivent dans `client/styles/tokens.css`.
- Les animations vivent dans `client/styles/animations.css`.
- Les composants métier ne contiennent pas de couleurs en dur.

## 5. Structure de l'application

```text
App
├── ConnectionBanner
├── PlayerShell
│   ├── AppHeader
│   │   ├── Wordmark
│   │   ├── SoundToggle
│   │   └── ConnectionDot
│   ├── HomeView
│   ├── LobbyView
│   ├── MatchmakingView
│   ├── CountdownView
│   ├── QuestionView
│   ├── RevealView
│   ├── ArticleView
│   ├── LevelCompleteView
│   ├── ResultsView
│   ├── LeaderboardView
│   └── ErrorView
├── OverlayView
└── ControlView
```

- `App` choisit le rôle via `?mode`.
- Le player shell a un fond `--bg` et une largeur max `1152 px`.
- L'overlay et le control ont leur propre shell, sans header joueur.

## 6. Accueil

### 6.1 Objectif

Permettre en moins de 15 secondes de : créer un pseudo, lancer un solo, créer/rejoindre une room, ou consulter le leaderboard.

### 6.2 Disposition desktop

```text
┌──────────────────────────────────────────────────────────────┐
│ Encycla                                      Son  Connexion │
├───────────────────────────────┬──────────────────────────────┤
│ The visual encyclopedia game  │  Pseudo [ Alice          ]   │
│                               │                              │
│ [Image de une, 16:9]          │  [ Solo CLASSIC          ]   │
│                               │  [ Solo SUBJECT          ]   │
│ Comment jouer                 │  [ Play online           ]   │
│                               │  [ Create private room   ]   │
│                               │  [ Join with code        ]   │
│                               │  [ Leaderboard           ]   │
├───────────────────────────────┴──────────────────────────────┤
│ 244 questions · 18 categories · v1.0                         │
└──────────────────────────────────────────────────────────────┘
```

- Colonne gauche 55 %, droite 45 %.
- L'image de une est une image Wikimedia locale ou distante autorisée, avec crédit discret.
- Le panneau de droite est une carte `--surface`.
- Le pseudo est obligatoire pour jouer ; il est mémorisé localement.
- « Solo SUBJECT » ouvre un modal catégorie + difficulté.
- Les catégories sous 20 questions sont désactivées avec « Coming soon ».
- « Join with code » ouvre un champ 6 caractères, uppercase automatique.

### 6.3 Mobile

- Une colonne.
- Wordmark puis panneau d'actions.
- Image de une masquée ou réduite à 200 px de haut.
- Boutons pleine largeur, 48 px minimum.

### 6.4 États

- Session en cours de création : boutons désactivés, label « Preparing… ».
- Erreur serveur : bandeau inline, bouton « Retry ».
- Version de protocole incompatible : blocage avec message et lien de rechargement.
- Pas de questions : mode CLASSIC désactivé, message opérateur.

## 7. Lobby

### 7.1 Contenu

- Code de room en grand, copiable.
- Mode, difficulté, catégorie, nombre de questions.
- Liste des joueurs (avatar, `displayName`, badge host, prêt).
- Bouton « Ready » / « Not ready ».
- Bouton « Start game » pour le host privé, désactivé tant que tous ne sont pas prêts.
- Bouton « Leave » avec confirmation.
- Room privée : « Waiting for host… » pour les non-hosts.
- Room publique : « Waiting for players… » puis « Starting automatically… ».

### 7.2 Disposition

```text
┌──────────────────────────────────────────────┐
│ Room K7M2Q4                         [Copy]  │
│ CLASSIC · 10 levels · 20 questions           │
├──────────────────────────────────────────────┤
│ ● Alice   HOST   READY                       │
│ ● Bob            READY                       │
│ ○ Carol          NOT READY                   │
├──────────────────────────────────────────────┤
│ [ Ready ]                     [ Leave ]      │
│                        [ Start game ]        │
└──────────────────────────────────────────────┘
```

- Les joueurs déconnectés sont grisés avec « Reconnecting… ».
- Le host est badge `HOST`.
- Le code est en `ui-monospace`, sélectionnable.
- 8 joueurs maximum : grille 2 colonnes desktop, 1 mobile.

### 7.3 Confirmation de sortie

- Modal : « Leave this room? Your score will be kept if the game has started. »
- Actions : « Stay », « Leave ».
- Échap ferme la modal.

## 8. Matchmaking

### 8.1 File

```text
Searching for players…
CLASSIC · 2 / 4 players
00:42
[ Cancel ]
```

- Position et temps écoulé.
- Pas de fausse barre de progression.
- Annulation immédiate.
- Si une room publique est annulée en `COUNTDOWN`, les joueurs restants sont remis en file avec « Finding a new match… ».
- Si 2-3 joueurs attendent depuis 2 min, le modal small room apparaît.

### 8.2 Proposition small room

- Titre : « A smaller room is ready ».
- Texte : « 3 players are waiting. Start now with 2-3 players? »
- Compte à rebours 15 s.
- Actions : « Start with 2-3 », « Keep waiting ».
- Non-réponse = refus.
- Un seul vote par joueur.
- Après le vote : « Waiting for other players… ».
- Si la room se crée : transition directe vers le countdown.

## 9. Countdown

- Plein écran.
- `LEVEL 1 / 10` en label.
- Grand chiffre 3, 2, 1.
- Mode et catégorie en sous-titre.
- Pas de bouton.
- Son `countdown-tick.mp3` à chaque seconde, si activé.
- `aria-live="assertive"` sur le chiffre.
- Après 0 : transition question.

### 9.1 Pause

- Bandeau « Paused » sur la vue courante ; timer figé et réponses désactivées.
- Host privé/solo : bouton « Resume » et indication « Auto-resume in 120 s ».
- Control TikTok : pas d'auto-resume ; seul le control reprend.
- Overlay : badge « Paused » discret, sans action.
- Le temps de pause est exclu du temps de réponse.

## 10. Question

### 10.1 Desktop

```text
┌──────────────────────────────────────────────────────────────┐
│ LEVEL 1/10 · Q 3/20    ♦♦♦ 3 lives   SCORE 420   🔥 2  00:18 │
├───────────────────────────────┬──────────────────────────────┤
│                               │  Which big cat has a mane?   │
│         [IMAGE 16:9]          │                              │
│                               │  [A] Lion                    │
│                               │  [B] Tiger                   │
│                               │  [C] Leopard                 │
│                               │  [D] Jaguar                  │
│                               │                              │
│                               │  Choose an answer            │
└───────────────────────────────┴──────────────────────────────┘
```

- Header sticky en haut.
- Image 55 % largeur, `object-contain`, fond `--surface`.
- Options 45 %, boutons 64 px de haut, texte 18 px.
- Timer à droite, barre SVG sous le header.
- Score et série visibles.
- Vies : 3 losanges ou cœurs, avec label accessible « 3 lives remaining ».
- Après verrouillage : option sélectionnée en `--accent`, autres désactivées, label « Answer locked ».
- Aucune indication de justesse avant `REVEAL`.

### 10.2 Mobile

- Header compact sur deux lignes.
- Image 40 % de la hauteur, max 240 px.
- Question 20 px.
- Options en bas, 4 boutons pleine largeur, 56 px.
- Timer en barre horizontale.
- Pas de scroll horizontal.
- Le bouton sélectionné reste visible.

### 10.3 Raccourcis

- `A`, `B`, `C`, `D` et `1`, `2`, `3`, `4`.
- Via `KeyboardEvent.code` (`KeyA`, `Digit1`) pour AZERTY.
- Ignorés si un champ est focus, si `Ctrl/Alt/Meta` est enfoncé, ou si la réponse est déjà verrouillée.
- `Enter`/`Space` active le bouton focus.
- `M` mute.
- `Escape` ouvre la confirmation de sortie.

### 10.4 Accessibilité

- Chaque option : `aria-label="Option A: Lion"`.
- Groupe d'options avec `role="group"` et `aria-labelledby`.
- Timer `role="timer"`, `aria-live="off"`, annonces à 10 s, 5 s, 0.
- Après révélation : `aria-label` incluant « Correct » ou « Incorrect ».
- Focus initial sur le titre de la question.
- Ne pas voler le focus après chaque snapshot.

## 11. Reveal

### 11.1 Contenu

- Bandeau « Correct » / « Incorrect » / « Time's up ».
- Bonne réponse en évidence.
- Explication courte.
- Points gagnés : `+710`.
- Série actuelle.
- Vies restantes.
- Top 5 et position du joueur.
- Timer visuel 2,5 s (non interactif).

### 11.2 Règles visuelles

- Option correcte : fond `--success`, texte `--on-accent`, icône check.
- Option choisie incorrecte : fond `--danger`, texte `--on-accent`, icône croix.
- Les autres options : `--surface`, opacité 0.7, texte `--text-secondary`.
- La couleur ne suffit jamais : texte et icône obligatoires.
- Pas de confettis si reduced motion.
- Pas de son si mute.

## 12. Article

### 12.1 Desktop

```text
┌──────────────────────────────────────────────────────────────┐
│ ← Back to question        ARTICLE · 30 s remaining           │
├──────────────────────────────────────────────────────────────┤
│ [IMAGE]        Lion                                          │
│                The lion is a large felid...                  │
│                ...                                           │
│                                                              │
│                Credit: Wikimedia Commons · CC BY-SA 4.0      │
├──────────────────────────────────────────────────────────────┤
│ [ Continue ]                         2 / 4 players ready     │
└──────────────────────────────────────────────────────────────┘
```

- Deux colonnes desktop : image 40 %, texte 60 %.
- Une colonne mobile.
- Lettrine sur le premier paragraphe via `::first-letter`.
- Texte brut, paragraphes `white-space: pre-wrap`.
- Hauteur max avec scroll interne si nécessaire.
- Bouton « Continue » fixe en bas.
- Indicateur « x / y ready ».
- En TikTok : pas de bouton, badge « Auto-continue in 8s ».

### 12.2 Accessibilité

- `aria-live="polite"` sur « Article ».
- Le corps est un `<article>`.
- L'image a un `alt` réel.
- Le crédit est un lien externe `rel="noopener noreferrer"`.
- Focus sur le titre de l'article.
- Le bouton Continue est atteignable au clavier.

## 13. Level complete

- Titre « Level 3 complete ».
- Score, vies, série.
- En solo : « Lives restored » avec 3 vies.
- En room : « Lives carry over ».
- Bouton « Continue ».
- Timer 15 s.
- `aria-live="polite"`.
- Transition vers la question 1 du niveau suivant.

## 14. Results

### 14.1 Contenu

- Titre « Match complete » ; « Match abandoned » si `finalRanking` est vide.
- Vainqueur ou « Draw ».
- Podium top 3 avec avatars, construit depuis `finalRanking`.
- Tableau : rang, joueur, score, corrects, erreurs, temps ; le rang vient du serveur.
- Ligne du joueur mise en évidence.
- Bouton « Back to home ».
- Bouton « Leaderboard ».
- Pas de rematch en v1.
- Les joueurs éliminés sont marqués « Eliminated ».
- Les forfaits encore membres sont marqués « Forfeited » ; les départs volontaires retirés ne sont pas affichés.

### 14.2 Départage

- Afficher « Draw » si `winnerId` est `null` mais que `finalRanking` n'est pas vide.
- Afficher « Match abandoned » si `finalRanking` est vide.
- Ne jamais afficher un rang basé sur l'ordre alphabétique ni recalculer le classement côté client.
- Le classement et les rangs viennent de `finalRanking` (ADR-005).

## 15. Leaderboard

- Filtres : mode (All/CLASSIC/SUBJECT/CONTEST), source (All/Web/TikTok).
- Top 50 par défaut.
- Colonnes : rank, player, points, matches, best, correct.
- Ligne du joueur courant si présent.
- État vide : « No matches yet. Be the first. »
- Erreur : « Leaderboard unavailable. »
- Pas de pagination infinie ; bouton « Load more » max 100.
- Les pseudos sont tronqués à 24 caractères avec ellipsis.

## 16. Connexion et erreurs

### 16.1 Bandeau

- `Reconnecting…` avec spinner discret.
- `Connected` fugace 2 s après reconnexion.
- `Room closed` si le serveur a redémarré.
- `Session expired` avec bouton « New session ».
- `Protocol mismatch` avec bouton « Reload ».

### 16.2 Modal de déconnexion

- Après 5 s sans socket : overlay non bloquant, « Connection lost. Reconnecting… ».
- Après 30 s en lobby : « Session ended » et retour accueil.
- Après 30 s en partie : le joueur passe `FORFEITED` en lecture seule ; l'UI propose de se reconnecter pour consulter la room et le classement.
- Ne jamais afficher une question figée sans indication.

### 16.3 Erreurs inline

- Champ pseudo : message sous le champ.
- Join code : « Room not found. »
- Room pleine : « This room is full. »
- Partie commencée : « This game has already started. »
- Rate limit : « Too many attempts. Try again in a moment. »
- Erreur serveur : « Something went wrong. Retry. »
- Jamais de stack trace, jamais de code interne seul.

## 17. Overlay TikTok

### 17.1 Format

- 1920×1080.
- Fond transparent pour OBS ; panneaux opaques à 92 %.
- Marge de sécurité 60 px.
- Aucun contrôle, aucun curseur.
- Aucun son par défaut.
- Police et tokens identiques au client.

### 17.2 Idle

```text
┌──────────────────────────────────────────────────────────────┐
│ ENCYCLA LIVE                                                 │
│ Room T9X4P2                                                  │
│ Comment A, B, C or D to join                                 │
│                                                              │
│ Top 5                                                        │
│ 1. Alice      4200                                           │
│ 2. Bob        3800                                           │
└──────────────────────────────────────────────────────────────┘
```

### 17.3 Question

- Image à gauche 55 %, question et options à droite.
- Options A-D avec grandes lettres.
- Timer 72 px.
- Top 10 à droite ou en bas selon la place.
- Le code de room reste visible.
- Pas de révélation avant l'heure.

### 17.4 Reveal

- Bonne réponse en vert avec check.
- Explication 2 lignes max.
- Top 10.
- Durée 2,5 s.

### 17.5 Article

- Titre, image, extrait 3 lignes.
- Auto-avance 8 s.
- Badge « Next question in 8s ».

### 17.6 Fin

- Top 10 final construit depuis `finalRanking`.
- Vainqueur, « Draw » si `winnerId` est `null`, ou « No winner » si le match est abandonné.
- Message « Thanks for playing ».

### 17.7 Erreurs

- Token invalide : écran neutre « Overlay unavailable ».
- Room fermée : « Stream ended ».
- Connecteur TikTok déconnecté (`tiktokConnected=false`) : badge « Chat reconnecting… ».
- Capacité atteinte (`players.length >= settings.maxPlayers`) : « Chat is full. New comments are ignored. »
- Jamais de détail technique à l'antenne.

## 18. Console control

### 18.1 Format

- Desktop 1280×800 minimum.
- Deux colonnes : état à gauche, actions à droite.
- Header : room, mode, phase, timer, viewers.
- Actions : Start, Pause/Resume, Skip, Close.
- Start est actif avec 0 viewer ; il est désactivé si `tiktokConnected=false`. Les viewers rejoignent au fil des questions.
- Réponse manuelle : recherche joueur, boutons A-D.
- Liens overlay/control copiables avec bouton.
- Dernières 20 actions avec timestamp.
- Confirmation pour Skip question et Close.
- Badge « LIVE » si `tiktokConnected=true` ; « CHAT OFFLINE » sinon.
- Aucun affichage de la bonne réponse avant `REVEAL`.

### 18.2 Règles

- Le control ne peut pas répondre à la place d'un joueur sans `HOST_MANUAL_ANSWER`.
- Le control ne peut pas modifier un score.
- Le control ne peut pas voir les tokens des joueurs.
- Le control ne doit jamais être montré à l'antenne.
- Le token control n'est jamais copié dans l'overlay.

## 19. Composants

### 19.1 `Button`

Variantes :

| Variante | Fond | Texte | Bordure |
| --- | --- | --- | --- |
| `primary` | `--accent` | `--on-accent` | transparente |
| `secondary` | transparent | `--text` | `--border-strong` |
| `ghost` | transparent | `--text-secondary` | transparente |
| `success` | `--success` | `--on-accent` | transparente |
| `danger` | `--danger` | `--on-accent` | transparente |

Tailles : `sm` 36 px, `md` 44 px, `lg` 52 px.
États : hover, active, focus, disabled, loading.
Un bouton disabled garde un contraste lisible et un `aria-disabled`.

### 19.2 `OptionButton`

- Lettre A-D dans un carré 32 px.
- Texte 18 px.
- Hauteur 64 px.
- `aria-label` complet.
- États : default, hover, selected, correct, incorrect, disabled.
- Jamais de `div` cliquable.

### 19.3 `Timer`

- SVG circulaire desktop, barre mobile.
- Chiffres tabulaires.
- Passe en `--warning` à 5 s, `--danger` à 3 s.
- `aria-live` off, annonces ponctuelles.
- Ne dépend pas de l'horloge client pour décider la fin.

### 19.4 `PlayerChip`

- Avatar 32 px.
- Pseudo tronqué.
- Badge host/ready/eliminated.
- `aria-label` complet.

### 19.5 `TopList`

- Jusqu'à 10 lignes.
- Rang, avatar, pseudo, score.
- Met en évidence le joueur courant.
- Pas de défilement automatique.

### 19.6 `ArticleBody`

- `article` sémantique.
- Paragraphes.
- Lettrine.
- Aucun HTML.
- Max 5 000 caractères.

### 19.7 `Modal`

- `role="dialog"`, `aria-modal="true"`.
- Focus piégé.
- Échap ferme.
- Retour du focus au déclencheur.
- Pas de modal pour une information non bloquante.

### 19.8 `Banner`

- Variantes info, success, warning, error.
- `role="status"` ou `role="alert"` selon l'urgence.
- Pas d'auto-dismiss pour une erreur.

### 19.9 `Avatar`

- Emoji curé ou initiales.
- Jamais d'URL fournie par l'utilisateur.
- `aria-hidden` si le pseudo est adjacent.
- Taille 24, 32, 48, 64 px.

## 20. Responsive

| Breakpoint | Largeur | Changements |
| --- | --- | --- |
| `sm` | 640 px | Options pleine largeur |
| `md` | 768 px | Deux colonnes article |
| `lg` | 1024 px | Deux colonnes question |
| `xl` | 1280 px | Largeur max 1152 px |
| `2xl` | 1536 px | Overlay 1920 |

- Utiliser `dvh`, pas `vh`, pour le mobile.
- Tester 360×640, 768×1024, 1280×720, 1920×1080.
- Aucun scroll horizontal.
- Les boutons restent ≥ 44 px.
- Le clavier mobile ne doit pas masquer le bouton de validation.

## 21. Accessibilité

### 21.1 Exigences

- WCAG 2.1 AA.
- Contraste vérifié pour chaque combinaison.
- Navigation clavier complète.
- Focus visible.
- `aria-live` pour les phases et résultats.
- Pas de contenu clignotant > 3 fois/s.
- Zoom 200 % sans perte.
- Respect de `prefers-reduced-motion`.
- Respect de `prefers-contrast: more` : bordures renforcées, pas de transparence.
- Sons désactivables.
- Sous-titres ou texte pour chaque information sonore.
- Aucun texte dans une image.

### 21.2 Annonces

| Événement | Annonce |
| --- | --- |
| Nouvelle question | « Question 3 of 20. Which big cat has a mane? » |
| Timer 10 s | « 10 seconds remaining. » |
| Timer 5 s | « 5 seconds remaining. » |
| Timer 0 | « Time's up. » |
| Révélation | « Correct answer: Lion. You answered Tiger. Incorrect. » |
| Article | « Article: Lion. » |
| Niveau terminé | « Level 3 complete. » |
| Fin | « Match complete. You finished 2 of 4. » |
| Reconnexion | « Reconnecting… » |
| Room fermée | « Room closed. » |

### 21.3 Clavier

| Touche | Action |
| --- | --- |
| `Tab` / `Shift+Tab` | Navigation |
| `Enter` / `Space` | Activer |
| `A-D`, `1-4` | Répondre |
| `Enter` | Continuer |
| `Escape` | Quitter / fermer |
| `M` | Mute |

- Les raccourcis sont désactivés dans un champ de saisie.
- `KeyboardEvent.code` est utilisé, pas `key`.
- Un raccourci ne déclenche jamais deux actions.

## 22. Sons

| Fichier | Moment | Volume |
| --- | --- | --- |
| `lobby-join.mp3` | Un joueur rejoint | -18 dB |
| `countdown-tick.mp3` | Chaque seconde | -20 dB |
| `correct.mp3` | Révélation correcte pour le joueur | -14 dB |
| `wrong.mp3` | Révélation incorrecte/timeout | -14 dB |
| `level-up.mp3` | Level complete | -16 dB |

- Préchargement après la première interaction.
- Mute persistant `encycla.audio.v1`.
- L'overlay est muet par défaut.
- Aucun son avant la révélation.
- Les fichiers sont locaux, licenciés, < 100 Ko chacun.
- Si un fichier manque : silence, pas d'erreur bloquante.

## 23. Microcopy

### 23.1 Ton

- Concis, éditorial, jamais infantilisant.
- Pas de majuscules pour des phrases entières.
- Pas d'emoji dans les messages d'erreur.
- Pas de référence à la marque encyclopédique historique.
- Pas de promesse non tenue.

### 23.2 Chaînes principales

| Contexte | Chaîne |
| --- | --- |
| Tagline | The visual encyclopedia game |
| Solo | Play solo |
| Online | Play online |
| Private | Create a private room |
| Join | Join with a code |
| Ready | Ready |
| Not ready | Not ready |
| Start | Start game |
| Waiting | Waiting for players… |
| Copy code | Copy code |
| Copied | Copied |
| Question | Question 3 of 20 |
| Lives | 3 lives |
| Streak | 3 in a row |
| Correct | Correct |
| Incorrect | Incorrect |
| Timeout | Time's up |
| Continue | Continue |
| Article | Article |
| Level complete | Level complete |
| Match complete | Match complete |
| Draw | Draw |
| Eliminated | Eliminated |
| Forfeited | Forfeited |
| Reconnecting | Reconnecting… |
| Room closed | Room closed |
| Retry | Retry |
| Leave | Leave |
| Stay | Stay |

### 23.3 Erreurs

| Code | Message |
| --- | --- |
| `ROOM_NOT_FOUND` | Room not found. Check the code. |
| `ROOM_FULL` | This room is full. |
| `ROOM_IN_PROGRESS` | This game has already started. |
| `ROOM_CLOSED` | This room is closed. |
| `NOT_CONNECTED` | Connection lost. Reconnecting… |
| `NOT_ENOUGH_PLAYERS` | At least 2 players are required. |
| `PLAYERS_NOT_READY` | Every player must be ready. |
| `ANSWER_TOO_LATE` | Too late. |
| `PLAYER_ELIMINATED` | You can no longer answer. |
| `PLAYER_FORFEITED` | You can no longer answer. |
| `CATEGORY_INSUFFICIENT_QUESTIONS` | This category needs at least 20 questions. Choose another category. |
| `TIKTOK_DISABLED` | TikTok mode is disabled. |
| `TIKTOK_NOT_CONNECTED` | Chat is not connected. Start the connector. |
| `RATE_LIMITED` | Too many attempts. Try again in a moment. |
| `SESSION_EXPIRED` | Your session expired. Start a new one. |
| `PERSISTENCE_DISABLED` | Leaderboard is temporarily unavailable. |
| `PROTOCOL_VERSION_MISMATCH` | This page is out of date. Reload. |
| `INTERNAL_ERROR` | Something went wrong. Retry. |

## 24. Chargement et transitions

- Skeleton uniquement pour le leaderboard et l'image.
- Pas de spinner plein écran > 300 ms.
- Transition lobby → countdown : fade 180 ms.
- Countdown → question : fade 120 ms.
- Question → reveal : pas de transition, remplacement direct.
- Reveal → article : fade 180 ms.
- Article → question : fade 120 ms.
- Results : apparition 240 ms.
- Le contenu n'est jamais masqué pendant une transition.
- `prefers-reduced-motion` : transitions instantanées.

## 25. Assets et crédits

- Images : Wikimedia, crédit et licence affichés sur l'article.
- Polices : Merriweather (SIL OFL), Inter (SIL OFL).
- Sons : fichiers originaux ou CC0, crédités dans `client/assets/sounds/CREDITS.md`.
- Icônes : SVG inline, trait 2 px, `aria-hidden`.
- Pas d'image de fond lourde.
- Pas de CDN pour les polices, le JS ou le CSS ; images éditoriales via allowlist.
- Pas de logo de la marque encyclopédique historique.
- Le wordmark Encycla est du texte, pas une image.

## 26. Critères de recette UI

1. Accueil utilisable en 360 px sans scroll horizontal.
2. Question lisible à 1920×1080 et à 360×640.
3. Aucun texte < 14 px.
4. Tous les boutons ≥ 44 px.
5. Tous les états ont un focus visible.
6. Les options sont annoncées correctement par NVDA.
7. Le timer n'est pas annoncé chaque seconde.
8. Les couleurs ne sont jamais le seul signal.
9. L'overlay n'a aucun contrôle.
10. Le control ne montre jamais la réponse avant `REVEAL`.
11. Aucun son avant la révélation.
12. Aucun `style=` inline.
13. Aucune police, aucun script et aucune feuille de style chargés depuis un CDN ; les images éditoriales respectent l'allowlist.
14. Aucune occurrence du nom de la marque encyclopédique historique.
15. Les erreurs sont en anglais clair, sans code interne seul.
