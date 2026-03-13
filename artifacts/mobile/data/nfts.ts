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
    image: require("../assets/images/nft1.png"),
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
    name: "RoboVault_Prime_0045",
    collection: "RoboVault",
    price: 0.28,
    priceToken: 91,
    image: require("../assets/images/nft2.png"),
    likes: 2160,
    rarity: "Epic",
    owner: "BlockMaster",
    category: "Robot",
    description: "Prime series robot from the RoboVault collection. Chrome body with glowing eyes.",
    mintDate: "2024-02-20",
    royalty: 7,
  },
  {
    id: "3",
    name: "Noxious_Ape_King_0099",
    collection: "Noxious Audience",
    price: 0.89,
    priceToken: 290,
    image: require("../assets/images/nft3.png"),
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
    name: "Galactic_Alien_0312",
    collection: "Galactic Beings",
    price: 0.15,
    priceToken: 49,
    image: require("../assets/images/nft4.png"),
    likes: 987,
    rarity: "Rare",
    owner: "SpaceTrader",
    category: "Alien",
    description: "A cosmic alien entity from the Galactic Beings universe. Glowing green with deep purple eyes.",
    mintDate: "2024-03-10",
    royalty: 5,
  },
  {
    id: "5",
    name: "Penguin_Pals_0128",
    collection: "Penguin Pals",
    price: 0.22,
    priceToken: 72,
    image: require("../assets/images/nft5.png"),
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
    name: "Giffgaff_Ape_Club_007",
    collection: "Giffgaff Ape Club",
    price: 0.67,
    priceToken: 218,
    image: require("../assets/images/nft6.png"),
    likes: 8229,
    rarity: "Epic",
    owner: "ApeLeader",
    category: "Ape",
    description: "An epic lion king from the Giffgaff Ape Club. Gold crown, purple mane, regal energy.",
    mintDate: "2024-01-22",
    royalty: 8,
  },
];

export const TOP_COLLECTIONS: Collection[] = [
  {
    id: "1",
    name: "Penguin Pals",
    volume: 8480.71,
    change: 12.4,
    image: require("../assets/images/nft5.png"),
    floor: 0.22,
  },
  {
    id: "2",
    name: "Noxious Audience",
    volume: 8421.47,
    change: -2.1,
    image: require("../assets/images/nft3.png"),
    floor: 0.89,
  },
  {
    id: "3",
    name: "Giffgaff Ape Club",
    volume: 8229.01,
    change: 5.7,
    image: require("../assets/images/nft6.png"),
    floor: 0.67,
  },
  {
    id: "4",
    name: "PEPE Frog Nobility",
    volume: 6731.22,
    change: 8.9,
    image: require("../assets/images/nft1.png"),
    floor: 0.42,
  },
  {
    id: "5",
    name: "Galactic Beings",
    volume: 3129.55,
    change: -0.5,
    image: require("../assets/images/nft4.png"),
    floor: 0.15,
  },
];

export const RARITY_COLORS: Record<string, string> = {
  Common: "#8A9BAE",
  Uncommon: "#00AC4F",
  Rare: "#5CBFFE",
  Epic: "#A855F7",
  Legendary: "#FFD700",
};
