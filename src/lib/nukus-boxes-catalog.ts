export interface NukusBoxModel {
  id: string;
  name: string;
  dimensions: string;
  price: number;
  colors: string[];
  isExclusiveColor?: boolean;
  description?: string;
}

export const NUKUS_BOX_CATALOG: NukusBoxModel[] = [
  {
    id: "cylinder_20_20",
    name: "Цилиндр",
    dimensions: "20?20 см",
    price: 60000,
    colors: ["Черный", "Белый"],
    description: "Классическая круглая коробка цилиндр",
  },
  {
    id: "oval_20_30",
    name: "Овальные",
    dimensions: "20?30 см",
    price: 60000,
    colors: ["Черный", "Белый"],
    description: "Элегантная овальная коробка для цветов и подарков",
  },
  {
    id: "barrel",
    name: "Бочки",
    dimensions: "Стандарт",
    price: 210000,
    colors: ["Черный", "Белый"],
    description: "Объемная премиум коробка в форме бочонка",
  },
  {
    id: "gul_edition",
    name: "Гуль эдишн",
    dimensions: "Фирменный",
    price: 110000,
    colors: ["Черный", "Белый"],
    description: "Специальная серия цветочных коробок «Гуль эдишн»",
  },
  {
    id: "big_round_46_45",
    name: "Большие круглые",
    dimensions: "46?45 см",
    price: 190000,
    colors: ["Черный", "Белый"],
    description: "Большая глубокая круглая коробка под композиции",
  },
  {
    id: "tandyr_60_60",
    name: "Тандыр",
    dimensions: "60?60 см",
    price: 400000,
    colors: ["Черный", "Белый"],
    description: "Крупногабаритная коробка супер-формата «Тандыр»",
  },
  {
    id: "moon_symphony",
    name: "Лунная симфония",
    dimensions: "Эксклюзив",
    price: 800000,
    colors: ["Фирменный / Эксклюзив"],
    isExclusiveColor: true,
    description: "Люксовая флагманская коробка с эксклюзивным покрытием",
  },
];
