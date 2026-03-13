export interface NFT {
  id: string;
  name: string;
  collection: string;
  price: number;
  priceToken: number;
  image: any;
  likes: number;
  isLiked?: boolean;
  rarity: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
  owner: string;
  category: string;
  description: string;
  mintDate: string;
  royalty: number;
}

export interface Collection {
  id: string;
  name: string;
  volume: number;
  change: number;
  image: any;
  floor: number;
}

export const NFTS: NFT[] = [
  {
    id: "1",
    name: "PEPE_Frog_Nobility_0017379",
    collection: "PEPE Frog Nobility",
    price: 0.42,
    priceToken: 137,
    image: require("../assets/images/nft1.avif"),
    likes: 13712,
    rarity: "Legendary",
    owner: "CryptoKing",
    category: "Character",
    description: "A legendary PEPE frog noble with rare attributes. Part of the exclusive PEPE Frog Nobility series.",
    mintDate: "2024-01-15",
    royalty: 5,
  },
  {
    id: "2",
    name: "PEPE_Frog_Nobility_0045338",
    collection: "PEPE Frog Nobility",
    price: 0.28,
    priceToken: 91,
    image: require("../assets/images/nft2.avif"),
    likes: 2160,
    rarity: "Epic",
    owner: "BlockMaster",
    category: "Character",
    description: "A fearless PEPE warrior from the elite Frog Nobility clan. Rare cap-wearing variant.",
    mintDate: "2024-02-20",
    royalty: 7,
  },
  {
    id: "3",
    name: "Noxious_Ape_King_0099",
    collection: "Noxious Audience",
    price: 0.89,
    priceToken: 290,
    image: require("../assets/images/nft3.avif"),
    likes: 8421,
    rarity: "Legendary",
    owner: "ApeGang",
    category: "Ape",
    description: "The Ape King. Crown-wearing golden monkey from the exclusive Noxious Audience collection.",
    mintDate: "2024-01-01",
    royalty: 10,
  },
  {
    id: "4",
    name: "Giffgaff_Ape_Club_007",
    collection: "Giffgaff Ape Club",
    price: 0.67,
    priceToken: 218,
    image: require("../assets/images/nft4.avif"),
    likes: 8229,
    rarity: "Epic",
    owner: "ApeLeader",
    category: "Ape",
    description: "A regal character from the Giffgaff Ape Club. Gold crown, fierce expression, collector's item.",
    mintDate: "2024-01-22",
    royalty: 8,
  },
  {
    id: "5",
    name: "Penguin_Pals_0128",
    collection: "Penguin Pals",
    price: 0.22,
    priceToken: 72,
    image: require("../assets/images/nft5.avif"),
    likes: 8480,
    rarity: "Uncommon",
    owner: "IceCap",
    category: "Animal",
    description: "A distinguished penguin from the Penguin Pals collection. Formal tuxedo with monocle.",
    mintDate: "2024-02-01",
    royalty: 6,
  },
  {
    id: "6",
    name: "Galactic_Alien_0312",
    collection: "Galactic Beings",
    price: 0.15,
    priceToken: 49,
    image: require("../assets/images/nft6.avif"),
    likes: 987,
    rarity: "Rare",
    owner: "SpaceTrader",
    category: "Alien",
    description: "A cosmic alien entity from the Galactic Beings universe. Glowing eyes, deep-space variant.",
    mintDate: "2024-03-10",
    royalty: 5,
  },
  {
    id: "7",
    name: "RoboVault_Prime_0045",
    collection: "RoboVault",
    price: 0.33,
    priceToken: 107,
    image: require("../assets/images/nft7.avif"),
    likes: 4320,
    rarity: "Rare",
    owner: "RobotLord",
    category: "Robot",
    description: "Prime series robot from the RoboVault collection. Steel body with expressive digital eyes.",
    mintDate: "2024-02-14",
    royalty: 7,
  },
  {
    id: "8",
    name: "Noxious_Audience_0211",
    collection: "Noxious Audience",
    price: 0.51,
    priceToken: 166,
    image: require("../assets/images/nft8.avif"),
    likes: 6103,
    rarity: "Epic",
    owner: "NoxMaster",
    category: "Ape",
    description: "A bold Noxious Audience ape with punk accessories and an attitude. High-demand collector piece.",
    mintDate: "2024-01-08",
    royalty: 9,
  },
  {
    id: "9",
    name: "PEPE_Frog_Rare_0009",
    collection: "PEPE Frog Nobility",
    price: 0.74,
    priceToken: 241,
    image: require("../assets/images/nft9.avif"),
    likes: 5872,
    rarity: "Legendary",
    owner: "FrogKing",
    category: "Character",
    description: "The ultra-rare 9th edition of the PEPE Frog Nobility. Holographic background variant.",
    mintDate: "2023-12-20",
    royalty: 10,
  },
  {
    id: "10",
    name: "Treasure_Spirit_0001",
    collection: "TreasureFun Originals",
    price: 1.20,
    priceToken: 390,
    image: require("../assets/images/nft10.avif"),
    likes: 21400,
    rarity: "Legendary",
    owner: "TreasureFun",
    category: "Character",
    description: "The genesis TreasureFun original spirit. The rarest NFT in the entire TreasureFun ecosystem.",
    mintDate: "2023-11-01",
    royalty: 12,
  },
];

export const TOP_COLLECTIONS: Collection[] = [
  {
    id: "1",
    name: "Penguin Pals",
    volume: 8480.71,
    change: 12.4,
    image: require("../assets/images/nft5.avif"),
    floor: 0.22,
  },
  {
    id: "2",
    name: "Noxious Audience",
    volume: 8421.47,
    change: -2.1,
    image: require("../assets/images/nft3.avif"),
    floor: 0.89,
  },
  {
    id: "3",
    name: "Giffgaff Ape Club",
    volume: 8229.01,
    change: 5.7,
    image: require("../assets/images/nft4.avif"),
    floor: 0.67,
  },
  {
    id: "4",
    name: "PEPE Frog Nobility",
    volume: 6731.22,
    change: 8.9,
    image: require("../assets/images/nft1.avif"),
    floor: 0.42,
  },
  {
    id: "5",
    name: "TreasureFun Originals",
    volume: 5910.00,
    change: 22.1,
    image: require("../assets/images/nft10.avif"),
    floor: 1.20,
  },
];

export const RARITY_COLORS: Record<string, string> = {
  Common: "#8A9BAE",
  Uncommon: "#00AC4F",
  Rare: "#5CBFFE",
  Epic: "#A855F7",
  Legendary: "#FFD700",
};
