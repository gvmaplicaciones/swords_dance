// src/data/mega-evolutions-za.ts
// Megas introducidas en Pokémon Legends: Z-A (juego base + DLC Mega Dimension)

export interface ZAMegaEvolution {
  id: string
  nameEN: string
  nameES: string
  nameJA: string
  baseFormId: number
  types: string[]
  ability: string
  abilityES: string
  abilityDesc: string
  baseStats: { hp: number; atk: number; def: number; spAtk: number; spDef: number; spe: number }
  bst: number
  megaStone: string
  sprite: string
  source: string
  notes?: string
}

export const MEGA_EVOLUTIONS_ZA: ZAMegaEvolution[] = [

  // ── JUEGO BASE ────────────────────────────────────────────────────────────────

  {
    id: 'mega-dragonite',   nameEN: 'Mega Dragonite',   nameES: 'Mega Dragonite',   nameJA: 'メガカイリュー',
    baseFormId: 149, types: ['Dragon', 'Flying'],
    ability: 'Multiscale', abilityES: 'Multiscama',
    abilityDesc: 'Reduce a la mitad el daño recibido cuando los PS están al máximo',
    baseStats: { hp: 91,  atk: 124, def: 115, spAtk: 145, spDef: 125, spe: 100 }, bst: 700,
    megaStone: 'Dragoninite',   sprite: 'Menu_ZA_0149-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-meganium',    nameEN: 'Mega Meganium',    nameES: 'Mega Meganium',    nameJA: 'メガメガニウム',
    baseFormId: 154, types: ['Grass', 'Fairy'],
    ability: 'Mega Sol', abilityES: 'Mega Sol',
    abilityDesc: 'Usa moves como si hubiera sol intenso sin activar clima de campo',
    baseStats: { hp: 80,  atk: 92,  def: 115, spAtk: 143, spDef: 115, spe: 80  }, bst: 625,
    megaStone: 'Meganiumite',   sprite: 'Menu_ZA_0154-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-feraligatr',  nameEN: 'Mega Feraligatr',  nameES: 'Mega Feraligatr',  nameJA: 'メガオーダイル',
    baseFormId: 160, types: ['Water', 'Dragon'],
    ability: 'Dragonize', abilityES: 'Dragonizar',
    abilityDesc: 'Convierte moves tipo Normal en Dragón con +20% de potencia',
    baseStats: { hp: 85,  atk: 160, def: 125, spAtk: 89,  spDef: 93,  spe: 78  }, bst: 630,
    megaStone: 'Feraligatrite', sprite: 'Menu_ZA_0160-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-clefable',    nameEN: 'Mega Clefable',    nameES: 'Mega Clefable',    nameJA: 'メガピクシー',
    baseFormId: 36, types: ['Fairy', 'Flying'],
    ability: 'unconfirmed', abilityES: 'Por confirmar',
    abilityDesc: 'Pendiente de confirmación oficial en Champions',
    baseStats: { hp: 95,  atk: 80,  def: 93,  spAtk: 135, spDef: 110, spe: 70  }, bst: 583,
    megaStone: 'Clefablite',    sprite: 'Menu_ZA_0036-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-victreebel',  nameEN: 'Mega Victreebel',  nameES: 'Mega Victreebel',  nameJA: 'メガウツボット',
    baseFormId: 71, types: ['Grass', 'Poison'],
    ability: 'Innards Out', abilityES: 'Último Aliento',
    abilityDesc: 'Al ser debilitado inflige al rival daño igual a los PS restantes',
    baseStats: { hp: 80,  atk: 125, def: 85,  spAtk: 135, spDef: 95,  spe: 70  }, bst: 590,
    megaStone: 'Victrebelite', sprite: 'Menu_ZA_0071-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-starmie',     nameEN: 'Mega Starmie',     nameES: 'Mega Starmie',     nameJA: 'メガスターミー',
    baseFormId: 121, types: ['Water', 'Psychic'],
    ability: 'Huge Power', abilityES: 'Gran Poder',
    abilityDesc: 'Duplica el stat de Ataque',
    baseStats: { hp: 60,  atk: 140, def: 105, spAtk: 130, spDef: 105, spe: 120 }, bst: 660,
    megaStone: 'Starmite',      sprite: 'Menu_ZA_0121-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-skarmory',    nameEN: 'Mega Skarmory',    nameES: 'Mega Skarmory',    nameJA: 'メガエアームド',
    baseFormId: 227, types: ['Steel', 'Flying'],
    ability: 'Stalwart', abilityES: 'Perseverancia',
    abilityDesc: 'Ignora redirecciones de moves y habilidades',
    baseStats: { hp: 65,  atk: 140, def: 110, spAtk: 40,  spDef: 100, spe: 110 }, bst: 565,
    megaStone: 'Skarmite',      sprite: 'Menu_ZA_0227-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-chimecho',    nameEN: 'Mega Chimecho',    nameES: 'Mega Chimecho',    nameJA: 'メガチリーン',
    baseFormId: 358, types: ['Psychic'],
    ability: 'Levitate', abilityES: 'Levitación',
    abilityDesc: 'Inmune a moves de tipo Tierra',
    baseStats: { hp: 75,  atk: 50,  def: 90,  spAtk: 140, spDef: 130, spe: 80  }, bst: 565,
    megaStone: 'Chimechite',    sprite: 'Menu_ZA_0358-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-emboar',      nameEN: 'Mega Emboar',      nameES: 'Mega Emboar',      nameJA: 'メガエンブオー',
    baseFormId: 500, types: ['Fire', 'Fighting'],
    ability: 'Mold Breaker', abilityES: 'Rompemoldes',
    abilityDesc: 'Ignora habilidades del rival que anulen o reduzcan el daño',
    baseStats: { hp: 110, atk: 148, def: 75,  spAtk: 110, spDef: 110, spe: 75  }, bst: 628,
    megaStone: 'Emboarite',     sprite: 'Menu_ZA_0500-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-excadrill',   nameEN: 'Mega Excadrill',   nameES: 'Mega Excadrill',   nameJA: 'メガドリュウズ',
    baseFormId: 530, types: ['Ground', 'Steel'],
    ability: 'Piercing Drill', abilityES: 'Taladro Penetrante',
    abilityDesc: 'Los moves de contacto infligen ¼ del daño aunque el rival use Protección',
    baseStats: { hp: 110, atk: 165, def: 100, spAtk: 65,  spDef: 65,  spe: 103 }, bst: 608,
    megaStone: 'Excadrillite',  sprite: 'Menu_ZA_0530-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-scrafty',     nameEN: 'Mega Scrafty',     nameES: 'Mega Scrafty',     nameJA: 'メガズルズキン',
    baseFormId: 560, types: ['Dark', 'Fighting'],
    ability: 'unconfirmed', abilityES: 'Por confirmar',
    abilityDesc: 'Pendiente de confirmación oficial en Champions',
    baseStats: { hp: 65,  atk: 130, def: 135, spAtk: 55,  spDef: 135, spe: 68  }, bst: 588,
    megaStone: 'Scraftite',     sprite: 'Menu_ZA_0560-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-chandelure',  nameEN: 'Mega Chandelure',  nameES: 'Mega Chandelure',  nameJA: 'メガシャンデラ',
    baseFormId: 609, types: ['Ghost', 'Fire'],
    ability: 'Unseen Fist', abilityES: 'Puño Invisible',
    abilityDesc: 'Bypasea barreras como Reflect y Light Screen con moves de contacto',
    baseStats: { hp: 60,  atk: 75,  def: 110, spAtk: 175, spDef: 110, spe: 90  }, bst: 620,
    megaStone: 'Chandelurite',  sprite: 'Menu_ZA_0609-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-eelektross',  nameEN: 'Mega Eelektross',  nameES: 'Mega Eelektross',  nameJA: 'メガシビルドン',
    baseFormId: 604, types: ['Electric'],
    ability: 'unconfirmed', abilityES: 'Por confirmar',
    abilityDesc: 'Pendiente de confirmación oficial en Champions',
    baseStats: { hp: 85,  atk: 145, def: 80,  spAtk: 135, spDef: 90,  spe: 80  }, bst: 615,
    megaStone: 'Eelektrossite', sprite: 'Menu_ZA_0604-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-scolipede',   nameEN: 'Mega Scolipede',   nameES: 'Mega Scolipede',   nameJA: 'メガペンドラー',
    baseFormId: 545, types: ['Bug', 'Poison'],
    ability: 'unconfirmed', abilityES: 'Por confirmar',
    abilityDesc: 'Pendiente de confirmación oficial en Champions',
    baseStats: { hp: 60,  atk: 140, def: 149, spAtk: 75,  spDef: 99,  spe: 62  }, bst: 585,
    megaStone: 'Scolipedite',   sprite: 'Menu_ZA_0545-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-golurk',      nameEN: 'Mega Golurk',      nameES: 'Mega Golurk',      nameJA: 'メガゴルーグ',
    baseFormId: 623, types: ['Ground', 'Ghost'],
    ability: 'Iron Fist', abilityES: 'Puño Férreo',
    abilityDesc: 'Moves de puño tienen +30% de potencia',
    baseStats: { hp: 89,  atk: 159, def: 105, spAtk: 70,  spDef: 105, spe: 55  }, bst: 583,
    megaStone: 'Golurkite',     sprite: 'Menu_ZA_0623-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-froslass',    nameEN: 'Mega Froslass',    nameES: 'Mega Froslass',    nameJA: 'メガユキメノコ',
    baseFormId: 478, types: ['Ice', 'Ghost'],
    ability: 'Snow Warning', abilityES: 'Nevada',
    abilityDesc: 'Invoca nieve al entrar en combate',
    baseStats: { hp: 70,  atk: 80,  def: 70,  spAtk: 140, spDef: 100, spe: 120 }, bst: 580,
    megaStone: 'Froslasite',    sprite: 'Menu_ZA_0478-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-chesnaught',  nameEN: 'Mega Chesnaught',  nameES: 'Mega Chesnaught',  nameJA: 'メガブリガロン',
    baseFormId: 652, types: ['Grass', 'Fighting'],
    ability: 'Bulletproof', abilityES: 'Antibalas',
    abilityDesc: 'Inmune a moves de bola y bomba',
    baseStats: { hp: 88,  atk: 137, def: 172, spAtk: 74,  spDef: 115, spe: 44  }, bst: 630,
    megaStone: 'Chesnaughtite', sprite: 'Menu_ZA_0652-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-delphox',     nameEN: 'Mega Delphox',     nameES: 'Mega Delphox',     nameJA: 'メガマフォクシー',
    baseFormId: 655, types: ['Fire', 'Psychic'],
    ability: 'Levitate', abilityES: 'Levitación',
    abilityDesc: 'Inmune a moves de tipo Tierra',
    baseStats: { hp: 75,  atk: 79,  def: 75,  spAtk: 159, spDef: 105, spe: 134 }, bst: 627,
    megaStone: 'Delphoxite',    sprite: 'Menu_ZA_0655-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-greninja',    nameEN: 'Mega Greninja',    nameES: 'Mega Greninja',    nameJA: 'メガゲッコウガ',
    baseFormId: 658, types: ['Water', 'Dark'],
    ability: 'Protean', abilityES: 'Proteico',
    abilityDesc: 'Cambia el tipo del usuario al del move que va a usar',
    baseStats: { hp: 72,  atk: 125, def: 75,  spAtk: 133, spDef: 85,  spe: 142 }, bst: 632,
    megaStone: 'Greninjaite',   sprite: 'Menu_ZA_0658-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-hawlucha',    nameEN: 'Mega Hawlucha',    nameES: 'Mega Hawlucha',    nameJA: 'メガルチャブル',
    baseFormId: 701, types: ['Fighting', 'Flying'],
    ability: 'unconfirmed', abilityES: 'Por confirmar',
    abilityDesc: 'Pendiente de confirmación oficial en Champions',
    baseStats: { hp: 78,  atk: 150, def: 85,  spAtk: 84,  spDef: 75,  spe: 128 }, bst: 600,
    megaStone: 'Hawluchite',    sprite: 'Menu_ZA_0701-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-drampa',      nameEN: 'Mega Drampa',      nameES: 'Mega Drampa',      nameJA: 'メガジジーロン',
    baseFormId: 780, types: ['Normal', 'Dragon'],
    ability: 'unconfirmed', abilityES: 'Por confirmar',
    abilityDesc: 'Pendiente de confirmación oficial en Champions',
    baseStats: { hp: 89,  atk: 75,  def: 70,  spAtk: 185, spDef: 100, spe: 45  }, bst: 564,
    megaStone: 'Drampite',      sprite: 'Menu_ZA_0780-Mega.png', source: 'legends-za',
  },
  {
    id: 'mega-zygarde',     nameEN: 'Mega Zygarde',     nameES: 'Mega Zygarde',     nameJA: 'メガジガルデ',
    baseFormId: 718, types: ['Dragon', 'Ground'],
    ability: 'unconfirmed', abilityES: 'Por confirmar',
    abilityDesc: 'Solo activa cuando Zygarde base está al 50% o menos de PS',
    baseStats: { hp: 216, atk: 70,  def: 91,  spAtk: 216, spDef: 85,  spe: 100 }, bst: 778,
    megaStone: 'Zygardite',     sprite: 'Menu_ZA_0718-Mega.png', source: 'legends-za',
    notes: 'Forma Completa. +70 BST (excepción). Activa solo bajo 50% PS.',
  },

  // ── DLC MEGA DIMENSION ────────────────────────────────────────────────────────

  {
    id: 'mega-raichu-x',    nameEN: 'Mega Raichu X',    nameES: 'Mega Raichu X',    nameJA: 'メガライチュウX',
    baseFormId: 26,  types: ['Electric'],
    ability: 'unconfirmed', abilityES: 'Por confirmar',
    abilityDesc: 'Pendiente de confirmación oficial en Champions',
    baseStats: { hp: 60,  atk: 135, def: 95,  spAtk: 90,  spDef: 95,  spe: 110 }, bst: 585,
    megaStone: 'Raichunite X',  sprite: 'Menu_ZA_0026-Mega X.png', source: 'mega-dimension',
  },
  {
    id: 'mega-meowstic',    nameEN: 'Mega Meowstic',    nameES: 'Mega Meowstic',    nameJA: 'メガニャオニクス',
    baseFormId: 678, types: ['Psychic'],
    ability: 'unconfirmed', abilityES: 'Por confirmar',
    abilityDesc: 'Pendiente de confirmación oficial en Champions',
    baseStats: { hp: 74,  atk: 48,  def: 76,  spAtk: 143, spDef: 101, spe: 124 }, bst: 566,
    megaStone: 'Meowstite',     sprite: 'Menu_ZA_0678-Mega.png', source: 'mega-dimension',
  },
  {
    id: 'mega-crabominable', nameEN: 'Mega Crabominable', nameES: 'Mega Crabominable', nameJA: 'メガケケンカニ',
    baseFormId: 740, types: ['Fighting', 'Ice'],
    ability: 'unconfirmed', abilityES: 'Por confirmar',
    abilityDesc: 'Pendiente de confirmación oficial en Champions',
    baseStats: { hp: 97,  atk: 157, def: 122, spAtk: 62,  spDef: 107, spe: 33  }, bst: 578,
    megaStone: 'Crabominite',   sprite: 'Menu_ZA_0740-Mega.png', source: 'mega-dimension',
  },
  {
    id: 'mega-zeraora',     nameEN: 'Mega Zeraora',     nameES: 'Mega Zeraora',     nameJA: 'メガゼラオラ',
    baseFormId: 807, types: ['Electric'],
    ability: 'unconfirmed', abilityES: 'Por confirmar',
    abilityDesc: 'Pendiente de confirmación oficial en Champions',
    baseStats: { hp: 88,  atk: 157, def: 75,  spAtk: 147, spDef: 80,  spe: 153 }, bst: 700,
    megaStone: 'Zeraite',       sprite: 'Menu_ZA_0807-Mega.png', source: 'mega-dimension',
  },
  {
    id: 'mega-scovillain',  nameEN: 'Mega Scovillain',  nameES: 'Mega Scovillain',  nameJA: 'メガカプサイジ',
    baseFormId: 952, types: ['Grass', 'Fire'],
    ability: 'unconfirmed', abilityES: 'Por confirmar',
    abilityDesc: 'Pendiente de confirmación oficial en Champions',
    baseStats: { hp: 65,  atk: 138, def: 85,  spAtk: 138, spDef: 85,  spe: 75  }, bst: 586,
    megaStone: 'Scovillainite', sprite: 'Menu_ZA_0952-Mega.png', source: 'mega-dimension',
  },
  {
    id: 'mega-glimmora',    nameEN: 'Mega Glimmora',    nameES: 'Mega Glimmora',    nameJA: 'メガグレンアルマ',
    baseFormId: 970, types: ['Rock', 'Poison'],
    ability: 'unconfirmed', abilityES: 'Por confirmar',
    abilityDesc: 'Pendiente de confirmación oficial en Champions',
    baseStats: { hp: 83,  atk: 90,  def: 105, spAtk: 150, spDef: 96,  spe: 101 }, bst: 625,
    megaStone: 'Glimmorite',    sprite: 'Menu_ZA_0970-Mega.png', source: 'mega-dimension',
  },

  // ── ESPECIALES ────────────────────────────────────────────────────────────────

  {
    id: 'mega-floette',     nameEN: 'Mega Floette',     nameES: 'Mega Floette',     nameJA: 'メガフラエッテ',
    baseFormId: 670, types: ['Fairy'],
    ability: 'fairy-aura', abilityES: 'Aura Feérica',
    abilityDesc: 'Aumenta la potencia de los moves de tipo Hada de todos los Pokémon en combate ×1.33. Se invierte si hay un Pokémon con Rompeaura en combate.',
    baseStats: { hp: 74,  atk: 65,  def: 87,  spAtk: 150, spDef: 148, spe: 100 }, bst: 624,
    megaStone: 'Floettelite',   sprite: 'Menu_ZA_0670-Mega.png', source: 'mega-dimension',
    notes: 'Habilidad oficial confirmada. Stats pendientes de confirmación oficial.',
  },
]

export function getMegasForPokemon(baseFormId: number): ZAMegaEvolution[] {
  return MEGA_EVOLUTIONS_ZA.filter(m => m.baseFormId === baseFormId)
}

export function hasZAMega(baseFormId: number): boolean {
  return MEGA_EVOLUTIONS_ZA.some(m => m.baseFormId === baseFormId)
}
