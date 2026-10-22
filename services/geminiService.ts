
import { Category, Difficulty, QuestionData } from "../types";

// --- IMAGES RÉELLES (PHOTOS) STOCKÉES COMME CONSTANTES ---
// Ces URLs pointent vers Wikimedia Commons (haute fiabilité).
// Ce sont de vraies photos, pas des générations IA.
const REAL_MENU_IMAGES = {
    // Photo officielle de la Terre (Blue Marble / Apollo 17)
    CLASSIC: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/The_Earth_seen_from_Apollo_17.jpg/800px-The_Earth_seen_from_Apollo_17.jpg",
    
    // Illustration standard d'un livre ouvert (Savoir / Sujets) - URL PNG très stable
    SUBJECT: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Open_book_nae_02.svg/800px-Open_book_nae_02.svg.png",
    
    // Photo d'un jeu d'échecs (Compétition / Duel)
    CONTEST: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/ChessSet.jpg/800px-ChessSet.jpg"
};

const TRIVIA_DATABASE: Record<string, QuestionData[]> = {
  [Category.FAUNA]: [
    {
      subject: "Lion",
      questionText: "Identify this animal.",
      options: ["Tiger", "Lion", "Leopard", "Jaguar"],
      correctAnswerIndex: 1,
      explanation: "This is a Lion, known as the 'King of the Jungle', though they live in savannas.",
      articleTitle: "Lion (Panthera leo)",
      articleBody: "The lion is a large cat of the genus Panthera native to Africa and India. It has a muscular, deep-chested body, short, rounded head, round ears, and a hairy tuft at the end of its tail.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Lion_waiting_in_Namibia.jpg/640px-Lion_waiting_in_Namibia.jpg"
    },
    {
      subject: "Blue Whale",
      questionText: "Identify this marine mammal.",
      options: ["Humpback Whale", "Orca", "Blue Whale", "Sperm Whale"],
      correctAnswerIndex: 2,
      explanation: "This is the Blue Whale, the largest animal known to have ever lived.",
      articleTitle: "Blue Whale",
      articleBody: "The blue whale is a marine mammal belonging to the baleen whale parvorder Mysticeti. It is the largest animal known to have ever lived.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Blue_Whale_001_body_bw.jpg/640px-Blue_Whale_001_body_bw.jpg"
    },
    {
      subject: "Cheetah",
      questionText: "What is this animal?",
      options: ["Leopard", "Cheetah", "Jaguar", "Puma"],
      correctAnswerIndex: 1,
      explanation: "This is a Cheetah, the fastest land animal, distinguished by its tear marks.",
      articleTitle: "Cheetah",
      articleBody: "The cheetah is a large cat native to Africa and central Iran. It is the fastest land animal, capable of running at 80 to 128 km/h.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/TheCheethcat.jpg/640px-TheCheethcat.jpg"
    },
    {
      subject: "Giraffe",
      questionText: "Identify this animal.",
      options: ["Okapi", "Giraffe", "Camel", "Llama"],
      correctAnswerIndex: 1,
      explanation: "This is a Giraffe, the tallest living terrestrial animal.",
      articleTitle: "Giraffe",
      articleBody: "The giraffe is a tall African hoofed mammal belonging to the genus Giraffa. It is the tallest living terrestrial animal and the largest ruminant.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Giraffe_standing.jpg/640px-Giraffe_standing.jpg"
    },
    {
      subject: "Kangaroo",
      questionText: "What is this animal?",
      options: ["Wallaby", "Kangaroo", "Koala", "Wombat"],
      correctAnswerIndex: 1,
      explanation: "This is a Kangaroo, a marsupial from Australia known for hopping.",
      articleTitle: "Kangaroo",
      articleBody: "Kangaroos are marsupials indigenous to Australia. They have large, powerful hind legs, large feet adapted for leaping, a long muscular tail for balance, and a small head.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Kangaroo_Australia_01_11_2008_-_retouched.jpg/640px-Kangaroo_Australia_01_11_2008_-_retouched.jpg"
    },
    {
      subject: "Polar Bear",
      questionText: "Identify this bear.",
      options: ["Grizzly Bear", "Panda", "Polar Bear", "Black Bear"],
      correctAnswerIndex: 2,
      explanation: "This is a Polar Bear, native to the Arctic Circle.",
      articleTitle: "Polar Bear",
      articleBody: "The polar bear is a hypercarnivorous bear whose native range lies largely within the Arctic Circle. It is the largest extant bear species, as well as the largest extant land carnivore.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Polar_Bear_-_Alaska_%28cropped%29.jpg/640px-Polar_Bear_-_Alaska_%28cropped%29.jpg"
    },
    {
      subject: "Octopus",
      questionText: "What is this sea creature?",
      options: ["Squid", "Jellyfish", "Octopus", "Cuttlefish"],
      correctAnswerIndex: 2,
      explanation: "This is an Octopus, known for its eight limbs and high intelligence.",
      articleTitle: "Octopus",
      articleBody: "An octopus is a soft-bodied, eight-limbed mollusc of the order Octopoda. The order consists of some 300 species and is grouped within the class Cephalopoda.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Octopus2.jpg/640px-Octopus2.jpg"
    },
    {
      subject: "Chameleon",
      questionText: "Identify this reptile.",
      options: ["Iguana", "Gecko", "Chameleon", "Komodo Dragon"],
      correctAnswerIndex: 2,
      explanation: "This is a Chameleon, famous for its ability to change color.",
      articleTitle: "Chameleon",
      articleBody: "Chameleons are a distinctive and highly specialized clade of Old World lizards with 200 species described. They are noted for their ability to change skin coloration.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Chameleon02.jpg/640px-Chameleon02.jpg"
    },
    {
      subject: "Sloth",
      questionText: "What is this animal?",
      options: ["Koala", "Sloth", "Lemur", "Anteater"],
      correctAnswerIndex: 1,
      explanation: "This is a Sloth, known for its slowness of movement.",
      articleTitle: "Sloth",
      articleBody: "Sloths are Neotropical xenarthran mammals. They are noted for their slowness of movement and extremely slow metabolism.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Bradypus.jpg/640px-Bradypus.jpg"
    },
    {
      subject: "Platypus",
      questionText: "Identify this unique mammal.",
      options: ["Beaver", "Otter", "Platypus", "Duck"],
      correctAnswerIndex: 2,
      explanation: "This is a Platypus, an egg-laying mammal with a duck-like bill.",
      articleTitle: "Platypus",
      articleBody: "The platypus is a semiaquatic, egg-laying mammal endemic to eastern Australia. It is one of the five extant species of monotremes, the only mammals that lay eggs instead of giving birth to live young.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Platypus.jpg/640px-Platypus.jpg"
    },
    {
      subject: "Zebra",
      questionText: "Identify this animal.",
      options: ["Horse", "Zebra", "Donkey", "Okapi"],
      correctAnswerIndex: 1,
      explanation: "This is a Zebra, known for its black and white stripes.",
      articleTitle: "Zebra",
      articleBody: "Zebras are African equines with distinctive black-and-white striped coats. There are three extant species: the Grévy's zebra, plains zebra, and the mountain zebra.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Plains_Zebra_Equus_quagga_cropped.jpg/640px-Plains_Zebra_Equus_quagga_cropped.jpg"
    },
    {
      subject: "Rhinoceros",
      questionText: "What animal is this?",
      options: ["Hippo", "Elephant", "Rhinoceros", "Buffalo"],
      correctAnswerIndex: 2,
      explanation: "This is a Rhinoceros, known for its horn(s).",
      articleTitle: "Rhinoceros",
      articleBody: "A rhinoceros is any of the five extant species of odd-toed ungulates in the family Rhinocerotidae. Two of the extant species are native to Africa, and three to South and Southeast Asia.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Rhinoc%C3%A9ros_blanc_Jaldapara.jpg/640px-Rhinoc%C3%A9ros_blanc_Jaldapara.jpg"
    },
    {
      subject: "Hippopotamus",
      questionText: "Identify this large mammal.",
      options: ["Manatee", "Hippopotamus", "Elephant", "Walrus"],
      correctAnswerIndex: 1,
      explanation: "This is a Hippopotamus.",
      articleTitle: "Hippopotamus",
      articleBody: "The hippopotamus, also called the hippo, is a large, mostly herbivorous, semiaquatic mammal and ungulate native to sub-Saharan Africa.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Hippopotamus_amphibius_01.jpg/640px-Hippopotamus_amphibius_01.jpg"
    },
    {
      subject: "Gorilla",
      questionText: "What primate is this?",
      options: ["Chimpanzee", "Orangutan", "Gorilla", "Bonobo"],
      correctAnswerIndex: 2,
      explanation: "This is a Gorilla, the largest living primate.",
      articleTitle: "Gorilla",
      articleBody: "Gorillas are herbivorous, predominantly ground-dwelling great apes that inhabit the tropical forests of equatorial Africa.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Gorille_des_plaines_de_l%27ouest_%C3%A0_l%27Espace_Zoologique.jpg/640px-Gorille_des_plaines_de_l%27ouest_%C3%A0_l%27Espace_Zoologique.jpg"
    },
    {
      subject: "Giant Panda",
      questionText: "Identify this bear.",
      options: ["Polar Bear", "Black Bear", "Giant Panda", "Koala"],
      correctAnswerIndex: 2,
      explanation: "This is a Giant Panda, native to China.",
      articleTitle: "Giant panda",
      articleBody: "The giant panda is a bear species endemic to China. It is characterised by its bold black-and-white coat and rotund body.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Grosser_Panda.JPG/640px-Grosser_Panda.JPG"
    }
  ],
  [Category.FLORA]: [
    {
      subject: "Sunflower",
      questionText: "Identify this flower.",
      options: ["Daisy", "Sunflower", "Marigold", "Dandelion"],
      correctAnswerIndex: 1,
      explanation: "This is a Sunflower, recognizable by its large yellow head.",
      articleTitle: "Helianthus (Sunflower)",
      articleBody: "Sunflowers possess a behavior called heliotropism. The flower buds and young blossoms will face east in the morning and follow the sun across the sky.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Sunflower_sky_backdrop.jpg/640px-Sunflower_sky_backdrop.jpg"
    },
    {
      subject: "Venus Flytrap",
      questionText: "What is this plant?",
      options: ["Pitcher Plant", "Venus Flytrap", "Sundew", "Cactus"],
      correctAnswerIndex: 1,
      explanation: "This is a Venus Flytrap, a carnivorous plant.",
      articleTitle: "Venus Flytrap",
      articleBody: "The Venus flytrap is a carnivorous plant native to subtropical wetlands on the East Coast of the United States. It catches its prey—chiefly insects and arachnids.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Venus_Flytrap_showing_trigger_hairs.jpg/640px-Venus_Flytrap_showing_trigger_hairs.jpg"
    },
    {
      subject: "Bamboo",
      questionText: "Identify this plant.",
      options: ["Sugarcane", "Bamboo", "Reed", "Palm"],
      correctAnswerIndex: 1,
      explanation: "This is Bamboo, the fastest growing plant in the world.",
      articleTitle: "Bamboo",
      articleBody: "Bamboos are a diverse group of evergreen perennial flowering plants in the subfamily Bambusoideae of the grass family Poaceae.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Bamboo_Kyoto.jpg/640px-Bamboo_Kyoto.jpg"
    },
    {
      subject: "Cactus",
      questionText: "What type of plant is this?",
      options: ["Cactus", "Aloe Vera", "Agave", "Succulent"],
      correctAnswerIndex: 0,
      explanation: "This is a Cactus, adapted to hot, dry climates.",
      articleTitle: "Cactaceae",
      articleBody: "A cactus is a member of the plant family Cactaceae. Most cacti live in habitats subject to at least some drought. Many live in extremely dry environments.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Barrel_cactus_with_flower.jpg/640px-Barrel_cactus_with_flower.jpg"
    },
    {
      subject: "Lotus Flower",
      questionText: "Identify this flower.",
      options: ["Water Lily", "Lotus", "Hibiscus", "Orchid"],
      correctAnswerIndex: 1,
      explanation: "This is a Lotus flower, a symbol of purity.",
      articleTitle: "Nelumbo nucifera",
      articleBody: "Nelumbo nucifera, also known as the sacred lotus, is a species of aquatic plant. It is a sacred flower in both Hinduism and Buddhism.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Lotus_flower_%28978659%29.jpg/640px-Lotus_flower_%28978659%29.jpg"
    },
    {
      subject: "Fern",
      questionText: "What is this plant?",
      options: ["Moss", "Fern", "Palm", "Pine"],
      correctAnswerIndex: 1,
      explanation: "This is a Fern, a flowerless plant that reproduces via spores.",
      articleTitle: "Ferns",
      articleBody: "A fern is a member of a group of vascular plants that reproduce via spores and have neither seeds nor flowers. They differ from mosses by being vascular.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Athyrium_filix-femina.jpg/640px-Athyrium_filix-femina.jpg"
    },
    {
      subject: "Moss",
      questionText: "Identify this plant type.",
      options: ["Lichen", "Algae", "Moss", "Grass"],
      correctAnswerIndex: 2,
      explanation: "This is Moss, a non-vascular plant commonly found in damp areas.",
      articleTitle: "Moss",
      articleBody: "Mosses are small, non-vascular flowerless plants in the taxonomic division Bryophyta. They do not have true roots, stems, or leaves.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Moss_macro.jpg/640px-Moss_macro.jpg"
    },
    {
      subject: "Oak Tree",
      questionText: "Identify this tree.",
      options: ["Maple", "Pine", "Oak", "Birch"],
      correctAnswerIndex: 2,
      explanation: "This is an Oak tree, known for its acorns and lobed leaves.",
      articleTitle: "Oak",
      articleBody: "An oak is a tree or shrub in the genus Quercus. The fruit is a nut called an acorn, sitting in a cup-like structure known as a cupule.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Quercus_robur.jpg/640px-Quercus_robur.jpg"
    },
    {
      subject: "Rose",
      questionText: "Identify this flower.",
      options: ["Tulip", "Rose", "Peony", "Carnation"],
      correctAnswerIndex: 1,
      explanation: "This is a Rose, a woody perennial flowering plant.",
      articleTitle: "Rose",
      articleBody: "A rose is a woody perennial flowering plant of the genus Rosa, in the family Rosaceae, or the flower it bears. There are over three hundred species.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Rosa_rubiginosa_1.jpg/640px-Rosa_rubiginosa_1.jpg"
    },
    {
      subject: "Lavender Field",
      questionText: "What is this herb?",
      options: ["Rosemary", "Mint", "Lavender", "Sage"],
      correctAnswerIndex: 2,
      explanation: "This is Lavender, known for its purple color and fragrance.",
      articleTitle: "Lavandula",
      articleBody: "Lavandula (common name lavender) is a genus of 47 known species of flowering plants in the mint family, Lamiaceae.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Lavandula_angustifolia_002.jpg/640px-Lavandula_angustifolia_002.jpg"
    },
    {
      subject: "Tulip",
      questionText: "Identify this flower.",
      options: ["Rose", "Tulip", "Lily", "Iris"],
      correctAnswerIndex: 1,
      explanation: "This is a Tulip.",
      articleTitle: "Tulip",
      articleBody: "Tulips are a genus of spring-blooming perennial herbaceous bulbiferous geophytes. They are known for their bright colors.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Tulip_St_Pancras.jpg/640px-Tulip_St_Pancras.jpg"
    },
    {
      subject: "Orchid",
      questionText: "What flower is this?",
      options: ["Lily", "Rose", "Orchid", "Daisy"],
      correctAnswerIndex: 2,
      explanation: "This is an Orchid.",
      articleTitle: "Orchidaceae",
      articleBody: "The Orchidaceae are a diverse and widespread family of flowering plants, with blooms that are often colourful and fragrant.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Orchid_high_resolution.jpg/640px-Orchid_high_resolution.jpg"
    },
    {
      subject: "Daisy",
      questionText: "Identify this flower.",
      options: ["Sunflower", "Daisy", "Dandelion", "Buttercup"],
      correctAnswerIndex: 1,
      explanation: "This is a Daisy.",
      articleTitle: "Bellis perennis",
      articleBody: "Bellis perennis is a common European species of daisy, of the family Asteraceae, often considered the archetypal species of that name.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Bellis_perennis_white_%28aka%29.jpg/640px-Bellis_perennis_white_%28aka%29.jpg"
    },
    {
      subject: "Dandelion",
      questionText: "What is this common plant?",
      options: ["Dandelion", "Thistle", "Clover", "Nettle"],
      correctAnswerIndex: 0,
      explanation: "This is a Dandelion.",
      articleTitle: "Taraxacum",
      articleBody: "Taraxacum is a large genus of flowering plants in the family Asteraceae, which consists of species commonly known as dandelions.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Taraxacum_officinale_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-135.jpg/640px-Taraxacum_officinale_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-135.jpg"
    }
  ],
  [Category.FLAGS]: [
    {
      subject: "Union Jack Flag",
      questionText: "Which country does this flag belong to?",
      options: ["Australia", "New Zealand", "United Kingdom", "USA"],
      correctAnswerIndex: 2,
      explanation: "This is the Union Jack, the flag of the United Kingdom.",
      articleTitle: "Flag of the United Kingdom",
      articleBody: "The national flag of the United Kingdom is the Union Jack, also known as the Union Flag. The design of the Union Jack dates back to the Act of Union 1801.",
      base64Image: "https://upload.wikimedia.org/wikipedia/en/thumb/a/ae/Flag_of_the_United_Kingdom.svg/640px-Flag_of_the_United_Kingdom.svg.png"
    },
    {
      subject: "Flag of Japan",
      questionText: "Identify this flag.",
      options: ["China", "South Korea", "Japan", "Bangladesh"],
      correctAnswerIndex: 2,
      explanation: "This is the flag of Japan, featuring the rising sun.",
      articleTitle: "Flag of Japan",
      articleBody: "The national flag of Japan is a rectangular white banner bearing a crimson-red circle at its center. This flag is officially called Nisshōki ('sun-mark flag').",
      base64Image: "https://upload.wikimedia.org/wikipedia/en/thumb/9/9e/Flag_of_Japan.svg/640px-Flag_of_Japan.svg.png"
    },
    {
      subject: "Flag of Canada",
      questionText: "Which country's flag is this?",
      options: ["USA", "Canada", "Peru", "Austria"],
      correctAnswerIndex: 1,
      explanation: "This is the flag of Canada, featuring a maple leaf.",
      articleTitle: "Flag of Canada",
      articleBody: "The National Flag of Canada, often referred to as the Canadian Flag or the Maple Leaf, consists of a red field with a white square at its centre in the ratio of 1:2:1.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Flag_of_Canada_%28Pantone%29.svg/640px-Flag_of_Canada_%28Pantone%29.svg.png"
    },
    {
      subject: "Flag of United States",
      questionText: "Identify this flag.",
      options: ["Liberia", "Malaysia", "United States", "Puerto Rico"],
      correctAnswerIndex: 2,
      explanation: "This is the flag of the United States, with 50 stars and 13 stripes.",
      articleTitle: "Flag of the United States",
      articleBody: "The national flag of the United States of America consists of thirteen equal horizontal stripes of red alternating with white, with a blue rectangle in the canton bearing fifty small, white, five-pointed stars.",
      base64Image: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a4/Flag_of_the_United_States.svg/640px-Flag_of_the_United_States.svg.png"
    },
    {
      subject: "Flag of Brazil",
      questionText: "Which country does this flag represent?",
      options: ["Argentina", "Brazil", "Colombia", "Portugal"],
      correctAnswerIndex: 1,
      explanation: "This is the flag of Brazil, with its green field and yellow rhombus.",
      articleTitle: "Flag of Brazil",
      articleBody: "The national flag of Brazil is a blue disc depicting a starry sky spaned by a curved band inscribed with the national motto 'Ordem e Progresso', within a yellow rhombus, on a green field.",
      base64Image: "https://upload.wikimedia.org/wikipedia/en/thumb/0/05/Flag_of_Brazil.svg/640px-Flag_of_Brazil.svg.png"
    },
    {
      subject: "Flag of France",
      questionText: "Identify this flag.",
      options: ["Netherlands", "Russia", "France", "Italy"],
      correctAnswerIndex: 2,
      explanation: "This is the French Tricolour (Blue, White, Red).",
      articleTitle: "Flag of France",
      articleBody: "The national flag of France is a tricolour flag featuring three vertical bands coloured blue, white, and red. It is known to English speakers as the French Tricolour.",
      base64Image: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c3/Flag_of_France.svg/640px-Flag_of_France.svg.png"
    },
    {
      subject: "Flag of Switzerland",
      questionText: "Which country's flag is this?",
      options: ["Denmark", "Sweden", "Switzerland", "Norway"],
      correctAnswerIndex: 2,
      explanation: "This is the square flag of Switzerland.",
      articleTitle: "Flag of Switzerland",
      articleBody: "The flag of Switzerland displays a white cross in the centre of a square red field. The white cross is known as the Swiss cross.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Flag_of_Switzerland.svg/640px-Flag_of_Switzerland.svg.png"
    },
    {
      subject: "Flag of India",
      questionText: "Identify this flag.",
      options: ["Ireland", "India", "Niger", "Italy"],
      correctAnswerIndex: 1,
      explanation: "This is the flag of India, with the Ashoka Chakra in the center.",
      articleTitle: "Flag of India",
      articleBody: "The National Flag of India is a horizontal rectangular tricolour of India saffron, white and India green; with the Ashoka Chakra, a 24-spoke wheel, in navy blue at its centre.",
      base64Image: "https://upload.wikimedia.org/wikipedia/en/thumb/4/41/Flag_of_India.svg/640px-Flag_of_India.svg.png"
    },
    {
      subject: "Flag of Australia",
      questionText: "Which country does this flag belong to?",
      options: ["New Zealand", "Australia", "Fiji", "Tuvalu"],
      correctAnswerIndex: 1,
      explanation: "This is the Australian flag, featuring the Southern Cross.",
      articleTitle: "Flag of Australia",
      articleBody: "The flag of Australia is a defaced Blue Ensign: a blue field with the Union Jack in the canton, and a large white seven-pointed star known as the Commonwealth Star... and the Southern Cross constellation.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Flag_of_Australia_%28converted%29.svg/640px-Flag_of_Australia_%28converted%29.svg.png"
    },
    {
      subject: "Flag of South Africa",
      questionText: "Identify this flag.",
      options: ["Kenya", "Zimbabwe", "South Africa", "Mozambique"],
      correctAnswerIndex: 2,
      explanation: "This is the colorful flag of South Africa.",
      articleTitle: "Flag of South Africa",
      articleBody: "The flag of South Africa was designed in March 1994 and adopted on 27 April 1994. It features a horizontal Y-shape in green, with red, white, blue, black and yellow sections.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Flag_of_South_Africa.svg/640px-Flag_of_South_Africa.svg.png"
    },
    {
      subject: "Flag of Germany",
      questionText: "Identify this flag.",
      options: ["Belgium", "Germany", "Netherlands", "France"],
      correctAnswerIndex: 1,
      explanation: "This is the flag of Germany (Black, Red, Gold).",
      articleTitle: "Flag of Germany",
      articleBody: "The flag of Germany is a tricolour consisting of three equal horizontal bands displaying the national colours of Germany: black, red, and gold.",
      base64Image: "https://upload.wikimedia.org/wikipedia/en/thumb/b/ba/Flag_of_Germany.svg/640px-Flag_of_Germany.svg.png"
    },
    {
      subject: "Flag of Italy",
      questionText: "Which country does this flag represent?",
      options: ["Mexico", "Italy", "Ireland", "Hungary"],
      correctAnswerIndex: 1,
      explanation: "This is the flag of Italy (Green, White, Red).",
      articleTitle: "Flag of Italy",
      articleBody: "The flag of Italy is a tricolour featuring three equally sized vertical pales of green, white and red, with the green at the hoist side.",
      base64Image: "https://upload.wikimedia.org/wikipedia/en/thumb/0/03/Flag_of_Italy.svg/640px-Flag_of_Italy.svg.png"
    },
    {
      subject: "Flag of Spain",
      questionText: "Identify this flag.",
      options: ["Portugal", "Spain", "Italy", "Greece"],
      correctAnswerIndex: 1,
      explanation: "This is the flag of Spain.",
      articleTitle: "Flag of Spain",
      articleBody: "The flag of Spain consists of three horizontal stripes: red, yellow and red, the yellow stripe being twice the size of each red stripe.",
      base64Image: "https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/Flag_of_Spain.svg/640px-Flag_of_Spain.svg.png"
    },
    {
      subject: "Flag of China",
      questionText: "Which country's flag is this?",
      options: ["Vietnam", "China", "Japan", "Russia"],
      correctAnswerIndex: 1,
      explanation: "This is the flag of China.",
      articleTitle: "Flag of China",
      articleBody: "The national flag of the People's Republic of China, also known as the Five-starred Red Flag, features a red field with five golden stars.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Flag_of_the_People%27s_Republic_of_China.svg/640px-Flag_of_the_People%27s_Republic_of_China.svg.png"
    },
    {
      subject: "Flag of Argentina",
      questionText: "Identify this flag.",
      options: ["Uruguay", "Argentina", "El Salvador", "Nicaragua"],
      correctAnswerIndex: 1,
      explanation: "This is the flag of Argentina.",
      articleTitle: "Flag of Argentina",
      articleBody: "The national flag of Argentina is a triband, composed of three equally wide horizontal bands coloured light blue and white. It features the Sun of May.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Flag_of_Argentina.svg/640px-Flag_of_Argentina.svg.png"
    }
  ],
  [Category.BIRDS]: [
    {
      subject: "Ostrich",
      questionText: "Identify this bird.",
      options: ["Emu", "Ostrich", "Rhea", "Cassowary"],
      correctAnswerIndex: 1,
      explanation: "This is an Ostrich, the largest living bird.",
      articleTitle: "Ostrich",
      articleBody: "Ostriches are large flightless birds native to Africa. They lay the largest eggs of any living land animal. With the ability to run at 70 km/h, they are the fastest birds on land.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Ostrich_male_RWD.jpg/640px-Ostrich_male_RWD.jpg"
    },
    {
      subject: "Emperor Penguin",
      questionText: "What type of bird is this?",
      options: ["Puffin", "King Penguin", "Emperor Penguin", "Adélie Penguin"],
      correctAnswerIndex: 2,
      explanation: "This is an Emperor Penguin, endemic to Antarctica.",
      articleTitle: "Emperor Penguin",
      articleBody: "The emperor penguin is the tallest and heaviest of all living penguin species and is endemic to Antarctica.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Emperor_Penguin_Manchot_empereur.jpg/640px-Emperor_Penguin_Manchot_empereur.jpg"
    },
    {
      subject: "Hummingbird",
      questionText: "Identify this bird.",
      options: ["Sparrow", "Hummingbird", "Finch", "Kingfisher"],
      correctAnswerIndex: 1,
      explanation: "This is a Hummingbird, known for hovering.",
      articleTitle: "Hummingbird",
      articleBody: "Hummingbirds are birds native to the Americas. They are known for their ability to hover in mid-air by rapidly flapping their wings.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Hummingbird_hovering.jpg/640px-Hummingbird_hovering.jpg"
    },
    {
      subject: "Bald Eagle",
      questionText: "Identify this bird of prey.",
      options: ["Golden Eagle", "Bald Eagle", "Falcon", "Hawk"],
      correctAnswerIndex: 1,
      explanation: "This is a Bald Eagle, the national bird of the USA.",
      articleTitle: "Bald Eagle",
      articleBody: "The bald eagle is a bird of prey found in North America. It is the national bird and national animal of the United States of America.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/About_to_Launch_%2826075320352%29.jpg/640px-About_to_Launch_%2826075320352%29.jpg"
    },
    {
      subject: "Owl",
      questionText: "What is this bird?",
      options: ["Hawk", "Owl", "Falcon", "Vulture"],
      correctAnswerIndex: 1,
      explanation: "This is an Owl, characterized by its large eyes and flat face.",
      articleTitle: "Owl",
      articleBody: "Owls are birds from the order Strigiformes. Most are solitary and nocturnal. They possess large, forward-facing eyes and ear-holes.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Great_Horned_Owl_RWD2.jpg/640px-Great_Horned_Owl_RWD2.jpg"
    },
    {
      subject: "Peacock",
      questionText: "Identify this bird.",
      options: ["Turkey", "Peacock", "Pheasant", "Grouse"],
      correctAnswerIndex: 1,
      explanation: "This is a Peacock, known for its iridescent tail feathers.",
      articleTitle: "Peafowl",
      articleBody: "Peafowl include three species of birds in the genus Pavo. The male peacock is known for his extravagant eye-spotted tail covert feathers.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Peacock_Plumage.jpg/640px-Peacock_Plumage.jpg"
    },
    {
      subject: "Flamingo",
      questionText: "Identify this bird.",
      options: ["Stork", "Crane", "Flamingo", "Heron"],
      correctAnswerIndex: 2,
      explanation: "This is a Flamingo, famous for its pink color.",
      articleTitle: "Flamingo",
      articleBody: "Flamingos are a type of wading bird in the family Phoenicopteridae. The bright pink colour of their feathers comes from the beta-carotene pigments in the organisms they eat.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Caribbean_flamingo.jpg/640px-Caribbean_flamingo.jpg"
    },
    {
      subject: "Toucan",
      questionText: "What bird is this?",
      options: ["Parrot", "Toucan", "Macaw", "Hornbill"],
      correctAnswerIndex: 1,
      explanation: "This is a Toucan, recognized by its large colorful bill.",
      articleTitle: "Toucan",
      articleBody: "Toucans are members of the Neotropical near passerine bird family Ramphastidae. They are brightly marked and have large, often colorful bills.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Ramphastos_toco_-_Walsrode_Bird_Park%2C_Germany_-_2003.jpg/640px-Ramphastos_toco_-_Walsrode_Bird_Park%2C_Germany_-_2003.jpg"
    },
    {
      subject: "Kiwi Bird",
      questionText: "Identify this flightless bird.",
      options: ["Kiwi", "Quail", "Chicken", "Rail"],
      correctAnswerIndex: 0,
      explanation: "This is a Kiwi, native to New Zealand.",
      articleTitle: "Kiwi (bird)",
      articleBody: "Kiwi are flightless birds native to New Zealand, in the genus Apteryx and family Apterygidae. Approximately the size of a domestic chicken.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Kiwi_%28Apteryx_mantelli%29.jpg/640px-Kiwi_%28Apteryx_mantelli%29.jpg"
    },
    {
      subject: "Albatross",
      questionText: "Identify this seabird.",
      options: ["Seagull", "Pelican", "Albatross", "Gannet"],
      correctAnswerIndex: 2,
      explanation: "This is an Albatross, known for its immense wingspan.",
      articleTitle: "Albatross",
      articleBody: "Albatrosses are large seabirds in the family Diomedeidae. They have the longest wingspans of any extant birds, reaching up to 3.7 meters.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Diomedea_exulans_-_SE_Tasmania.jpg/640px-Diomedea_exulans_-_SE_Tasmania.jpg"
    },
    {
      subject: "Puffin",
      questionText: "Identify this seabird.",
      options: ["Puffin", "Penguin", "Murre", "Auk"],
      correctAnswerIndex: 0,
      explanation: "This is a Puffin, distinguished by its colorful beak.",
      articleTitle: "Puffin",
      articleBody: "Puffins are any of three species of small alcids in the bird genus Fratercula. They are pelagic seabirds that feed primarily by diving in the water.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Puffin_%28Fratercula_arctica%29.jpg/640px-Puffin_%28Fratercula_arctica%29.jpg"
    },
    {
      subject: "Macaw",
      questionText: "What bird is this?",
      options: ["Parrot", "Macaw", "Cockatoo", "Lovebird"],
      correctAnswerIndex: 1,
      explanation: "This is a Macaw, a large colorful parrot.",
      articleTitle: "Macaw",
      articleBody: "Macaws are a group of New World parrots that are long-tailed and often colorful.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Blue-and-Yellow-Macaw.jpg/640px-Blue-and-Yellow-Macaw.jpg"
    },
    {
      subject: "Swan",
      questionText: "Identify this water bird.",
      options: ["Goose", "Duck", "Swan", "Crane"],
      correctAnswerIndex: 2,
      explanation: "This is a Swan.",
      articleTitle: "Swan",
      articleBody: "Swans are birds of the family Anatidae within the genus Cygnus. The swans' closest relatives include the geese and ducks.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Cygnus_olor_2.jpg/640px-Cygnus_olor_2.jpg"
    },
    {
      subject: "Kingfisher",
      questionText: "What bird is this?",
      options: ["Kingfisher", "Woodpecker", "Blue Jay", "Hummingbird"],
      correctAnswerIndex: 0,
      explanation: "This is a Kingfisher.",
      articleTitle: "Kingfisher",
      articleBody: "Kingfishers are a family, the Alcedinidae, of small to medium-sized, brightly colored birds in the order Coraciiformes.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Common_Kingfisher_Alcedo_atthis.jpg/640px-Common_Kingfisher_Alcedo_atthis.jpg"
    }
  ],
  [Category.TREES]: [
    {
      subject: "Giant Sequoia",
      questionText: "Identify this massive tree.",
      options: ["Redwood", "Giant Sequoia", "Pine", "Fir"],
      correctAnswerIndex: 1,
      explanation: "This is a Giant Sequoia, the largest tree by volume.",
      articleTitle: "Sequoiadendron giganteum",
      articleBody: "Sequoiadendron giganteum (giant sequoia) is the sole living species in the genus Sequoiadendron. They are the most massive trees on Earth.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Grizzly_Giant_Mariposa_Grove.jpg/640px-Grizzly_Giant_Mariposa_Grove.jpg"
    },
    {
      subject: "Baobab Tree",
      questionText: "Identify this tree.",
      options: ["Acacia", "Baobab", "Banyan", "Palm"],
      correctAnswerIndex: 1,
      explanation: "This is a Baobab, native to Africa and known for its thick trunk.",
      articleTitle: "Adansonia (Baobab)",
      articleBody: "Adansonia is a genus of deciduous trees known as baobabs. They are native to Madagascar, mainland Africa, and Australia. They have swollen trunks.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Adansonia_grandidieri04.jpg/640px-Adansonia_grandidieri04.jpg"
    },
    {
      subject: "Oak Tree",
      questionText: "What type of tree is this?",
      options: ["Maple", "Oak", "Elm", "Ash"],
      correctAnswerIndex: 1,
      explanation: "This is an Oak tree.",
      articleTitle: "Oak",
      articleBody: "An oak is a tree or shrub in the genus Quercus. The fruit is a nut called an acorn.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Keizer_eik.jpg/640px-Keizer_eik.jpg"
    },
    {
      subject: "Cherry Blossom Tree",
      questionText: "Identify this tree in bloom.",
      options: ["Apple", "Cherry Blossom", "Plum", "Peach"],
      correctAnswerIndex: 1,
      explanation: "This is a Cherry Blossom tree (Sakura).",
      articleTitle: "Cherry blossom",
      articleBody: "A cherry blossom is a flower of many trees of genus Prunus. They are known as sakura in Japan.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Cherry_blossoms_at_High_Park_Toronto_2.jpg/640px-Cherry_blossoms_at_High_Park_Toronto_2.jpg"
    },
    {
      subject: "Maple Tree",
      questionText: "Identify this tree.",
      options: ["Oak", "Birch", "Maple", "Sycamore"],
      correctAnswerIndex: 2,
      explanation: "This is a Maple tree, famous for its syrup and leaf shape.",
      articleTitle: "Maple",
      articleBody: "Maple is a genus of trees and shrubs. They are easily distinguished by their palmate leaves and winged fruits.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Acer_pseudoplatanus_002.jpg/640px-Acer_pseudoplatanus_002.jpg"
    },
    {
      subject: "Bonsai Tree",
      questionText: "What art form is this?",
      options: ["Topiary", "Bonsai", "Ikebana", "Terrarium"],
      correctAnswerIndex: 1,
      explanation: "This is a Bonsai, a miniature tree grown in a container.",
      articleTitle: "Bonsai",
      articleBody: "Bonsai is a Japanese art form which utilizes cultivation techniques to produce, in containers, small trees that mimic the shape and scale of full size trees.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Juniperus_chinensis_Shimpaku_Kishu_01.jpg/640px-Juniperus_chinensis_Shimpaku_Kishu_01.jpg"
    },
    {
      subject: "Birch Tree",
      questionText: "Identify this tree.",
      options: ["Aspen", "Birch", "Poplar", "Beech"],
      correctAnswerIndex: 1,
      explanation: "This is a Birch tree, recognized by its white peeling bark.",
      articleTitle: "Birch",
      articleBody: "A birch is a thin-leaved deciduous hardwood tree of the genus Betula. They are typically small to medium-sized trees with papery, white bark.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Betula_pendula_001.jpg/640px-Betula_pendula_001.jpg"
    },
    {
      subject: "Weeping Willow",
      questionText: "Identify this tree.",
      options: ["Weeping Willow", "Oak", "Elm", "Cypress"],
      correctAnswerIndex: 0,
      explanation: "This is a Weeping Willow, with distinctive drooping branches.",
      articleTitle: "Salix babylonica",
      articleBody: "Salix babylonica (Babylon willow or weeping willow) is a species of willow native to dry areas of northern China, but cultivated for millennia.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Salix_babylonica_2.jpg/640px-Salix_babylonica_2.jpg"
    },
    {
      subject: "Pine Tree",
      questionText: "What type of tree is this?",
      options: ["Pine", "Spruce", "Fir", "Cedar"],
      correctAnswerIndex: 0,
      explanation: "This is a Pine tree.",
      articleTitle: "Pine",
      articleBody: "A pine is any conifer in the genus Pinus of the family Pinaceae. Pines are long-lived, typically resinous trees.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Pinus_sylvestris_001.jpg/640px-Pinus_sylvestris_001.jpg"
    },
    {
      subject: "Banyan Tree",
      questionText: "Identify this tree.",
      options: ["Mangrove", "Banyan", "Fig", "Kapok"],
      correctAnswerIndex: 1,
      explanation: "This is a Banyan tree, known for its aerial roots.",
      articleTitle: "Banyan",
      articleBody: "A banyan is a fig that begins its life as an epiphyte. Its aerial roots develop into woody trunks.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Banyan_Tree_Lahaina.jpg/640px-Banyan_Tree_Lahaina.jpg"
    },
    {
      subject: "Redwood Tree",
      questionText: "Identify this tree.",
      options: ["Redwood", "Oak", "Maple", "Palm"],
      correctAnswerIndex: 0,
      explanation: "This is a Coast Redwood, the tallest tree species.",
      articleTitle: "Sequoia sempervirens",
      articleBody: "Sequoia sempervirens is the sole living species of the genus Sequoia in the cypress family Cupressaceae. Common names include coast redwood and California redwood.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Redwood_National_Park%2C_fog_in_the_forest.jpg/640px-Redwood_National_Park%2C_fog_in_the_forest.jpg"
    },
    {
      subject: "Spruce Tree",
      questionText: "What type of tree is this?",
      options: ["Fir", "Spruce", "Pine", "Larch"],
      correctAnswerIndex: 1,
      explanation: "This is a Spruce tree.",
      articleTitle: "Spruce",
      articleBody: "A spruce is a tree of the genus Picea, a genus of about 35 species of coniferous evergreen trees in the family Pinaceae, found in the northern temperate and boreal (taiga) regions of the Earth.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Picea_abies_001.jpg/640px-Picea_abies_001.jpg"
    },
    {
      subject: "Magnolia Tree",
      questionText: "Identify this flowering tree.",
      options: ["Dogwood", "Magnolia", "Cherry", "Apple"],
      correctAnswerIndex: 1,
      explanation: "This is a Magnolia tree.",
      articleTitle: "Magnolia",
      articleBody: "Magnolia is a large genus of about 210 flowering plant species in the subfamily Magnolioideae of the family Magnoliaceae.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Magnolia_soulangeana_01.jpg/640px-Magnolia_soulangeana_01.jpg"
    }
  ],
  [Category.INSECTS]: [
    {
      subject: "Honey Bee",
      questionText: "Identify this insect.",
      options: ["Wasp", "Honey Bee", "Hornet", "Fly"],
      correctAnswerIndex: 1,
      explanation: "This is a Honey Bee, crucial for pollination.",
      articleTitle: "Honey bee",
      articleBody: "A honey bee is a eusocial flying insect within the genus Apis of the bee clade, all native to Eurasia.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Apis_mellifera_Western_honey_bee.jpg/640px-Apis_mellifera_Western_honey_bee.jpg"
    },
    {
      subject: "Monarch Butterfly",
      questionText: "What butterfly is this?",
      options: ["Swallowtail", "Monarch", "Admiral", "Painted Lady"],
      correctAnswerIndex: 1,
      explanation: "This is a Monarch Butterfly, known for its migration.",
      articleTitle: "Monarch butterfly",
      articleBody: "The monarch butterfly is a milkweed butterfly in the family Nymphalidae. It is arguably the most iconic butterfly in North America.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Monarch_In_The_Garden.jpg/640px-Monarch_In_The_Garden.jpg"
    },
    {
      subject: "Ant Insect",
      questionText: "Identify this insect.",
      options: ["Termite", "Ant", "Spider", "Beetle"],
      correctAnswerIndex: 1,
      explanation: "This is an Ant.",
      articleTitle: "Ant",
      articleBody: "Ants are eusocial insects of the family Formicidae. They live in organized colonies.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Ant_receiving_honeydew_from_aphid.jpg/640px-Ant_receiving_honeydew_from_aphid.jpg"
    },
    {
      subject: "Praying Mantis",
      questionText: "What insect is this?",
      options: ["Grasshopper", "Stick Insect", "Praying Mantis", "Cricket"],
      correctAnswerIndex: 2,
      explanation: "This is a Praying Mantis.",
      articleTitle: "Mantis",
      articleBody: "Mantises are an order of insects. They are often called praying mantises because of their typical 'prayer-like' stance.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Praying_Mantis_India.jpg/640px-Praying_Mantis_India.jpg"
    },
    {
      subject: "Ladybug",
      questionText: "Identify this insect.",
      options: ["Beetle", "Ladybug", "Tick", "Bug"],
      correctAnswerIndex: 1,
      explanation: "This is a Ladybug (Ladybird).",
      articleTitle: "Coccinellidae",
      articleBody: "Coccinellidae is a widespread family of small beetles. They are commonly known as ladybugs.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Coccinella_septempunctata.jpg/640px-Coccinella_septempunctata.jpg"
    },
    {
      subject: "Dragonfly",
      questionText: "Identify this insect.",
      options: ["Damselfly", "Dragonfly", "Mosquito", "Mayfly"],
      correctAnswerIndex: 1,
      explanation: "This is a Dragonfly.",
      articleTitle: "Dragonfly",
      articleBody: "A dragonfly is an insect belonging to the order Odonata. Adult dragonflies are characterized by large, multifaceted eyes and two pairs of strong, transparent wings.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Libellula_luctuosa.jpg/640px-Libellula_luctuosa.jpg"
    },
    {
      subject: "Mosquito",
      questionText: "What insect is this?",
      options: ["Fly", "Gnat", "Mosquito", "Flea"],
      correctAnswerIndex: 2,
      explanation: "This is a Mosquito.",
      articleTitle: "Mosquito",
      articleBody: "Mosquitoes are members of a group of almost 3,600 species of small flies. The females of most species consume blood.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Aedes_aegypti.jpg/640px-Aedes_aegypti.jpg"
    },
    {
      subject: "Grasshopper",
      questionText: "Identify this insect.",
      options: ["Cricket", "Grasshopper", "Katydid", "Locust"],
      correctAnswerIndex: 1,
      explanation: "This is a Grasshopper.",
      articleTitle: "Grasshopper",
      articleBody: "Grasshoppers are a group of insects belonging to the suborder Caelifera. They are plant-eaters.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Grasshopper.jpg/640px-Grasshopper.jpg"
    },
    {
      subject: "Firefly",
      questionText: "What insect is this?",
      options: ["Beetle", "Firefly", "Moth", "Fly"],
      correctAnswerIndex: 1,
      explanation: "This is a Firefly, or lightning bug.",
      articleTitle: "Firefly",
      articleBody: "The Lampyridae are a family of insects in the beetle order Coleoptera. They are soft-bodied beetles that are commonly called fireflies.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Photinus_pyralis_Firefly.jpg/640px-Photinus_pyralis_Firefly.jpg"
    },
    {
      subject: "Scarab Beetle",
      questionText: "Identify this beetle.",
      options: ["Dung Beetle", "Stag Beetle", "Scarab Beetle", "Rhino Beetle"],
      correctAnswerIndex: 2,
      explanation: "This is a Scarab Beetle, sacred in ancient Egypt.",
      articleTitle: "Scarabaeus sacer",
      articleBody: "Scarabaeus sacer is a species of dung beetle belonging to the family Scarabaeidae. The species was venerated in ancient Egypt.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Scarabaeus_sacer_01.jpg/640px-Scarabaeus_sacer_01.jpg"
    },
    {
      subject: "Bumblebee",
      questionText: "Identify this insect.",
      options: ["Honey Bee", "Bumblebee", "Wasp", "Hornet"],
      correctAnswerIndex: 1,
      explanation: "This is a Bumblebee, larger and fuzzier than a honey bee.",
      articleTitle: "Bumblebee",
      articleBody: "A bumblebee is any of over 250 species in the genus Bombus. They are social insects that form colonies with a single queen.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Bumblebee_2007-04-19.jpg/640px-Bumblebee_2007-04-19.jpg"
    },
    {
      subject: "Atlas Moth",
      questionText: "What large insect is this?",
      options: ["Butterfly", "Moth", "Dragonfly", "Beetle"],
      correctAnswerIndex: 1,
      explanation: "This is an Atlas Moth.",
      articleTitle: "Attacus atlas",
      articleBody: "Attacus atlas, the Atlas moth, is a large saturniid moth found in the tropical and subtropical forests of Southeast Asia.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Attacus_atlas_qtl1.jpg/640px-Attacus_atlas_qtl1.jpg"
    },
    {
      subject: "Wasp",
      questionText: "Identify this insect.",
      options: ["Bee", "Wasp", "Ant", "Fly"],
      correctAnswerIndex: 1,
      explanation: "This is a Wasp.",
      articleTitle: "Wasp",
      articleBody: "A wasp is any insect of the narrow-waisted suborder Apocrita of the order Hymenoptera which is neither a bee nor an ant.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Vespula_germanica_Richard_Bartz.jpg/640px-Vespula_germanica_Richard_Bartz.jpg"
    },
    {
      subject: "Cicada",
      questionText: "What insect makes a loud sound?",
      options: ["Cricket", "Cicada", "Grasshopper", "Katydid"],
      correctAnswerIndex: 1,
      explanation: "This is a Cicada.",
      articleTitle: "Cicada",
      articleBody: "Cicadas are insects in the superfamily Cicadoidea. They are best known for the songs sung by most, but not all, male cicadas.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Tibicen_linnei.jpg/640px-Tibicen_linnei.jpg"
    }
  ],
  [Category.MUSHROOMS]: [
    {
      subject: "Fly Agaric Mushroom",
      questionText: "Identify this mushroom.",
      options: ["Chantarelle", "Fly Agaric", "Morel", "Oyster"],
      correctAnswerIndex: 1,
      explanation: "This is the Fly Agaric, the classic red toadstool.",
      articleTitle: "Amanita muscaria",
      articleBody: "Amanita muscaria, commonly known as the fly agaric or fly amanita, is a basidiomycete of the genus Amanita. It is also a muscimol mushroom.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Amanita_muscaria_3_vliegenzwammen_op_rij.jpg/640px-Amanita_muscaria_3_vliegenzwammen_op_rij.jpg"
    },
    {
      subject: "Black Truffle",
      questionText: "What is this fungus?",
      options: ["Potato", "Truffle", "Puffball", "Rock"],
      correctAnswerIndex: 1,
      explanation: "This is a Truffle, a prized culinary delicacy.",
      articleTitle: "Truffle",
      articleBody: "A truffle is the fruiting body of a subterranean ascomycete fungus. Truffles are highly prized as food.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Tuber_melanosporum.jpg/640px-Tuber_melanosporum.jpg"
    },
    {
      subject: "Oyster Mushroom",
      questionText: "Identify this mushroom.",
      options: ["Shiitake", "Button", "Oyster Mushroom", "Enoki"],
      correctAnswerIndex: 2,
      explanation: "This is an Oyster Mushroom.",
      articleTitle: "Pleurotus ostreatus",
      articleBody: "Pleurotus ostreatus, the oyster mushroom, is a common edible mushroom. It was first cultivated in Germany.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Pleurotus_ostreatus_-_Pleurote_en_hu%C3%AEtre.jpg/640px-Pleurotus_ostreatus_-_Pleurote_en_hu%C3%AEtre.jpg"
    },
    {
      subject: "Food Mold",
      questionText: "What is growing on this food?",
      options: ["Moss", "Mold", "Yeast", "Bacteria"],
      correctAnswerIndex: 1,
      explanation: "This is Mold (Penicillium).",
      articleTitle: "Mold",
      articleBody: "A mold is a fungus that grows in the form of multicellular filaments called hyphae.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Mold_on_bread.jpg/640px-Mold_on_bread.jpg"
    },
    {
      subject: "Shiitake Mushroom",
      questionText: "Identify this mushroom.",
      options: ["Shiitake", "Portobello", "Button", "Cremini"],
      correctAnswerIndex: 0,
      explanation: "This is a Shiitake mushroom.",
      articleTitle: "Shiitake",
      articleBody: "The shiitake is an edible mushroom native to East Asia, which is cultivated and consumed in many Asian countries.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Lentinula_edodes.jpg/640px-Lentinula_edodes.jpg"
    },
    {
      subject: "Enoki Mushroom",
      questionText: "Identify these mushrooms.",
      options: ["Oyster", "Enoki", "Beech", "Button"],
      correctAnswerIndex: 1,
      explanation: "These are Enoki mushrooms, known for their long stems.",
      articleTitle: "Enokitake",
      articleBody: "Enokitake is a mushroom well known for its role in Japanese cuisine. Cultivated forms have long, thin white stems.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Flammulina_velutipes.jpg/640px-Flammulina_velutipes.jpg"
    },
    {
      subject: "Puffball Mushroom",
      questionText: "What is this fungus?",
      options: ["Truffle", "Puffball", "Morel", "Agaric"],
      correctAnswerIndex: 1,
      explanation: "This is a Puffball mushroom.",
      articleTitle: "Puffball",
      articleBody: "A puffball is a member of any of several groups of fungi in the division Basidiomycota. The puffballs were previously treated as a taxonomic group.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Lycoperdon_perlatum.jpg/640px-Lycoperdon_perlatum.jpg"
    },
    {
      subject: "Morel Mushroom",
      questionText: "Identify this mushroom.",
      options: ["Chantarelle", "Morel", "Truffle", "Porcini"],
      correctAnswerIndex: 1,
      explanation: "This is a Morel mushroom, with a honeycomb cap.",
      articleTitle: "Morchella",
      articleBody: "Morchella, the true morels, is a genus of edible sac fungi closely related to anatomically simpler cup fungi.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Morchella_esculenta.jpg/640px-Morchella_esculenta.jpg"
    },
    {
      subject: "Chantarelle Mushroom",
      questionText: "Identify this mushroom.",
      options: ["Oyster", "Chantarelle", "Shiitake", "Lion's Mane"],
      correctAnswerIndex: 1,
      explanation: "This is a Chantarelle mushroom.",
      articleTitle: "Chanterelle",
      articleBody: "Chanterelle is the common name of several species of fungi. They are typically orange, yellow or white, fleshy and funnel-shaped.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Chanterelle_Cantharellus_cibarius.jpg/640px-Chanterelle_Cantharellus_cibarius.jpg"
    },
    {
      subject: "Lion's Mane Mushroom",
      questionText: "What weird mushroom is this?",
      options: ["Oyster", "Lion's Mane", "Puffball", "Enoki"],
      correctAnswerIndex: 1,
      explanation: "This is Lion's Mane mushroom.",
      articleTitle: "Hericium erinaceus",
      articleBody: "Hericium erinaceus is an edible mushroom and medicinal mushroom in the tooth fungus group. It can be identified by its long spines.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Hericium_erinaceus_1.jpg/640px-Hericium_erinaceus_1.jpg"
    },
    {
      subject: "Porcini Mushroom",
      questionText: "Identify this mushroom.",
      options: ["Porcini", "Morel", "Chantarelle", "Shiitake"],
      correctAnswerIndex: 0,
      explanation: "This is a Porcini mushroom (Boletus edulis).",
      articleTitle: "Boletus edulis",
      articleBody: "Boletus edulis, commonly known as penny bun or porcini, is a basidiomycete fungus, and the type species of the genus Boletus.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Boletus_edulis_EtgHolzmoos.jpg/640px-Boletus_edulis_EtgHolzmoos.jpg"
    },
    {
      subject: "Death Cap",
      questionText: "Warning: What is this poisonous mushroom?",
      options: ["Button", "Death Cap", "Puffball", "Morel"],
      correctAnswerIndex: 1,
      explanation: "This is the Death Cap, highly poisonous.",
      articleTitle: "Amanita phalloides",
      articleBody: "Amanita phalloides, commonly known as the death cap, is one of the most poisonous of all known mushrooms.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Amanita_phalloides_1.JPG/640px-Amanita_phalloides_1.JPG"
    },
    {
      subject: "Turkey Tail",
      questionText: "Identify this fungus.",
      options: ["Turkey Tail", "Chicken of the Woods", "Oyster", "Reishi"],
      correctAnswerIndex: 0,
      explanation: "This is Turkey Tail fungus.",
      articleTitle: "Trametes versicolor",
      articleBody: "Trametes versicolor – also known as Coriolus versicolor and Polyporus versicolor – is a common polypore mushroom found throughout the world.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Trametes_versicolor_G4.jpg/640px-Trametes_versicolor_G4.jpg"
    }
  ],
  [Category.ARCHITECTURE]: [
    {
      subject: "Parthenon",
      questionText: "Identify this ancient structure.",
      options: ["Colosseum", "Pantheon", "Parthenon", "Acropolis"],
      correctAnswerIndex: 2,
      explanation: "This is the Parthenon in Athens.",
      articleTitle: "Parthenon",
      articleBody: "The Parthenon is a former temple on the Athenian Acropolis, Greece, dedicated to the goddess Athena.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/The_Parthenon_in_Athens.jpg/640px-The_Parthenon_in_Athens.jpg"
    },
    {
      subject: "Eiffel Tower",
      questionText: "Identify this landmark.",
      options: ["Tokyo Tower", "Eiffel Tower", "Blackpool Tower", "CN Tower"],
      correctAnswerIndex: 1,
      explanation: "This is the Eiffel Tower in Paris.",
      articleTitle: "Eiffel Tower",
      articleBody: "The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg/640px-Tour_Eiffel_Wikimedia_Commons.jpg"
    },
    {
      subject: "Taj Mahal",
      questionText: "Identify this building.",
      options: ["Red Fort", "Humayun's Tomb", "Taj Mahal", "Lotus Temple"],
      correctAnswerIndex: 2,
      explanation: "This is the Taj Mahal in India.",
      articleTitle: "Taj Mahal",
      articleBody: "The Taj Mahal is an ivory-white marble mausoleum on the right bank of the river Yamuna in Agra, India.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Taj-Mahal.jpg/640px-Taj-Mahal.jpg"
    },
    {
      subject: "Colosseum",
      questionText: "Identify this ancient arena.",
      options: ["Parthenon", "Colosseum", "Pantheon", "Forum"],
      correctAnswerIndex: 1,
      explanation: "This is the Colosseum in Rome.",
      articleTitle: "Colosseum",
      articleBody: "The Colosseum is an oval amphitheatre in the centre of the city of Rome, Italy. It is the largest ancient amphitheatre ever built.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/640px-Colosseo_2020.jpg"
    },
    {
      subject: "Great Wall of China",
      questionText: "What is this structure?",
      options: ["Hadrian's Wall", "Berlin Wall", "Great Wall of China", "Western Wall"],
      correctAnswerIndex: 2,
      explanation: "This is the Great Wall of China.",
      articleTitle: "Great Wall of China",
      articleBody: "The Great Wall of China is a series of fortifications that were built across the historical northern borders of ancient Chinese states.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/The_Great_Wall_of_China_at_Jinshanling-edit.jpg/640px-The_Great_Wall_of_China_at_Jinshanling-edit.jpg"
    },
    {
      subject: "Pyramids of Giza",
      questionText: "Identify these structures.",
      options: ["Mayan Pyramids", "Pyramids of Giza", "Ziggurats", "Nubian Pyramids"],
      correctAnswerIndex: 1,
      explanation: "These are the Pyramids of Giza.",
      articleTitle: "Egyptian pyramids",
      articleBody: "The Egyptian pyramids are ancient masonry structures located in Egypt. Most were built as tombs for the country's pharaohs.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/All_Gizah_Pyramids.jpg/640px-All_Gizah_Pyramids.jpg"
    },
    {
      subject: "Sydney Opera House",
      questionText: "Identify this building.",
      options: ["Guggenheim", "Sydney Opera House", "Lotus Temple", "Walt Disney Concert Hall"],
      correctAnswerIndex: 1,
      explanation: "This is the Sydney Opera House.",
      articleTitle: "Sydney Opera House",
      articleBody: "The Sydney Opera House is a multi-venue performing arts centre at Sydney Harbour in Sydney, Australia.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Sydney_Opera_House_Sails.jpg/640px-Sydney_Opera_House_Sails.jpg"
    },
    {
      subject: "Statue of Liberty",
      questionText: "Identify this monument.",
      options: ["Christ the Redeemer", "Statue of Liberty", "The Motherland Calls", "Colossus of Rhodes"],
      correctAnswerIndex: 1,
      explanation: "This is the Statue of Liberty.",
      articleTitle: "Statue of Liberty",
      articleBody: "The Statue of Liberty is a colossal neoclassical sculpture on Liberty Island in New York Harbor within New York City.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Statue_of_Liberty_7.jpg/640px-Statue_of_Liberty_7.jpg"
    },
    {
      subject: "Burj Khalifa",
      questionText: "Identify this skyscraper.",
      options: ["Empire State Building", "Shanghai Tower", "Burj Khalifa", "Taipei 101"],
      correctAnswerIndex: 2,
      explanation: "This is the Burj Khalifa, the world's tallest building.",
      articleTitle: "Burj Khalifa",
      articleBody: "The Burj Khalifa is a skyscraper in Dubai, United Arab Emirates. It has been the tallest structure and building in the world since 2009.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Burj_Khalifa.jpg/640px-Burj_Khalifa.jpg"
    },
    {
      subject: "Machu Picchu",
      questionText: "Identify this ancient site.",
      options: ["Chichen Itza", "Petra", "Machu Picchu", "Tikal"],
      correctAnswerIndex: 2,
      explanation: "This is Machu Picchu in Peru.",
      articleTitle: "Machu Picchu",
      articleBody: "Machu Picchu is a 15th-century Inca citadel, located in the Eastern Cordillera of southern Peru.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Machu_Picchu%2C_Peru.jpg/640px-Machu_Picchu%2C_Peru.jpg"
    },
    {
      subject: "Stonehenge",
      questionText: "What is this prehistoric monument?",
      options: ["Newgrange", "Stonehenge", "Avebury", "Carnac"],
      correctAnswerIndex: 1,
      explanation: "This is Stonehenge in England.",
      articleTitle: "Stonehenge",
      articleBody: "Stonehenge is a prehistoric monument in Wiltshire, England. It consists of a ring of standing stones, each around 13 feet high.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Stonehenge2007_07_30.jpg/640px-Stonehenge2007_07_30.jpg"
    },
    {
      subject: "Leaning Tower of Pisa",
      questionText: "Identify this tower.",
      options: ["Tower of London", "Eiffel Tower", "Leaning Tower of Pisa", "Galata Tower"],
      correctAnswerIndex: 2,
      explanation: "This is the Leaning Tower of Pisa.",
      articleTitle: "Leaning Tower of Pisa",
      articleBody: "The Leaning Tower of Pisa is the campanile, or freestanding bell tower, of the cathedral of the Italian city of Pisa, known worldwide for its nearly four-degree lean.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/The_Leaning_Tower_of_Pisa_SB.jpeg/640px-The_Leaning_Tower_of_Pisa_SB.jpeg"
    },
    {
      subject: "Golden Gate Bridge",
      questionText: "Identify this bridge.",
      options: ["Brooklyn Bridge", "Golden Gate Bridge", "Tower Bridge", "Sydney Harbour Bridge"],
      correctAnswerIndex: 1,
      explanation: "This is the Golden Gate Bridge in San Francisco.",
      articleTitle: "Golden Gate Bridge",
      articleBody: "The Golden Gate Bridge is a suspension bridge spanning the Golden Gate, the one-mile-wide strait connecting San Francisco Bay and the Pacific Ocean.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/GoldenGateBridge-001.jpg/640px-GoldenGateBridge-001.jpg"
    },
    {
      subject: "Petra",
      questionText: "Identify this ancient city.",
      options: ["Petra", "Palmyra", "Baalbek", "Jerash"],
      correctAnswerIndex: 0,
      explanation: "This is Al-Khazneh in Petra, Jordan.",
      articleTitle: "Petra",
      articleBody: "Petra is a historical and archaeological city in southern Jordan. It is famous for its rock-cut architecture and water conduit system.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Treasury_petra_cropped.jpeg/640px-Treasury_petra_cropped.jpeg"
    }
  ],
  [Category.INVENTIONS]: [
    {
      subject: "Light Bulb",
      questionText: "Identify this invention.",
      options: ["Vacuum Tube", "Light Bulb", "LED", "Candle"],
      correctAnswerIndex: 1,
      explanation: "This is an incandescent Light Bulb.",
      articleTitle: "Incandescent Light Bulb",
      articleBody: "An incandescent light bulb is an electric light with a wire filament heated until it glows.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Gluehlampe_01_KMJ.jpg/640px-Gluehlampe_01_KMJ.jpg"
    },
    {
      subject: "Antique Telephone",
      questionText: "What is this device?",
      options: ["Telegraph", "Telephone", "Radio", "Phonograph"],
      correctAnswerIndex: 1,
      explanation: "This is an early Telephone.",
      articleTitle: "Telephone",
      articleBody: "A telephone is a telecommunications device that permits two or more users to conduct a conversation when they are too far apart.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ericsson_skeleton_type_1892.jpg/640px-Ericsson_skeleton_type_1892.jpg"
    },
    {
      subject: "Wright Flyer Airplane",
      questionText: "Identify this machine.",
      options: ["Glider", "Airplane", "Kite", "Drone"],
      correctAnswerIndex: 1,
      explanation: "This is the Wright Brothers' Airplane.",
      articleTitle: "Wright brothers",
      articleBody: "The Wright brothers were two American aviation pioneers generally credited with inventing, building, and flying the world's first successful motor-operated airplane.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Wright_Flyer_moved_to_its_new_location.jpg/640px-Wright_Flyer_moved_to_its_new_location.jpg"
    },
    {
      subject: "Printing Press",
      questionText: "Identify this machine.",
      options: ["Loom", "Printing Press", "Cotton Gin", "Steam Engine"],
      correctAnswerIndex: 1,
      explanation: "This is a Printing Press.",
      articleTitle: "Printing press",
      articleBody: "A printing press is a mechanical device for applying pressure to an inked surface resting upon a print medium (such as paper or cloth).",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Hand_press.jpg/640px-Hand_press.jpg"
    },
    {
      subject: "Wooden Wheel",
      questionText: "What is this object?",
      options: ["Gear", "Wheel", "Pulley", "Shield"],
      correctAnswerIndex: 1,
      explanation: "This is a Wheel.",
      articleTitle: "Wheel",
      articleBody: "The wheel is a circular component that is intended to rotate on an axle bearing.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Wooden_cart_wheel.jpg/640px-Wooden_cart_wheel.jpg"
    },
    {
      subject: "Antique Compass",
      questionText: "Identify this tool.",
      options: ["Clock", "Compass", "Astrolabe", "Barometer"],
      correctAnswerIndex: 1,
      explanation: "This is a Compass.",
      articleTitle: "Compass",
      articleBody: "A compass is a device that shows the cardinal directions used for navigation and geographic orientation.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Compass_Card.jpg/640px-Compass_Card.jpg"
    },
    {
      subject: "Steam Engine",
      questionText: "Identify this engine.",
      options: ["Combustion Engine", "Steam Engine", "Electric Motor", "Turbine"],
      correctAnswerIndex: 1,
      explanation: "This is a Steam Engine.",
      articleTitle: "Watt steam engine",
      articleBody: "The Watt steam engine was an early steam engine and was one of the driving forces of the Industrial Revolution.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/SwanningtonEngine01.jpg/640px-SwanningtonEngine01.jpg"
    },
    {
      subject: "Antique Computer",
      questionText: "What is this machine?",
      options: ["Typewriter", "Computer", "Calculator", "Television"],
      correctAnswerIndex: 1,
      explanation: "This is an early Computer.",
      articleTitle: "Computer",
      articleBody: "A computer is a machine that can be instructed to carry out sequences of arithmetic or logical operations automatically via computer programming.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Eniac.jpg/640px-Eniac.jpg"
    },
    {
      subject: "Antique Microscope",
      questionText: "Identify this instrument.",
      options: ["Telescope", "Microscope", "Periscope", "Kaleidoscope"],
      correctAnswerIndex: 1,
      explanation: "This is a Microscope.",
      articleTitle: "Microscope",
      articleBody: "A microscope is a laboratory instrument used to examine objects that are too small to be seen by the naked eye.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Microscope-compound-opt-18th-century.jpg/640px-Microscope-compound-opt-18th-century.jpg"
    },
    {
      subject: "Electronic Transistor",
      questionText: "Identify this component.",
      options: ["Resistor", "Transistor", "Capacitor", "Diode"],
      correctAnswerIndex: 1,
      explanation: "This is a Transistor.",
      articleTitle: "Transistor",
      articleBody: "A transistor is a semiconductor device used to amplify or switch electrical signals and power.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Transistor_photo.jpg/640px-Transistor_photo.jpg"
    },
    {
      subject: "Television",
      questionText: "What invention is this?",
      options: ["Radio", "Television", "Computer", "Microwave"],
      correctAnswerIndex: 1,
      explanation: "This is an early Television set.",
      articleTitle: "Television",
      articleBody: "Television is a telecommunication medium used for transmitting moving images in monochrome (black and white), or in color, and in two or three dimensions and sound.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/1950s_television.jpg/640px-1950s_television.jpg"
    },
    {
      subject: "Camera",
      questionText: "Identify this device.",
      options: ["Projector", "Camera", "Telescope", "Binoculars"],
      correctAnswerIndex: 1,
      explanation: "This is a Camera.",
      articleTitle: "Camera",
      articleBody: "A camera is an optical instrument to capture the visual image.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Leica_I_Mod_A_Anastigmat.jpg/640px-Leica_I_Mod_A_Anastigmat.jpg"
    },
    {
      subject: "Model T Ford",
      questionText: "What is this vehicle?",
      options: ["Model T", "Beetle", "Mini", "Mustang"],
      correctAnswerIndex: 0,
      explanation: "This is the Ford Model T.",
      articleTitle: "Ford Model T",
      articleBody: "The Ford Model T is an automobile that was produced by Ford Motor Company from October 1, 1908, to May 26, 1927.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/1910_Ford_Model_T_Touring.JPG/640px-1910_Ford_Model_T_Touring.JPG"
    }
  ],
  [Category.ARTS]: [
    {
      subject: "Mona Lisa",
      questionText: "Identify this painting.",
      options: ["Girl with a Pearl Earring", "The Last Supper", "Mona Lisa", "The Birth of Venus"],
      correctAnswerIndex: 2,
      explanation: "This is the Mona Lisa by Leonardo da Vinci.",
      articleTitle: "Mona Lisa",
      articleBody: "The Mona Lisa is a half-length portrait painting by Italian artist Leonardo da Vinci.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/640px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg"
    },
    {
      subject: "The Starry Night",
      questionText: "Identify this painting.",
      options: ["Sunflowers", "The Starry Night", "The Scream", "Water Lilies"],
      correctAnswerIndex: 1,
      explanation: "This is The Starry Night by Vincent van Gogh.",
      articleTitle: "The Starry Night",
      articleBody: "The Starry Night is an oil on canvas by the Dutch Post-Impressionist painter Vincent van Gogh.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/640px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg"
    },
    {
      subject: "The Scream Painting",
      questionText: "Identify this painting.",
      options: ["The Scream", "The Kiss", "American Gothic", "Guernica"],
      correctAnswerIndex: 0,
      explanation: "This is The Scream by Edvard Munch.",
      articleTitle: "The Scream",
      articleBody: "The Scream is the popular name given to a composition created by Norwegian Expressionist artist Edvard Munch in 1893.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73.5_cm%2C_National_Gallery_of_Norway.jpg/640px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73.5_cm%2C_National_Gallery_of_Norway.jpg"
    },
    {
      subject: "The Thinker Statue",
      questionText: "Identify this sculpture.",
      options: ["David", "The Thinker", "Venus de Milo", "Discobolus"],
      correctAnswerIndex: 1,
      explanation: "This is The Thinker by Auguste Rodin.",
      articleTitle: "The Thinker",
      articleBody: "The Thinker is a bronze sculpture by Auguste Rodin, usually placed on a stone pedestal.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/The_Thinker_Rodin_Cropped.jpg/640px-The_Thinker_Rodin_Cropped.jpg"
    },
    {
      subject: "William Shakespeare Portrait",
      questionText: "Who is this person?",
      options: ["Charles Dickens", "William Shakespeare", "Mark Twain", "Homer"],
      correctAnswerIndex: 1,
      explanation: "This is William Shakespeare.",
      articleTitle: "William Shakespeare",
      articleBody: "William Shakespeare was an English playwright, poet, and actor, widely regarded as the greatest writer in the English language.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Shakespeare.jpg/640px-Shakespeare.jpg"
    },
    {
      subject: "Ludwig van Beethoven",
      questionText: "Who is this composer?",
      options: ["Mozart", "Bach", "Beethoven", "Chopin"],
      correctAnswerIndex: 2,
      explanation: "This is Ludwig van Beethoven.",
      articleTitle: "Ludwig van Beethoven",
      articleBody: "Ludwig van Beethoven was a German composer and pianist. He remains one of the most admired composers in the history of Western music.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Beethoven.jpg/640px-Beethoven.jpg"
    },
    {
      subject: "Origami Crane",
      questionText: "What art form is this?",
      options: ["Kirigami", "Origami", "Calligraphy", "Ikebana"],
      correctAnswerIndex: 1,
      explanation: "This is Origami, the art of paper folding.",
      articleTitle: "Origami",
      articleBody: "Origami is the art of paper folding, which is often associated with Japanese culture.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Origami_Crane.jpg/640px-Origami_Crane.jpg"
    },
    {
      subject: "Ballet Dancer",
      questionText: "What dance style is this?",
      options: ["Tap", "Jazz", "Ballet", "Salsa"],
      correctAnswerIndex: 2,
      explanation: "This is Ballet.",
      articleTitle: "Ballet",
      articleBody: "Ballet is a type of performance dance that originated during the Italian Renaissance in the fifteenth century.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Swan_Lake_choreography.jpg/640px-Swan_Lake_choreography.jpg"
    },
    {
      subject: "Romeo and Juliet Painting",
      questionText: "Identify this play.",
      options: ["Hamlet", "Romeo and Juliet", "Macbeth", "Othello"],
      correctAnswerIndex: 1,
      explanation: "This depicts Romeo and Juliet.",
      articleTitle: "Romeo and Juliet",
      articleBody: "Romeo and Juliet is a tragedy written by William Shakespeare about two young Italian star-crossed lovers.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Romeo_and_juliet_brown.jpg/640px-Romeo_and_juliet_brown.jpg"
    },
    {
      subject: "The Great Wave off Kanagawa",
      questionText: "Identify this artwork.",
      options: ["Mount Fuji", "The Great Wave", "Red Sun", "Cherry Blossom"],
      correctAnswerIndex: 1,
      explanation: "This is The Great Wave off Kanagawa by Hokusai.",
      articleTitle: "The Great Wave off Kanagawa",
      articleBody: "The Great Wave off Kanagawa is a woodblock print by the Japanese ukiyo-e artist Hokusai.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Great_Wave_off_Kanagawa2.jpg/640px-Great_Wave_off_Kanagawa2.jpg"
    },
    {
      subject: "Girl with a Pearl Earring",
      questionText: "Identify this painting.",
      options: ["Mona Lisa", "Girl with a Pearl Earring", "The Milkmaid", "Portrait of Adele Bloch-Bauer I"],
      correctAnswerIndex: 1,
      explanation: "This is Girl with a Pearl Earring by Vermeer.",
      articleTitle: "Girl with a Pearl Earring",
      articleBody: "Girl with a Pearl Earring is an oil painting by Dutch Golden Age painter Johannes Vermeer, dated c. 1665.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/640px-1665_Girl_with_a_Pearl_Earring.jpg"
    },
    {
      subject: "The Last Supper",
      questionText: "Identify this mural.",
      options: ["Creation of Adam", "The Last Supper", "School of Athens", "Last Judgment"],
      correctAnswerIndex: 1,
      explanation: "This is The Last Supper by Leonardo da Vinci.",
      articleTitle: "The Last Supper",
      articleBody: "The Last Supper is a late 15th-century mural painting by Italian artist Leonardo da Vinci housed by the refectory of the Convent of Santa Maria delle Grazie in Milan.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/%C3%9Altima_Cena_-_Da_Vinci_5.jpg/640px-%C3%9Altima_Cena_-_Da_Vinci_5.jpg"
    },
    {
      subject: "The Birth of Venus",
      questionText: "Identify this painting.",
      options: ["Primavera", "The Birth of Venus", "Venus of Urbino", "Olympia"],
      correctAnswerIndex: 1,
      explanation: "This is The Birth of Venus by Botticelli.",
      articleTitle: "The Birth of Venus",
      articleBody: "The Birth of Venus is a painting by the Italian artist Sandro Botticelli, probably made in the mid 1480s.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg/640px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg"
    },
    {
      subject: "David Statue",
      questionText: "Identify this sculpture.",
      options: ["David", "Moses", "Pieta", "Apollo"],
      correctAnswerIndex: 0,
      explanation: "This is David by Michelangelo.",
      articleTitle: "David (Michelangelo)",
      articleBody: "David is a masterpiece of Renaissance sculpture, created in marble between 1501 and 1504 by the Italian artist Michelangelo.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/David_von_Michelangelo.jpg/640px-David_von_Michelangelo.jpg"
    }
  ],
  [Category.GEOGRAPHY]: [
    {
      subject: "Mount Everest",
      questionText: "Identify this mountain.",
      options: ["K2", "Kilimanjaro", "Mount Everest", "Fuji"],
      correctAnswerIndex: 2,
      explanation: "This is Mount Everest, the highest mountain on Earth.",
      articleTitle: "Mount Everest",
      articleBody: "Mount Everest is Earth's highest mountain above sea level, located in the Mahalangur Himal sub-range of the Himalayas.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Mount_Everest_as_seen_from_Drukair2_PLW_edit.jpg/640px-Mount_Everest_as_seen_from_Drukair2_PLW_edit.jpg"
    },
    {
      subject: "Amazon River",
      questionText: "Identify this river.",
      options: ["Nile", "Amazon", "Mississippi", "Danube"],
      correctAnswerIndex: 1,
      explanation: "This is the Amazon River.",
      articleTitle: "Amazon River",
      articleBody: "The Amazon River in South America is the largest river by discharge volume of water in the world.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_river_boat.jpg/640px-Amazon_river_boat.jpg"
    },
    {
      subject: "Sahara Desert",
      questionText: "Identify this desert.",
      options: ["Gobi", "Kalahari", "Sahara", "Atacama"],
      correctAnswerIndex: 2,
      explanation: "This is the Sahara Desert.",
      articleTitle: "Sahara",
      articleBody: "The Sahara is a desert on the African continent. It is the largest hot desert in the world.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Sahara_desert.jpg/640px-Sahara_desert.jpg"
    },
    {
      subject: "Nile River",
      questionText: "Identify this river.",
      options: ["Amazon", "Nile", "Yangtze", "Ganges"],
      correctAnswerIndex: 1,
      explanation: "This is the Nile River.",
      articleTitle: "Nile",
      articleBody: "The Nile is a major north-flowing river in northeastern Africa. It is generally considered the longest river in the world.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Nile_River_and_delta_from_orbit.jpg/640px-Nile_River_and_delta_from_orbit.jpg"
    },
    {
      subject: "Grand Canyon",
      questionText: "Identify this canyon.",
      options: ["Antelope Canyon", "Grand Canyon", "Bryce Canyon", "Zion"],
      correctAnswerIndex: 1,
      explanation: "This is the Grand Canyon.",
      articleTitle: "Grand Canyon",
      articleBody: "The Grand Canyon is a steep-sided canyon carved by the Colorado River in Arizona, United States.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Dawn_on_the_S_Rim_of_the_Grand_Canyon_%288645178272%29.jpg/640px-Dawn_on_the_S_Rim_of_the_Grand_Canyon_%288645178272%29.jpg"
    },
    {
      subject: "Great Barrier Reef",
      questionText: "Identify this reef.",
      options: ["Belize Barrier Reef", "Great Barrier Reef", "Red Sea Coral", "Maldives"],
      correctAnswerIndex: 1,
      explanation: "This is the Great Barrier Reef.",
      articleTitle: "Great Barrier Reef",
      articleBody: "The Great Barrier Reef is the world's largest coral reef system composed of over 2,900 individual reefs and 900 islands.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Great_Barrier_Reef.jpg/640px-Great_Barrier_Reef.jpg"
    },
    {
      subject: "Victoria Falls",
      questionText: "Identify this waterfall.",
      options: ["Niagara Falls", "Victoria Falls", "Angel Falls", "Iguazu Falls"],
      correctAnswerIndex: 1,
      explanation: "This is Victoria Falls.",
      articleTitle: "Victoria Falls",
      articleBody: "Victoria Falls is a waterfall on the Zambezi River in southern Africa.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Victoria_Falls_Zambia.jpg/640px-Victoria_Falls_Zambia.jpg"
    },
    {
      subject: "Dead Sea",
      questionText: "Identify this body of water.",
      options: ["Red Sea", "Dead Sea", "Black Sea", "Caspian Sea"],
      correctAnswerIndex: 1,
      explanation: "This is the Dead Sea, known for its high salt concentration allowing people to float.",
      articleTitle: "Dead Sea",
      articleBody: "The Dead Sea is a salt lake bordered by Jordan to the east and Israel and the West Bank to the west.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Dead_Sea_salt_deposits.jpg/640px-Dead_Sea_salt_deposits.jpg"
    },
    {
      subject: "Antarctica Continent",
      questionText: "Identify this continent.",
      options: ["Greenland", "North Pole", "Antarctica", "Alaska"],
      correctAnswerIndex: 2,
      explanation: "This is Antarctica.",
      articleTitle: "Antarctica",
      articleBody: "Antarctica is Earth's southernmost continent. It contains the geographic South Pole.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Antarctica_Dome_C_snow.jpg/640px-Antarctica_Dome_C_snow.jpg"
    },
    {
      subject: "Mount Fuji",
      questionText: "Identify this volcano.",
      options: ["Mount St. Helens", "Mount Fuji", "Etna", "Vesuvius"],
      correctAnswerIndex: 1,
      explanation: "This is Mount Fuji, Japan's highest peak.",
      articleTitle: "Mount Fuji",
      articleBody: "Mount Fuji is an active volcano about 100 kilometers southwest of Tokyo. It is the country's tallest peak.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/080103_huzi.jpg/640px-080103_huzi.jpg"
    },
    {
      subject: "Niagara Falls",
      questionText: "Identify this waterfall.",
      options: ["Victoria Falls", "Niagara Falls", "Iguazu Falls", "Angel Falls"],
      correctAnswerIndex: 1,
      explanation: "This is Niagara Falls.",
      articleTitle: "Niagara Falls",
      articleBody: "Niagara Falls is a group of three waterfalls at the southern end of Niagara Gorge, spanning the border between the province of Ontario in Canada and the state of New York in the United States.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/3Falls_Niagara.jpg/640px-3Falls_Niagara.jpg"
    },
    {
      subject: "Mount Kilimanjaro",
      questionText: "Identify this mountain.",
      options: ["Everest", "Kilimanjaro", "Denali", "Blanc"],
      correctAnswerIndex: 1,
      explanation: "This is Mount Kilimanjaro.",
      articleTitle: "Mount Kilimanjaro",
      articleBody: "Mount Kilimanjaro is a dormant volcano in Tanzania. It is the highest mountain in Africa.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Mt._Kilimanjaro_12.2006.JPG/640px-Mt._Kilimanjaro_12.2006.JPG"
    },
    {
      subject: "Yellowstone National Park",
      questionText: "Identify this park.",
      options: ["Yosemite", "Yellowstone", "Grand Canyon", "Zion"],
      correctAnswerIndex: 1,
      explanation: "This is Yellowstone (Grand Prismatic Spring).",
      articleTitle: "Yellowstone National Park",
      articleBody: "Yellowstone National Park is an American national park located in the western United States. It is known for its wildlife and its many geothermal features.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Grand_Prismatic_Spring_2013.jpg/640px-Grand_Prismatic_Spring_2013.jpg"
    }
  ],
  [Category.SPACE]: [
    {
      subject: "Planet Saturn",
      questionText: "Identify this planet.",
      options: ["Jupiter", "Uranus", "Saturn", "Neptune"],
      correctAnswerIndex: 2,
      explanation: "This is Saturn, famous for its ring system.",
      articleTitle: "Saturn",
      articleBody: "Saturn is the sixth planet from the Sun and the second-largest in the Solar System, after Jupiter. It is a gas giant with an average radius of about nine and a half times that of Earth.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/640px-Saturn_during_Equinox.jpg"
    },
    {
      subject: "The Moon",
      questionText: "Identify this celestial body.",
      options: ["Mercury", "Pluto", "Moon", "Mars"],
      correctAnswerIndex: 2,
      explanation: "This is Earth's Moon.",
      articleTitle: "Moon",
      articleBody: "The Moon is Earth's only natural satellite. It is the fifth largest satellite in the Solar System and the largest and most massive relative to its parent planet.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/640px-FullMoon2010.jpg"
    },
    {
      subject: "Eagle Nebula",
      questionText: "What is this cosmic structure?",
      options: ["Galaxy", "Black Hole", "Nebula", "Star Cluster"],
      correctAnswerIndex: 2,
      explanation: "This is the Eagle Nebula, specifically the Pillars of Creation.",
      articleTitle: "Eagle Nebula",
      articleBody: "The Eagle Nebula is a young open cluster of stars in the constellation Serpens. It contains the famous Pillars of Creation.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Eagle_nebula_pillars.jpg/640px-Eagle_nebula_pillars.jpg"
    },
    {
      subject: "Mars Surface",
      questionText: "Which planet's surface is this?",
      options: ["Venus", "Mars", "Mercury", "Titan"],
      correctAnswerIndex: 1,
      explanation: "This is the surface of Mars, the Red Planet.",
      articleTitle: "Mars",
      articleBody: "Mars is the fourth planet from the Sun and the second-smallest planet in the Solar System, being larger than only Mercury.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/640px-OSIRIS_Mars_true_color.jpg"
    },
    {
      subject: "International Space Station",
      questionText: "Identify this spacecraft.",
      options: ["Hubble", "Mir", "ISS", "Skylab"],
      correctAnswerIndex: 2,
      explanation: "This is the International Space Station (ISS).",
      articleTitle: "International Space Station",
      articleBody: "The International Space Station (ISS) is a modular space station (habitable artificial satellite) in low Earth orbit.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/International_Space_Station_after_undocking_of_STS-132.jpg/640px-International_Space_Station_after_undocking_of_STS-132.jpg"
    },
    {
      subject: "Solar Eclipse",
      questionText: "What event is shown here?",
      options: ["Lunar Eclipse", "Solar Eclipse", "Transit of Venus", "Aurora"],
      correctAnswerIndex: 1,
      explanation: "This is a total Solar Eclipse.",
      articleTitle: "Solar eclipse",
      articleBody: "A solar eclipse occurs when the Moon passes between the Earth and the Sun, thereby totally or partly obscuring the image of the Sun for a viewer on Earth.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Solar_eclipse_1999_4.jpg/640px-Solar_eclipse_1999_4.jpg"
    },
    {
      subject: "Andromeda Galaxy",
      questionText: "Identify this galaxy.",
      options: ["Milky Way", "Triangulum", "Andromeda", "Whirlpool"],
      correctAnswerIndex: 2,
      explanation: "This is the Andromeda Galaxy.",
      articleTitle: "Andromeda Galaxy",
      articleBody: "The Andromeda Galaxy is a barred spiral galaxy approximately 2.5 million light-years from Earth and the nearest major galaxy to the Milky Way.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Andromeda_Galaxy_%28with_h-alpha%29.jpg/640px-Andromeda_Galaxy_%28with_h-alpha%29.jpg"
    },
    {
      subject: "Jupiter",
      questionText: "Identify this planet.",
      options: ["Saturn", "Jupiter", "Neptune", "Venus"],
      correctAnswerIndex: 1,
      explanation: "This is Jupiter, the largest planet in our solar system.",
      articleTitle: "Jupiter",
      articleBody: "Jupiter is the fifth planet from the Sun and the largest in the Solar System. It is a gas giant with a mass one-thousandth that of the Sun, but two-and-a-half times that of all the other planets in the Solar System combined.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Jupiter_and_its_shrunken_Great_Red_Spot.jpg/640px-Jupiter_and_its_shrunken_Great_Red_Spot.jpg"
    },
    {
      subject: "Space Shuttle",
      questionText: "Identify this vehicle.",
      options: ["Soyuz", "Apollo", "Space Shuttle", "Falcon 9"],
      correctAnswerIndex: 2,
      explanation: "This is the Space Shuttle Atlantis.",
      articleTitle: "Space Shuttle",
      articleBody: "The Space Shuttle was a partially reusable low Earth orbital spacecraft system operated by the U.S. National Aeronautics and Space Administration (NASA).",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/STS120LaunchHiRes-edit1.jpg/640px-STS120LaunchHiRes-edit1.jpg"
    },
    {
      subject: "Buzz Aldrin on Moon",
      questionText: "What mission is this from?",
      options: ["Apollo 11", "Gemini 4", "Skylab", "Artemis I"],
      correctAnswerIndex: 0,
      explanation: "This is Buzz Aldrin during Apollo 11.",
      articleTitle: "Apollo 11",
      articleBody: "Apollo 11 was the spaceflight that first landed humans on the Moon. Commander Neil Armstrong and lunar module pilot Buzz Aldrin formed the American crew that landed the Apollo Lunar Module Eagle on July 20, 1969.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Aldrin_Apollo_11_original.jpg/640px-Aldrin_Apollo_11_original.jpg"
    },
    {
      subject: "Black Hole",
      questionText: "What is this?",
      options: ["Black Hole", "Supernova", "Neutron Star", "Pulsar"],
      correctAnswerIndex: 0,
      explanation: "This is a simulated image of a Black Hole.",
      articleTitle: "Black hole",
      articleBody: "A black hole is a region of spacetime where gravity is so strong that nothing—no particles or even electromagnetic radiation such as light—can escape from it.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Black_hole_-_Messier_87_crop_max_res.jpg/640px-Black_hole_-_Messier_87_crop_max_res.jpg"
    },
    {
      subject: "Mars Rover",
      questionText: "Identify this vehicle.",
      options: ["Curiosity", "Voyager", "Hubble", "Sputnik"],
      correctAnswerIndex: 0,
      explanation: "This is the Curiosity Rover on Mars.",
      articleTitle: "Curiosity (rover)",
      articleBody: "Curiosity is a car-sized Mars rover designed to explore the Gale crater on Mars as part of NASA's Mars Science Laboratory mission.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Curiosity_Self-Portrait_at_%27Big_Sky%27_Drilling_Site.jpg/640px-Curiosity_Self-Portrait_at_%27Big_Sky%27_Drilling_Site.jpg"
    }
  ],
  [Category.HISTORY]: [
    {
      subject: "Napoleon Bonaparte",
      questionText: "Who is this historical figure?",
      options: ["Louis XIV", "Napoleon", "Charlemagne", "Robespierre"],
      correctAnswerIndex: 1,
      explanation: "This is Emperor Napoleon Bonaparte.",
      articleTitle: "Napoleon",
      articleBody: "Napoleon Bonaparte was a French military and political leader who rose to prominence during the French Revolution and led several successful campaigns during the Revolutionary Wars.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Jacques-Louis_David_-_The_Emperor_Napoleon_in_His_Study_at_the_Tuileries_-_Google_Art_Project.jpg/640px-Jacques-Louis_David_-_The_Emperor_Napoleon_in_His_Study_at_the_Tuileries_-_Google_Art_Project.jpg"
    },
    {
      subject: "Tutankhamun Mask",
      questionText: "Which pharaoh does this mask belong to?",
      options: ["Ramses II", "Akhenaten", "Tutankhamun", "Khufu"],
      correctAnswerIndex: 2,
      explanation: "This is the burial mask of Tutankhamun.",
      articleTitle: "Tutankhamun",
      articleBody: "Tutankhamun was an ancient Egyptian pharaoh who was the last of his royal family to rule during the end of the 18th Dynasty.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Tutankhamun_mask_at_Cairo_Museum_levels_adjusted.jpg/640px-Tutankhamun_mask_at_Cairo_Museum_levels_adjusted.jpg"
    },
    {
      subject: "Julius Caesar Bust",
      questionText: "Identify this Roman leader.",
      options: ["Augustus", "Nero", "Julius Caesar", "Trajan"],
      correctAnswerIndex: 2,
      explanation: "This is a bust of Julius Caesar.",
      articleTitle: "Julius Caesar",
      articleBody: "Gaius Julius Caesar was a Roman general and statesman who played a critical role in the events that led to the demise of the Roman Republic and the rise of the Roman Empire.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/C%C3%A9sar_Arles.jpg/640px-C%C3%A9sar_Arles.jpg"
    },
    {
      subject: "Samurai Warrior",
      questionText: "What type of warrior is this?",
      options: ["Ninja", "Samurai", "Knight", "Viking"],
      correctAnswerIndex: 1,
      explanation: "This is a Japanese Samurai.",
      articleTitle: "Samurai",
      articleBody: "Samurai were the hereditary military nobility and officer caste of medieval and early-modern Japan from the 12th century to their abolition in the 1870s.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Samurai_with_sword.jpg/640px-Samurai_with_sword.jpg"
    },
    {
      subject: "Medieval Knight",
      questionText: "Identify this soldier.",
      options: ["Hoplite", "Legionary", "Knight", "Musketeer"],
      correctAnswerIndex: 2,
      explanation: "This is a medieval Knight in armor.",
      articleTitle: "Knight",
      articleBody: "A knight is a person granted an honorary title of knighthood by a head of state (including the pope) or representative for service to the monarch, the church or the country.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Statue_of_a_medieval_knight_in_Wawel_Castle.jpg/640px-Statue_of_a_medieval_knight_in_Wawel_Castle.jpg"
    },
    {
      subject: "Viking Ship",
      questionText: "Who used this type of ship?",
      options: ["Romans", "Greeks", "Vikings", "Mongols"],
      correctAnswerIndex: 2,
      explanation: "This is a Viking longship.",
      articleTitle: "Vikings",
      articleBody: "Vikings were the seafaring Norse people from southern Scandinavia (present-day Denmark, Norway and Sweden) who raided, pirated, traded and settled throughout parts of Europe.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Oseberg_ship_interieur.jpg/640px-Oseberg_ship_interieur.jpg"
    },
    {
      subject: "Abraham Lincoln",
      questionText: "Who is this US President?",
      options: ["Washington", "Jefferson", "Lincoln", "Roosevelt"],
      correctAnswerIndex: 2,
      explanation: "This is Abraham Lincoln.",
      articleTitle: "Abraham Lincoln",
      articleBody: "Abraham Lincoln was an American lawyer and statesman who served as the 16th president of the United States from 1861 until his assassination in 1865.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Abraham_Lincoln_O-77_matte_collodion_print.jpg/640px-Abraham_Lincoln_O-77_matte_collodion_print.jpg"
    },
    {
      subject: "Mahatma Gandhi",
      questionText: "Who is this leader?",
      options: ["Nehru", "Gandhi", "Mandela", "MLK"],
      correctAnswerIndex: 1,
      explanation: "This is Mahatma Gandhi.",
      articleTitle: "Mahatma Gandhi",
      articleBody: "Mohandas Karamchand Gandhi was an Indian lawyer, anti-colonial nationalist, and political ethicist, who employed nonviolent resistance to lead the successful campaign for India's independence from British rule.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Gandhi_Costume_Weaver.jpg/640px-Gandhi_Costume_Weaver.jpg"
    },
    {
      subject: "Queen Elizabeth I",
      questionText: "Identify this monarch.",
      options: ["Victoria", "Elizabeth I", "Mary I", "Anne"],
      correctAnswerIndex: 1,
      explanation: "This is Queen Elizabeth I of England.",
      articleTitle: "Elizabeth I",
      articleBody: "Elizabeth I was Queen of England and Ireland from 17 November 1558 until her death in 1603. She was the last of the five monarchs of the House of Tudor.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Darnley_stage_3.jpg/640px-Darnley_stage_3.jpg"
    },
    {
      subject: "Rosetta Stone",
      questionText: "What is this artifact?",
      options: ["Code of Hammurabi", "Rosetta Stone", "Dead Sea Scrolls", "Magna Carta"],
      correctAnswerIndex: 1,
      explanation: "This is the Rosetta Stone, key to deciphering hieroglyphs.",
      articleTitle: "Rosetta Stone",
      articleBody: "The Rosetta Stone is a granodiorite stele inscribed with three versions of a decree issued in Memphis, Egypt, in 196 BC during the Ptolemaic dynasty.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/640px-Rosetta_Stone.JPG"
    },
    {
      subject: "Winston Churchill",
      questionText: "Who is this Prime Minister?",
      options: ["Chamberlain", "Churchill", "Thatcher", "Blair"],
      correctAnswerIndex: 1,
      explanation: "This is Winston Churchill.",
      articleTitle: "Winston Churchill",
      articleBody: "Sir Winston Leonard Spencer Churchill was a British statesman, soldier, and writer who served as Prime Minister of the United Kingdom twice, notably during the Second World War.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Sir_Winston_Churchill_-_19086236948.jpg/640px-Sir_Winston_Churchill_-_19086236948.jpg"
    },
    {
      subject: "Cleopatra",
      questionText: "Who is this historical figure?",
      options: ["Nefertiti", "Cleopatra", "Hatshepsut", "Boudicca"],
      correctAnswerIndex: 1,
      explanation: "This depicts Cleopatra VII.",
      articleTitle: "Cleopatra",
      articleBody: "Cleopatra VII Philopator was the last active ruler of the Ptolemaic Kingdom of Egypt.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Kleopatra-VII.-Altes-Museum-Berlin.jpg/640px-Kleopatra-VII.-Altes-Museum-Berlin.jpg"
    },
    {
      subject: "Martin Luther King Jr.",
      questionText: "Who is this activist?",
      options: ["Malcolm X", "MLK Jr.", "Rosa Parks", "John Lewis"],
      correctAnswerIndex: 1,
      explanation: "This is Martin Luther King Jr.",
      articleTitle: "Martin Luther King Jr.",
      articleBody: "Martin Luther King Jr. was an American Baptist minister and activist who became the most visible spokesperson and leader in the civil rights movement.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Martin_Luther_King%2C_Jr..jpg/640px-Martin_Luther_King%2C_Jr..jpg"
    }
  ],
  [Category.MYTHOLOGY]: [
    {
      subject: "Zeus / Jupiter",
      questionText: "Who is this god?",
      options: ["Poseidon", "Zeus", "Hades", "Ares"],
      correctAnswerIndex: 1,
      explanation: "This is Zeus (or Jupiter), King of the Gods.",
      articleTitle: "Zeus",
      articleBody: "Zeus is the sky and thunder god in ancient Greek religion, who rules as king of the gods of Mount Olympus.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Jupiter_Smyrna_Louvre_Ma13.jpg/640px-Jupiter_Smyrna_Louvre_Ma13.jpg"
    },
    {
      subject: "Dragon",
      questionText: "What mythical creature is this?",
      options: ["Griffin", "Phoenix", "Dragon", "Wyvern"],
      correctAnswerIndex: 2,
      explanation: "This is a Dragon.",
      articleTitle: "Dragon",
      articleBody: "A dragon is a large, serpentine legendary creature that appears in the folklore of many cultures around the world.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Friedrich_Johann_Justin_Bertuch_Mythical_Creature_Dragon.jpg/640px-Friedrich_Johann_Justin_Bertuch_Mythical_Creature_Dragon.jpg"
    },
    {
      subject: "Poseidon / Neptune",
      questionText: "Who is this god?",
      options: ["Apollo", "Zeus", "Poseidon", "Hermes"],
      correctAnswerIndex: 2,
      explanation: "This is Poseidon (Neptune), god of the sea.",
      articleTitle: "Poseidon",
      articleBody: "Poseidon was one of the Twelve Olympians in ancient Greek religion and myth. He was god of the Sea, storms, earthquakes and horses.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Poseidon_sculpture_Copenhagen_2005.jpg/640px-Poseidon_sculpture_Copenhagen_2005.jpg"
    },
    {
      subject: "Unicorn",
      questionText: "Identify this creature.",
      options: ["Pegasus", "Unicorn", "Centaur", "Kelpie"],
      correctAnswerIndex: 1,
      explanation: "This is a Unicorn.",
      articleTitle: "Unicorn",
      articleBody: "The unicorn is a legendary creature that has been described since antiquity as a beast with a single large, pointed, spiraling horn projecting from its forehead.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Ours_et_licorne_Jacquemart_de_Hesdin.jpg/640px-Ours_et_licorne_Jacquemart_de_Hesdin.jpg"
    },
    {
      subject: "Sphinx",
      questionText: "What is this creature?",
      options: ["Chimera", "Sphinx", "Manticore", "Griffin"],
      correctAnswerIndex: 1,
      explanation: "This is the Great Sphinx.",
      articleTitle: "Great Sphinx of Giza",
      articleBody: "The Great Sphinx of Giza is a limestone statue of a reclining sphinx, a mythical creature with the head of a human and the body of a lion.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Great_Sphinx_of_Giza_-_20080716a.jpg/640px-Great_Sphinx_of_Giza_-_20080716a.jpg"
    },
    {
      subject: "Thor",
      questionText: "Who is this Norse god?",
      options: ["Odin", "Loki", "Thor", "Baldur"],
      correctAnswerIndex: 2,
      explanation: "This is Thor, wielding Mjolnir.",
      articleTitle: "Thor",
      articleBody: "In Germanic mythology, Thor is a hammer-wielding god associated with thunder, lightning, storms, oak trees, strength, the protection of mankind, and also hallowing and fertility.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/M%C3%A5rten_Eskil_Winge_-_Tor%27s_Fight_with_the_Giants_-_Google_Art_Project.jpg/640px-M%C3%A5rten_Eskil_Winge_-_Tor%27s_Fight_with_the_Giants_-_Google_Art_Project.jpg"
    },
    {
      subject: "Medusa",
      questionText: "Who is this Gorgon?",
      options: ["Athena", "Hera", "Medusa", "Aphrodite"],
      correctAnswerIndex: 2,
      explanation: "This is Medusa, with snakes for hair.",
      articleTitle: "Medusa",
      articleBody: "In Greek mythology, Medusa also called Gorgo, was one of the three monstrous Gorgons, generally described as winged human females with living venomous snakes in place of hair.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Medusa_Bernini_Musei_Capitolini.jpg/640px-Medusa_Bernini_Musei_Capitolini.jpg"
    },
    {
      subject: "Anubis",
      questionText: "Who is this Egyptian god?",
      options: ["Ra", "Osiris", "Anubis", "Horus"],
      correctAnswerIndex: 2,
      explanation: "This is Anubis, god of the dead.",
      articleTitle: "Anubis",
      articleBody: "Anubis is the Greek name of the god of death, mummification, embalming, the afterlife, cemeteries, tombs, and the Underworld, in ancient Egyptian religion.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Anubis_standing.svg/640px-Anubis_standing.svg.png"
    },
    {
      subject: "Phoenix",
      questionText: "What bird is this?",
      options: ["Eagle", "Phoenix", "Roc", "Thunderbird"],
      correctAnswerIndex: 1,
      explanation: "This is a Phoenix, rising from ashes.",
      articleTitle: "Phoenix (mythology)",
      articleBody: "The phoenix is an immortal bird associated with Greek mythology that cyclically regenerates or is otherwise born again.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/AberdeenBestiaryFolio56rPhoenix.jpg/640px-AberdeenBestiaryFolio56rPhoenix.jpg"
    },
    {
      subject: "Centaur",
      questionText: "What creature is half-man half-horse?",
      options: ["Satyr", "Minotaur", "Centaur", "Cyclops"],
      correctAnswerIndex: 2,
      explanation: "This is a Centaur.",
      articleTitle: "Centaur",
      articleBody: "A centaur is a creature from Greek mythology with the upper body of a human and the lower body and legs of a horse.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Botticelli_-_Pallas_and_the_Centaur.jpg/640px-Botticelli_-_Pallas_and_the_Centaur.jpg"
    },
    {
      subject: "Hercules",
      questionText: "Who is this hero?",
      options: ["Achilles", "Hercules", "Perseus", "Theseus"],
      correctAnswerIndex: 1,
      explanation: "This is Hercules (Heracles), known for his strength.",
      articleTitle: "Hercules",
      articleBody: "Hercules is a Roman hero and god. He was the Roman equivalent of the Greek divine hero Heracles, son of Jupiter and the mortal Alcmene.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Hercules_Farnese_MAN_Napoli_Inv6001_n01.jpg/640px-Hercules_Farnese_MAN_Napoli_Inv6001_n01.jpg"
    },
    {
      subject: "Odin",
      questionText: "Who is this Norse god?",
      options: ["Thor", "Loki", "Odin", "Heimdall"],
      correctAnswerIndex: 2,
      explanation: "This is Odin, the Allfather.",
      articleTitle: "Odin",
      articleBody: "In Germanic mythology, Odin is a widely revered god. In Norse mythology, he is associated with wisdom, healing, death, royalty, the gallows, knowledge, war, battle, victory, sorcery, poetry, frenzy, and the runic alphabet.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/de/Georg_von_Rosen_-_Oden_som_vandringsman%2C_1886_%28Odin%2C_the_Wanderer%29.jpg/640px-Georg_von_Rosen_-_Oden_som_vandringsman%2C_1886_%28Odin%2C_the_Wanderer%29.jpg"
    }
  ],
  [Category.FOOD]: [
    {
      subject: "Sushi",
      questionText: "Identify this dish.",
      options: ["Sashimi", "Sushi", "Tempura", "Ramen"],
      correctAnswerIndex: 1,
      explanation: "This is Sushi, a Japanese dish of vinegared rice.",
      articleTitle: "Sushi",
      articleBody: "Sushi is a traditional Japanese dish of prepared vinegared rice, usually with some sugar and salt, accompanying a variety of ingredients, such as seafood and vegetables.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Sushi_platter.jpg/640px-Sushi_platter.jpg"
    },
    {
      subject: "Pizza Margherita",
      questionText: "What type of pizza is this?",
      options: ["Pepperoni", "Hawaiian", "Margherita", "Marinara"],
      correctAnswerIndex: 2,
      explanation: "This is Pizza Margherita, with tomatoes, mozzarella, and basil.",
      articleTitle: "Pizza Margherita",
      articleBody: "Pizza Margherita is a typical Neapolitan pizza, made with San Marzano tomatoes, mozzarella cheese, fresh basil, salt, and extra-virgin olive oil.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Eq_it-na_pizza-margherita_sep2005_sml.jpg/640px-Eq_it-na_pizza-margherita_sep2005_sml.jpg"
    },
    {
      subject: "Croissant",
      questionText: "Identify this pastry.",
      options: ["Baguette", "Brioche", "Croissant", "Danish"],
      correctAnswerIndex: 2,
      explanation: "This is a Croissant, a buttery flaky pastry.",
      articleTitle: "Croissant",
      articleBody: "A croissant is a buttery, flaky, viennoiserie pastry of Austrian origin, named for its historical crescent shape.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/2018_01_Croissant_IMG_0685.JPG/640px-2018_01_Croissant_IMG_0685.JPG"
    },
    {
      subject: "Tacos",
      questionText: "What is this Mexican dish?",
      options: ["Burrito", "Tacos", "Enchilada", "Quesadilla"],
      correctAnswerIndex: 1,
      explanation: "These are Tacos.",
      articleTitle: "Taco",
      articleBody: "A taco is a traditional Mexican dish consisting of a small hand-sized corn or wheat tortilla topped with a filling.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/001_Tacos_de_Carnitas%2C_Carne_Asada_y_Al_Pastor.jpg/640px-001_Tacos_de_Carnitas%2C_Carne_Asada_y_Al_Pastor.jpg"
    },
    {
      subject: "Macarons",
      questionText: "Identify these sweets.",
      options: ["Cupcakes", "Macarons", "Meringues", "Eclairs"],
      correctAnswerIndex: 1,
      explanation: "These are French Macarons.",
      articleTitle: "Macaron",
      articleBody: "A macaron is a sweet meringue-based confection made with egg white, icing sugar, granulated sugar, almond meal, and food colouring.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Macarons_mon_amour.jpg/640px-Macarons_mon_amour.jpg"
    },
    {
      subject: "Paella",
      questionText: "What is this Spanish dish?",
      options: ["Risotto", "Paella", "Biryani", "Pilaf"],
      correctAnswerIndex: 1,
      explanation: "This is Paella, originating from Valencia.",
      articleTitle: "Paella",
      articleBody: "Paella is a rice dish originally from the Valencian Community. It is regarded as one of the community's identifying symbols.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Paella_de_marisco_01.jpg/640px-Paella_de_marisco_01.jpg"
    },
    {
      subject: "Burger",
      questionText: "Identify this sandwich.",
      options: ["Hot Dog", "Sub", "Burger", "Wrap"],
      correctAnswerIndex: 2,
      explanation: "This is a Hamburger.",
      articleTitle: "Hamburger",
      articleBody: "A hamburger is a food, typically considered a sandwich, consisting of one or more cooked patties of ground meat, usually beef, placed inside a sliced bread roll or bun.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Hamburger_%28black_bg%29.jpg/640px-Hamburger_%28black_bg%29.jpg"
    },
    {
      subject: "Dim Sum",
      questionText: "What cuisine style is this?",
      options: ["Tapas", "Dim Sum", "Meze", "Antipasto"],
      correctAnswerIndex: 1,
      explanation: "This is Dim Sum, a style of Chinese cuisine.",
      articleTitle: "Dim sum",
      articleBody: "Dim sum is a large range of small Chinese dishes that are traditionally enjoyed in restaurants for brunch.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Dim_Sum_02.jpg/640px-Dim_Sum_02.jpg"
    },
    {
      subject: "Ice Cream",
      questionText: "Identify this dessert.",
      options: ["Sorbet", "Gelato", "Ice Cream", "Yogurt"],
      correctAnswerIndex: 2,
      explanation: "This is Ice Cream.",
      articleTitle: "Ice cream",
      articleBody: "Ice cream is a sweetened frozen food typically eaten as a snack or dessert. It may be made from milk or cream and is flavoured with a sweetener.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Ice_Cream_dessert_02.jpg/640px-Ice_Cream_dessert_02.jpg"
    },
    {
      subject: "Coffee Beans",
      questionText: "What are these?",
      options: ["Cocoa Beans", "Coffee Beans", "Soy Beans", "Vanilla"],
      correctAnswerIndex: 1,
      explanation: "These are roasted Coffee Beans.",
      articleTitle: "Coffee bean",
      articleBody: "A coffee bean is a seed of the Coffea plant and the source for coffee. It is the pip inside the red or purple fruit often referred to as a cherry.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Roasted_coffee_beans.jpg/640px-Roasted_coffee_beans.jpg"
    },
    {
      subject: "Ramen",
      questionText: "What is this noodle soup?",
      options: ["Pho", "Ramen", "Udon", "Laksa"],
      correctAnswerIndex: 1,
      explanation: "This is Ramen, a Japanese noodle soup.",
      articleTitle: "Ramen",
      articleBody: "Ramen is a Japanese noodle soup. It consists of Chinese-style wheat noodles served in a meat or fish-based broth, often flavored with soy sauce or miso.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Shoyu_Ramen.jpg/640px-Shoyu_Ramen.jpg"
    },
    {
      subject: "Curry",
      questionText: "Identify this dish.",
      options: ["Stew", "Curry", "Soup", "Chili"],
      correctAnswerIndex: 1,
      explanation: "This is Curry.",
      articleTitle: "Curry",
      articleBody: "Curry is a variety of dishes originating in the Indian subcontinent that use a complex combination of spices or herbs, usually including ground turmeric, cumin, coriander, ginger, and fresh or dried chilies.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lentil_Curry.jpg/640px-Lentil_Curry.jpg"
    }
  ],
  [Category.MUSIC]: [
    {
      subject: "Violin",
      questionText: "Identify this instrument.",
      options: ["Cello", "Viola", "Violin", "Double Bass"],
      correctAnswerIndex: 2,
      explanation: "This is a Violin.",
      articleTitle: "Violin",
      articleBody: "The violin is a wooden chordophone (string instrument) in the violin family. It is the smallest and highest-pitched instrument in the family in regular use.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Violin_VL100.jpg/640px-Violin_VL100.jpg"
    },
    {
      subject: "Grand Piano",
      questionText: "What instrument is this?",
      options: ["Organ", "Harpsichord", "Piano", "Celesta"],
      correctAnswerIndex: 2,
      explanation: "This is a Grand Piano.",
      articleTitle: "Piano",
      articleBody: "The piano is an acoustic, stringed musical instrument invented in Italy by Bartolomeo Cristofori around the year 1700.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Steinway_%26_Sons_concert_grand_piano%2C_model_D-274%2C_Hamburg.jpg/640px-Steinway_%26_Sons_concert_grand_piano%2C_model_D-274%2C_Hamburg.jpg"
    },
    {
      subject: "Electric Guitar",
      questionText: "Identify this guitar.",
      options: ["Acoustic", "Electric", "Bass", "Banjo"],
      correctAnswerIndex: 1,
      explanation: "This is an Electric Guitar (Fender Stratocaster style).",
      articleTitle: "Electric guitar",
      articleBody: "An electric guitar is a guitar that requires external amplification to be heard at typical performance volumes.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/1958_Fender_Stratocaster.jpg/640px-1958_Fender_Stratocaster.jpg"
    },
    {
      subject: "Drum Kit",
      questionText: "What is this set of instruments?",
      options: ["Percussion", "Drum Kit", "Bongos", "Timpani"],
      correctAnswerIndex: 1,
      explanation: "This is a Drum Kit.",
      articleTitle: "Drum kit",
      articleBody: "A drum kit is a collection of drums, cymbals, and other percussion instruments, which are set up on stands to be played by a single player.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Yamaha_Maple_Custom_Absolute.jpg/640px-Yamaha_Maple_Custom_Absolute.jpg"
    },
    {
      subject: "Saxophone",
      questionText: "Identify this instrument.",
      options: ["Trumpet", "Saxophone", "Clarinet", "Trombone"],
      correctAnswerIndex: 1,
      explanation: "This is a Saxophone.",
      articleTitle: "Saxophone",
      articleBody: "The saxophone is a woodwind instrument. Saxophones are usually made of brass and played with a single-reed mouthpiece similar to that of the clarinet.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Alto_saxophone.jpg/640px-Alto_saxophone.jpg"
    },
    {
      subject: "Trumpet",
      questionText: "Identify this brass instrument.",
      options: ["Tuba", "Horn", "Trumpet", "Cornet"],
      correctAnswerIndex: 2,
      explanation: "This is a Trumpet.",
      articleTitle: "Trumpet",
      articleBody: "A trumpet is a brass instrument used in classical and jazz ensembles. The trumpet group ranges from the piccolo trumpet to the bass trumpet.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Yamaha_Trumpet_YTR-8335LA_custom_Z.jpg/640px-Yamaha_Trumpet_YTR-8335LA_custom_Z.jpg"
    },
    {
      subject: "Harp",
      questionText: "What is this instrument?",
      options: ["Lyre", "Harp", "Lute", "Zither"],
      correctAnswerIndex: 1,
      explanation: "This is a Harp.",
      articleTitle: "Harp",
      articleBody: "The harp is a stringed musical instrument that has a number of individual strings running at an angle to its soundboard; the strings are plucked with the fingers.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Harp_big.jpg/640px-Harp_big.jpg"
    },
    {
      subject: "Microphone",
      questionText: "What is this device?",
      options: ["Speaker", "Amplifier", "Microphone", "Receiver"],
      correctAnswerIndex: 2,
      explanation: "This is a vocal Microphone.",
      articleTitle: "Microphone",
      articleBody: "A microphone is a transducer that converts sound into an electrical signal.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Neumann_U87_condenser_microphone.jpg/640px-Neumann_U87_condenser_microphone.jpg"
    },
    {
      subject: "Vinyl Record",
      questionText: "What format is this?",
      options: ["CD", "Cassette", "Vinyl", "MP3"],
      correctAnswerIndex: 2,
      explanation: "This is a Vinyl Record.",
      articleTitle: "Phonograph record",
      articleBody: "A phonograph record is an analog sound storage medium in the form of a flat object with an inscribed, modulated spiral groove.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Vinyl_record_LP_12inch.JPG/640px-Vinyl_record_LP_12inch.JPG"
    },
    {
      subject: "Accordion",
      questionText: "Identify this instrument.",
      options: ["Concertina", "Accordion", "Harmonium", "Organ"],
      correctAnswerIndex: 1,
      explanation: "This is an Accordion.",
      articleTitle: "Accordion",
      articleBody: "Accordions are a family of box-shaped musical instruments of the bellows-driven free-reed aerophone type.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Piano_accordion.jpg/640px-Piano_accordion.jpg"
    },
    {
      subject: "Flute",
      questionText: "What is this woodwind instrument?",
      options: ["Clarinet", "Oboe", "Flute", "Piccolo"],
      correctAnswerIndex: 2,
      explanation: "This is a Flute.",
      articleTitle: "Flute",
      articleBody: "The flute is a family of musical instruments in the woodwind group. Unlike woodwind instruments with reeds, a flute is an aerophone or reedless wind instrument.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Western_concert_flute_%28Yamaha%29.jpg/640px-Western_concert_flute_%28Yamaha%29.jpg"
    },
    {
      subject: "Cello",
      questionText: "Identify this string instrument.",
      options: ["Violin", "Cello", "Double Bass", "Guitar"],
      correctAnswerIndex: 1,
      explanation: "This is a Cello.",
      articleTitle: "Cello",
      articleBody: "The cello is a bowed (and occasionally plucked) string instrument of the violin family. Its four strings are usually tuned in perfect fifths.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Cello_front_side.jpg/640px-Cello_front_side.jpg"
    }
  ],
  [Category.SPORTS]: [
    {
      subject: "Soccer Ball",
      questionText: "Which sport uses this ball?",
      options: ["Rugby", "Tennis", "Football (Soccer)", "Basketball"],
      correctAnswerIndex: 2,
      explanation: "This is a Soccer ball.",
      articleTitle: "Association football",
      articleBody: "Association football, more commonly known as football or soccer, is a team sport played with a spherical ball between two teams of 11 players.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Soccerball.svg/640px-Soccerball.svg.png"
    },
    {
      subject: "Basketball Hoop",
      questionText: "Identify this equipment.",
      options: ["Netball", "Basketball", "Volleyball", "Handball"],
      correctAnswerIndex: 1,
      explanation: "This is a Basketball hoop.",
      articleTitle: "Basketball",
      articleBody: "Basketball is a team sport in which two teams, most commonly of five players each, opposing one another on a rectangular court, compete with the primary objective of shooting a basketball through the defender's hoop.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Basketball_hoop_2.jpg/640px-Basketball_hoop_2.jpg"
    },
    {
      subject: "Tennis Racket",
      questionText: "What sport is this for?",
      options: ["Badminton", "Squash", "Tennis", "Table Tennis"],
      correctAnswerIndex: 2,
      explanation: "This is a Tennis racket.",
      articleTitle: "Tennis",
      articleBody: "Tennis is a racket sport that can be played individually against a single opponent or between two teams of two players each.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Tennis_Racket_and_Balls.jpg/640px-Tennis_Racket_and_Balls.jpg"
    },
    {
      subject: "Baseball",
      questionText: "Identify this ball.",
      options: ["Cricket", "Softball", "Baseball", "Tennis"],
      correctAnswerIndex: 2,
      explanation: "This is a Baseball.",
      articleTitle: "Baseball",
      articleBody: "Baseball is a bat-and-ball game played between two opposing teams who take turns batting and fielding.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Baseball.svg/640px-Baseball.svg.png"
    },
    {
      subject: "Golf Club",
      questionText: "What sport uses this?",
      options: ["Hockey", "Polo", "Golf", "Cricket"],
      correctAnswerIndex: 2,
      explanation: "This is a Golf club.",
      articleTitle: "Golf",
      articleBody: "Golf is a club-and-ball sport in which players use various clubs to hit balls into a series of holes on a course in as few strokes as possible.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Golf_clubs_and_ball.jpg/640px-Golf_clubs_and_ball.jpg"
    },
    {
      subject: "Formula 1 Car",
      questionText: "What racing series is this?",
      options: ["NASCAR", "Formula 1", "IndyCar", "Rally"],
      correctAnswerIndex: 1,
      explanation: "This is a Formula 1 car.",
      articleTitle: "Formula One",
      articleBody: "Formula One is the highest class of international racing for open-wheel single-seater formula racing cars.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Lewis_Hamilton_2010_Malaysia_qualifying.jpg/640px-Lewis_Hamilton_2010_Malaysia_qualifying.jpg"
    },
    {
      subject: "Boxing Gloves",
      questionText: "Identify this equipment.",
      options: ["MMA", "Kickboxing", "Boxing", "Karate"],
      correctAnswerIndex: 2,
      explanation: "These are Boxing gloves.",
      articleTitle: "Boxing",
      articleBody: "Boxing is a combat sport in which two people, usually wearing protective gloves and other protective equipment such as hand wraps and mouthguards, throw punches at each other.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Boxing_gloves.jpg/640px-Boxing_gloves.jpg"
    },
    {
      subject: "Chess Board",
      questionText: "What game is this?",
      options: ["Checkers", "Backgammon", "Chess", "Go"],
      correctAnswerIndex: 2,
      explanation: "This is a Chess board.",
      articleTitle: "Chess",
      articleBody: "Chess is a board game played between two players. It is sometimes called Western chess or international chess to distinguish it from related games.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/ChessSet.jpg/640px-ChessSet.jpg"
    },
    {
      subject: "Ice Hockey",
      questionText: "What sport is played here?",
      options: ["Curling", "Skating", "Ice Hockey", "Bandy"],
      correctAnswerIndex: 2,
      explanation: "This is Ice Hockey.",
      articleTitle: "Ice hockey",
      articleBody: "Ice hockey is a contact team sport played on ice, usually in a rink, in which two teams of skaters use their sticks to shoot a vulcanized rubber puck into their opponent's net.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Ice_hockey_layout.svg/640px-Ice_hockey_layout.svg.png"
    },
    {
      subject: "Olympic Rings",
      questionText: "What event does this symbol represent?",
      options: ["World Cup", "Olympics", "Commonwealth Games", "X Games"],
      correctAnswerIndex: 1,
      explanation: "These are the Olympic Rings.",
      articleTitle: "Olympic Games",
      articleBody: "The Olympic Games are leading international sporting events featuring summer and winter sports competitions in which thousands of athletes from around the world participate.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Olympic_rings_without_rims.svg/640px-Olympic_rings_without_rims.svg.png"
    },
    {
      subject: "American Football",
      questionText: "Identify this sport.",
      options: ["Rugby", "American Football", "Soccer", "Gaelic Football"],
      correctAnswerIndex: 1,
      explanation: "This is an American Football.",
      articleTitle: "American football",
      articleBody: "American football is a team sport played by two teams of eleven players on a rectangular field with goalposts at each end.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/20050816_nfl_football_1.jpg/640px-20050816_nfl_football_1.jpg"
    },
    {
      subject: "Cricket",
      questionText: "What sport equipment is this?",
      options: ["Baseball", "Cricket", "Hockey", "Lacrosse"],
      correctAnswerIndex: 1,
      explanation: "This is a Cricket bat and ball.",
      articleTitle: "Cricket",
      articleBody: "Cricket is a bat-and-ball game played between two teams of eleven players on a field at the centre of which is a 22-yard pitch with a wicket at each end.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Cricket_ball_and_bat.jpg/640px-Cricket_ball_and_bat.jpg"
    }
  ],
  [Category.SCIENCE]: [
    {
      subject: "DNA Helix",
      questionText: "What molecule is this?",
      options: ["RNA", "Protein", "DNA", "Enzyme"],
      correctAnswerIndex: 2,
      explanation: "This is the DNA double helix.",
      articleTitle: "DNA",
      articleBody: "Deoxyribonucleic acid is a polymer composed of two polynucleotide chains that coil around each other to form a double helix.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/DNA_Structure%2BKey%2BLabelled.png/640px-DNA_Structure%2BKey%2BLabelled.png"
    },
    {
      subject: "Atom Model",
      questionText: "What does this represent?",
      options: ["Cell", "Molecule", "Atom", "Bacteria"],
      correctAnswerIndex: 2,
      explanation: "This is a stylized model of an Atom.",
      articleTitle: "Atom",
      articleBody: "An atom is the smallest unit of ordinary matter that forms a chemical element. Every solid, liquid, gas, and plasma is composed of neutral or ionized atoms.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Stylised_Lithium_Atom.svg/640px-Stylised_Lithium_Atom.svg.png"
    },
    {
      subject: "Human Brain",
      questionText: "Identify this organ.",
      options: ["Heart", "Liver", "Brain", "Kidney"],
      correctAnswerIndex: 2,
      explanation: "This is the Human Brain.",
      articleTitle: "Human brain",
      articleBody: "The human brain is the central organ of the human nervous system, and with the spinal cord makes up the central nervous system.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Human_Brain.jpg/640px-Human_Brain.jpg"
    },
    {
      subject: "Volcano Eruption",
      questionText: "What geological event is this?",
      options: ["Earthquake", "Tsunami", "Volcano", "Landslide"],
      correctAnswerIndex: 2,
      explanation: "This is a Volcanic Eruption.",
      articleTitle: "Volcano",
      articleBody: "A volcano is a rupture in the crust of a planetary-mass object, such as Earth, that allows hot lava, volcanic ash, and gases to escape from a magma chamber below the surface.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/St_Helens_plume_07_22_80.jpg/640px-St_Helens_plume_07_22_80.jpg"
    },
    {
      subject: "Telescope",
      questionText: "What instrument is this?",
      options: ["Microscope", "Telescope", "Periscope", "Binoculars"],
      correctAnswerIndex: 1,
      explanation: "This is an astronomical Telescope.",
      articleTitle: "Telescope",
      articleBody: "A telescope is an optical instrument using lenses, curved mirrors, or a combination of both to observe distant objects.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Hubble_01.jpg/640px-Hubble_01.jpg"
    },
    {
      subject: "Periodic Table",
      questionText: "What chart is this?",
      options: ["Timeline", "Periodic Table", "Pie Chart", "Map"],
      correctAnswerIndex: 1,
      explanation: "This is the Periodic Table of Elements.",
      articleTitle: "Periodic table",
      articleBody: "The periodic table is a tabular display of the chemical elements. It is widely used in chemistry, physics, and other sciences.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Periodic_table_large.svg/640px-Periodic_table_large.svg.png"
    },
    {
      subject: "Skeleton",
      questionText: "What system is this?",
      options: ["Muscular", "Nervous", "Skeletal", "Digestive"],
      correctAnswerIndex: 2,
      explanation: "This is the Human Skeletal System.",
      articleTitle: "Human skeleton",
      articleBody: "The human skeleton is the internal framework of the human body. It is composed of around 270 bones at birth – this total decreases to around 206 bones by adulthood.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Human_skeleton_front_en.svg/640px-Human_skeleton_front_en.svg.png"
    },
    {
      subject: "Laboratory Flask",
      questionText: "Identify this glassware.",
      options: ["Beaker", "Flask", "Tube", "Pipette"],
      correctAnswerIndex: 1,
      explanation: "This is an Erlenmeyer Flask.",
      articleTitle: "Erlenmeyer flask",
      articleBody: "An Erlenmeyer flask, also known as a conical flask, is a type of laboratory flask which features a flat bottom, a conical body, and a cylindrical neck.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Erlenmeyer_flask_hg.jpg/640px-Erlenmeyer_flask_hg.jpg"
    },
    {
      subject: "Lightning",
      questionText: "What phenomenon is this?",
      options: ["Thunder", "Lightning", "Rain", "Hail"],
      correctAnswerIndex: 1,
      explanation: "This is Lightning.",
      articleTitle: "Lightning",
      articleBody: "Lightning is a naturally occurring electrostatic discharge during which two electrically charged regions in the atmosphere or ground temporarily equalize themselves.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Lightning_P7200891.jpg/640px-Lightning_P7200891.jpg"
    },
    {
      subject: "Prism Light",
      questionText: "What physics concept is shown?",
      options: ["Reflection", "Refraction", "Absorption", "Diffraction"],
      correctAnswerIndex: 1,
      explanation: "This shows Refraction (Dispersion) of light through a prism.",
      articleTitle: "Prism",
      articleBody: "In optics, a prism is a transparent optical element with flat, polished surfaces that refract light. At least two of the flat surfaces must have an angle between them.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Light_dispersion_of_a_mercury-vapor_lamp_with_a_flint_glass_prism.jpg/640px-Light_dispersion_of_a_mercury-vapor_lamp_with_a_flint_glass_prism.jpg"
    },
    {
      subject: "Magnet",
      questionText: "What object is attracting metal?",
      options: ["Battery", "Magnet", "Wire", "Coil"],
      correctAnswerIndex: 1,
      explanation: "This is a Magnet.",
      articleTitle: "Magnet",
      articleBody: "A magnet is a material or object that produces a magnetic field. This magnetic field is invisible but is responsible for the most notable property of a magnet: a force that pulls on other ferromagnetic materials.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Magnet_ez_alniko_feldlinien.jpg/640px-Magnet_ez_alniko_feldlinien.jpg"
    },
    {
      subject: "Robot",
      questionText: "What machine is this?",
      options: ["Computer", "Robot", "Drone", "Cyborg"],
      correctAnswerIndex: 1,
      explanation: "This is a humanoid Robot.",
      articleTitle: "Robot",
      articleBody: "A robot is a machine—especially one programmable by a computer—capable of carrying out a complex series of actions automatically.",
      base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Honda_ASIMO.jpg/640px-Honda_ASIMO.jpg"
    }
  ]
};

const GENERAL_POOL: QuestionData[] = [
  {
    subject: "Full Moon",
    questionText: "Identify this celestial body.",
    options: ["Sun", "Moon", "Mars", "Venus"],
    correctAnswerIndex: 1,
    explanation: "This is the Moon.",
    articleTitle: "The Moon",
    articleBody: "The Moon is Earth's only natural satellite.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/640px-FullMoon2010.jpg"
  },
  {
    subject: "Glass of Water",
    questionText: "What is this substance?",
    options: ["Oil", "Water", "Alcohol", "Vinegar"],
    correctAnswerIndex: 1,
    explanation: "This is Water.",
    articleTitle: "Water",
    articleBody: "Water is an inorganic, transparent, tasteless, odorless, and nearly colorless chemical substance.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Glass_of_water.jpg/640px-Glass_of_water.jpg"
  },
  {
    subject: "Planet Earth",
    questionText: "Identify this planet.",
    options: ["Mars", "Earth", "Venus", "Jupiter"],
    correctAnswerIndex: 1,
    explanation: "This is Planet Earth.",
    articleTitle: "Earth",
    articleBody: "Earth is the third planet from the Sun and the only astronomical object known to harbor life.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/The_Earth_seen_from_Apollo_17.jpg/640px-The_Earth_seen_from_Apollo_17.jpg"
  },
  {
    subject: "Pyramids of Giza",
    questionText: "Identify these structures.",
    options: ["Mayan Pyramids", "Pyramids of Giza", "Ziggurats", "Nubian Pyramids"],
    correctAnswerIndex: 1,
    explanation: "These are the Pyramids of Giza.",
    articleTitle: "Egyptian pyramids",
    articleBody: "The Egyptian pyramids are ancient masonry structures located in Egypt. Most were built as tombs for the country's pharaohs.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/All_Gizah_Pyramids.jpg/640px-All_Gizah_Pyramids.jpg"
  },
  {
    subject: "Great Wall of China",
    questionText: "What is this structure?",
    options: ["Hadrian's Wall", "Berlin Wall", "Great Wall of China", "Western Wall"],
    correctAnswerIndex: 2,
    explanation: "This is the Great Wall of China.",
    articleTitle: "Great Wall of China",
    articleBody: "The Great Wall of China is a series of fortifications that were built across the historical northern borders of ancient Chinese states.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/The_Great_Wall_of_China_at_Jinshanling-edit.jpg/640px-The_Great_Wall_of_China_at_Jinshanling-edit.jpg"
  },
  {
    subject: "Colosseum",
    questionText: "Identify this ancient arena.",
    options: ["Parthenon", "Colosseum", "Pantheon", "Forum"],
    correctAnswerIndex: 1,
    explanation: "This is the Colosseum in Rome.",
    articleTitle: "Colosseum",
    articleBody: "The Colosseum is an oval amphitheatre in the centre of the city of Rome, Italy. It is the largest ancient amphitheatre ever built.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/640px-Colosseo_2020.jpg"
  },
  {
    subject: "Mona Lisa",
    questionText: "Identify this painting.",
    options: ["Girl with a Pearl Earring", "The Last Supper", "Mona Lisa", "The Birth of Venus"],
    correctAnswerIndex: 2,
    explanation: "This is the Mona Lisa by Leonardo da Vinci.",
    articleTitle: "Mona Lisa",
    articleBody: "The Mona Lisa is a half-length portrait painting by Italian artist Leonardo da Vinci.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/640px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg"
  },
  {
    subject: "Eiffel Tower",
    questionText: "Identify this landmark.",
    options: ["Tokyo Tower", "Eiffel Tower", "Blackpool Tower", "CN Tower"],
    correctAnswerIndex: 1,
    explanation: "This is the Eiffel Tower in Paris.",
    articleTitle: "Eiffel Tower",
    articleBody: "The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg/640px-Tour_Eiffel_Wikimedia_Commons.jpg"
  },
  {
    subject: "Sunflower",
    questionText: "Identify this flower.",
    options: ["Daisy", "Sunflower", "Marigold", "Dandelion"],
    correctAnswerIndex: 1,
    explanation: "This is a Sunflower, recognizable by its large yellow head.",
    articleTitle: "Helianthus (Sunflower)",
    articleBody: "Sunflowers possess a behavior called heliotropism. The flower buds and young blossoms will face east in the morning and follow the sun across the sky.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Sunflower_sky_backdrop.jpg/640px-Sunflower_sky_backdrop.jpg"
  },
  {
    subject: "Lion",
    questionText: "Identify this animal.",
    options: ["Tiger", "Lion", "Leopard", "Jaguar"],
    correctAnswerIndex: 1,
    explanation: "This is a Lion, known as the 'King of the Jungle', though they live in savannas.",
    articleTitle: "Lion (Panthera leo)",
    articleBody: "The lion is a large cat of the genus Panthera native to Africa and India. It has a muscular, deep-chested body, short, rounded head, round ears, and a hairy tuft at the end of its tail.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Lion_waiting_in_Namibia.jpg/640px-Lion_waiting_in_Namibia.jpg"
  },
  {
    subject: "Soccer Ball",
    questionText: "Which sport uses this ball?",
    options: ["Rugby", "Tennis", "Football (Soccer)", "Basketball"],
    correctAnswerIndex: 2,
    explanation: "This is a Soccer ball.",
    articleTitle: "Association football",
    articleBody: "Association football, more commonly known as football or soccer, is a team sport played with a spherical ball between two teams of 11 players.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Soccerball.svg/640px-Soccerball.svg.png"
  },
  {
    subject: "Statue of Liberty",
    questionText: "Identify this monument.",
    options: ["Christ the Redeemer", "Statue of Liberty", "The Motherland Calls", "Colossus of Rhodes"],
    correctAnswerIndex: 1,
    explanation: "This is the Statue of Liberty.",
    articleTitle: "Statue of Liberty",
    articleBody: "The Statue of Liberty is a colossal neoclassical sculpture on Liberty Island in New York Harbor within New York City.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Statue_of_Liberty_7.jpg/640px-Statue_of_Liberty_7.jpg"
  },
  {
    subject: "Violin",
    questionText: "Identify this instrument.",
    options: ["Cello", "Viola", "Violin", "Double Bass"],
    correctAnswerIndex: 2,
    explanation: "This is a Violin.",
    articleTitle: "Violin",
    articleBody: "The violin is a wooden chordophone (string instrument) in the violin family. It is the smallest and highest-pitched instrument in the family in regular use.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Violin_VL100.jpg/640px-Violin_VL100.jpg"
  },
  {
    subject: "Sushi",
    questionText: "Identify this dish.",
    options: ["Sashimi", "Sushi", "Tempura", "Ramen"],
    correctAnswerIndex: 1,
    explanation: "This is Sushi, a Japanese dish of vinegared rice.",
    articleTitle: "Sushi",
    articleBody: "Sushi is a traditional Japanese dish of prepared vinegared rice, usually with some sugar and salt, accompanying a variety of ingredients, such as seafood and vegetables.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Sushi_platter.jpg/640px-Sushi_platter.jpg"
  },
  {
    subject: "Microscope",
    questionText: "Identify this instrument.",
    options: ["Telescope", "Microscope", "Periscope", "Kaleidoscope"],
    correctAnswerIndex: 1,
    explanation: "This is a Microscope.",
    articleTitle: "Microscope",
    articleBody: "A microscope is a laboratory instrument used to examine objects that are too small to be seen by the naked eye.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Microscope-compound-opt-18th-century.jpg/640px-Microscope-compound-opt-18th-century.jpg"
  },
  {
    subject: "Elephant",
    questionText: "What animal is this?",
    options: ["Rhino", "Hippo", "Elephant", "Mammoth"],
    correctAnswerIndex: 2,
    explanation: "This is an Elephant.",
    articleTitle: "Elephant",
    articleBody: "Elephants are the largest existing land animals. Three species are currently recognised: the African bush elephant, the African forest elephant, and the Asian elephant.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/African_Bush_Elephant.jpg/640px-African_Bush_Elephant.jpg"
  },
  {
    subject: "Rose",
    questionText: "Identify this flower.",
    options: ["Tulip", "Rose", "Peony", "Carnation"],
    correctAnswerIndex: 1,
    explanation: "This is a Rose.",
    articleTitle: "Rose",
    articleBody: "A rose is a woody perennial flowering plant of the genus Rosa, in the family Rosaceae, or the flower it bears.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Rosa_rubiginosa_1.jpg/640px-Rosa_rubiginosa_1.jpg"
  },
  {
    subject: "Butterfly",
    questionText: "What insect is this?",
    options: ["Moth", "Butterfly", "Dragonfly", "Bee"],
    correctAnswerIndex: 1,
    explanation: "This is a Butterfly.",
    articleTitle: "Butterfly",
    articleBody: "Butterflies are insects in the macrolepidopteran clade Rhopalocera from the order Lepidoptera, which also includes moths.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Monarch_In_The_Garden.jpg/640px-Monarch_In_The_Garden.jpg"
  },
  {
    subject: "Pizza",
    questionText: "What food is this?",
    options: ["Burger", "Pizza", "Pasta", "Salad"],
    correctAnswerIndex: 1,
    explanation: "This is a Pizza.",
    articleTitle: "Pizza",
    articleBody: "Pizza is a dish of Italian origin consisting of a usually round, flat base of leavened wheat-based dough topped with tomatoes, cheese, and often various other ingredients.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Eq_it-na_pizza-margherita_sep2005_sml.jpg/640px-Eq_it-na_pizza-margherita_sep2005_sml.jpg"
  },
  {
    subject: "Guitar",
    questionText: "Identify this instrument.",
    options: ["Violin", "Guitar", "Banjo", "Ukulele"],
    correctAnswerIndex: 1,
    explanation: "This is a Guitar.",
    articleTitle: "Guitar",
    articleBody: "The guitar is a fretted musical instrument that usually has six strings.",
    base64Image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/1958_Fender_Stratocaster.jpg/640px-1958_Fender_Stratocaster.jpg"
  }
];

// --- LOGIQUE DE JEU (SANS IA) ---

export const fetchQuestionData = async (
  category: Category,
  difficulty: Difficulty
): Promise<QuestionData> => {
    let pool = TRIVIA_DATABASE[category] || [];
    if (pool.length === 0) {
        pool = GENERAL_POOL;
    } else {
        if (pool.length < 3) {
             pool = [...pool, ...GENERAL_POOL];
        }
    }
    
    // Sélection aléatoire d'une question dans la base de données statique
    const randomQ = pool[Math.floor(Math.random() * pool.length)];
    
    // Si l'image manque, on utilise une image générique de la base de données
    let imageUrl = randomQ.base64Image;
    if (!imageUrl) {
         imageUrl = GENERAL_POOL[0].base64Image; // Fallback sûr
    }

    return {
        ...randomQ,
        // FIX: Ensure subject is never empty or undefined
        subject: randomQ.subject || "Unknown Subject",
        base64Image: imageUrl
    };
};

// Alias pour compatibilité si nécessaire, mais on privilégie fetchQuestionData
export const fetchFullQuestion = fetchQuestionData;

export const getCategoryThumbnail = (category: Category): string => {
  const pool = TRIVIA_DATABASE[category];
  if (pool && pool.length > 0) {
    const randomQ = pool[Math.floor(Math.random() * pool.length)];
    return randomQ.base64Image || "";
  }
  return "";
};

// Fonction purement statique pour récupérer les images RÉELLES du menu
export const getMenuCoverImage = (type: 'CLASSIC' | 'SUBJECT' | 'CONTEST'): string => {
    return REAL_MENU_IMAGES[type] || REAL_MENU_IMAGES.CLASSIC;
};
