// Lista oficial de Pokémon de Pokémon Champions v1.0.2
// Fuente: WikiDex — Lista de Pokémon de Pokémon Champions
// Incluye formas regionales y alternativas con sus IDs de PokeAPI

// ─── IDs principales (forma base) ────────────────────────────────────────────
export const CHAMPIONS_IDS = [
  3,    // Venusaur
  6,    // Charizard
  9,    // Blastoise
  15,   // Beedrill
  18,   // Pidgeot
  24,   // Arbok
  25,   // Pikachu
  26,   // Raichu
  36,   // Clefable
  38,   // Ninetales
  59,   // Arcanine
  65,   // Alakazam
  68,   // Machamp
  71,   // Victreebel
  80,   // Slowbro
  94,   // Gengar
  115,  // Kangaskhan
  121,  // Starmie
  127,  // Pinsir
  128,  // Tauros
  130,  // Gyarados
  132,  // Ditto
  134,  // Vaporeon
  135,  // Jolteon
  136,  // Flareon
  142,  // Aerodactyl
  143,  // Snorlax
  149,  // Dragonite
  154,  // Meganium
  157,  // Typhlosion
  160,  // Feraligatr
  168,  // Ariados
  181,  // Ampharos
  184,  // Azumarill
  186,  // Politoed
  196,  // Espeon
  197,  // Umbreon
  199,  // Slowking
  205,  // Forretress
  208,  // Steelix
  212,  // Scizor
  214,  // Heracross
  227,  // Skarmory
  229,  // Houndoom
  248,  // Tyranitar
  279,  // Pelipper
  282,  // Gardevoir
  302,  // Sableye
  306,  // Aggron
  308,  // Medicham
  310,  // Manectric
  319,  // Sharpedo
  323,  // Camerupt
  324,  // Torkoal
  334,  // Altaria
  350,  // Milotic
  351,  // Castform
  354,  // Banette
  358,  // Chimecho
  359,  // Absol
  362,  // Glalie
  389,  // Torterra
  392,  // Infernape
  395,  // Empoleon
  405,  // Luxray
  407,  // Roserade
  409,  // Rampardos
  411,  // Bastiodon
  428,  // Lopunny
  442,  // Spiritomb
  445,  // Garchomp
  448,  // Lucario
  450,  // Hippowdon
  454,  // Toxicroak
  460,  // Abomasnow
  461,  // Weavile
  464,  // Rhyperior
  470,  // Leafeon
  471,  // Glaceon
  472,  // Gliscor
  473,  // Mamoswine
  475,  // Gallade
  478,  // Froslass
  479,  // Rotom (base)
  497,  // Serperior
  500,  // Emboar
  503,  // Samurott
  505,  // Watchog
  510,  // Liepard
  512,  // Simisage
  514,  // Simisear
  516,  // Simipour
  530,  // Excadrill
  531,  // Audino
  534,  // Conkeldurr
  547,  // Whimsicott
  553,  // Krookodile
  563,  // Cofagrigus
  569,  // Garbodor
  571,  // Zoroark
  579,  // Reuniclus
  584,  // Vanilluxe
  587,  // Emolga
  609,  // Chandelure
  614,  // Beartic
  618,  // Stunfisk
  623,  // Golurk
  635,  // Hydreigon
  637,  // Volcarona
  652,  // Chesnaught
  655,  // Delphox
  658,  // Greninja
  660,  // Diggersby
  663,  // Talonflame
  666,  // Vivillon
  670,  // Floette eterna (forma especial)
  671,  // Florges
  675,  // Pangoro
  676,  // Furfrou
  678,  // Meowstic
  681,  // Aegislash
  683,  // Aromatisse
  685,  // Slurpuff
  693,  // Clawitzer
  695,  // Heliolisk
  697,  // Tyrantrum
  699,  // Aurorus
  700,  // Sylveon
  701,  // Hawlucha
  702,  // Dedenne
  706,  // Goodra
  707,  // Klefki
  709,  // Trevenant
  711,  // Gourgeist
  713,  // Avalugg
  715,  // Noivern
  724,  // Decidueye
  727,  // Incineroar
  730,  // Primarina
  733,  // Toucannon
  740,  // Crabominable
  745,  // Lycanroc (mediodía)
  748,  // Toxapex
  750,  // Mudsdale
  752,  // Araquanid
  758,  // Salazzle
  763,  // Tsareena
  765,  // Oranguru
  766,  // Passimian
  778,  // Mimikyu
  780,  // Drampa
  784,  // Kommo-o
  823,  // Corviknight
  841,  // Flapple
  842,  // Appletun
  844,  // Sandaconda
  855,  // Polteageist
  858,  // Hatterene
  866,  // Mr. Rime
  867,  // Runerigus
  869,  // Alcremie
  877,  // Morpeko
  887,  // Dragapult
  899,  // Wyrdeer
  900,  // Kleavor
  902,  // Basculegion
  903,  // Sneasler
  908,  // Meowscarada
  911,  // Skeledirge
  914,  // Quaquaval
  925,  // Maushold
  934,  // Garganacl
  936,  // Armarouge
  937,  // Ceruledge
  939,  // Bellibolt
  952,  // Scovillain
  956,  // Espathra
  959,  // Tinkaton
  964,  // Palafin (heroica)
  968,  // Orthworm
  970,  // Glimmora
  981,  // Farigiraf
  983,  // Kingambit
  1013, // Sinistcha
  1018, // Archaludon
  1019, // Hydrapple
]

// ─── Formas regionales y alternativas ────────────────────────────────────────
// Estas formas tienen IDs propios en PokeAPI distintos al Pokémon base
// Hay que buscarlos por nombre en la API: /pokemon/{nombre-forma}
export const CHAMPIONS_REGIONAL_FORMS = [
  // Nombre en PokeAPI → para fetch
  'raichu-alola',           // Raichu de Alola
  'ninetales-alola',        // Ninetales de Alola
  'arcanine-hisui',         // Arcanine de Hisui
  'slowbro-galar',          // Slowbro de Galar
  'slowking-galar',         // Slowking de Galar
  'typhlosion-hisui',       // Typhlosion de Hisui
  'tauros-paldea-combat',   // Tauros de Paldea combatiente
  'tauros-paldea-blaze',    // Tauros de Paldea ardiente
  'tauros-paldea-aqua',     // Tauros de Paldea acuática
  'samurott-hisui',         // Samurott de Hisui
  'zoroark-hisui',          // Zoroark de Hisui
  'stunfisk-galar',         // Stunfisk de Galar
  'goodra-hisui',           // Goodra de Hisui
  'avalugg-hisui',          // Avalugg de Hisui
  'decidueye-hisui',        // Decidueye de Hisui
  'lycanroc-midnight',      // Lycanroc nocturno
  'lycanroc-dusk',          // Lycanroc crepuscular
  'rotom-heat',             // Rotom calor
  'rotom-wash',             // Rotom lavado
  'rotom-frost',            // Rotom frío
  'rotom-mow',              // Rotom corte
  'rotom-fan',              // Rotom ventilador
  'basculegion-f',          // Basculegion hembra
  'meowstic-f',             // Meowstic hembra
]

// ─── Notas sobre formas especiales ───────────────────────────────────────────
// - Floette eterna (670): forma especial, puede no estar en PokeAPI estándar
// - Aegislash (681): tiene forma escudo y espada, la base es escudo
// - Palafin heroica (964): forma heroica, base es palafin-zero
// - Morpeko (877): tiene forma saciada y hambrienta
// - Castform (351): tiene formas según clima pero la base es normal
// - Lycanroc (745): 3 formas, mediodía es la base
