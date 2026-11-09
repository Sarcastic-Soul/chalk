import "server-only";

/**
 * A ready-made café so a judge can try every feature in under a minute.
 * Photos live in our Cloudinary folder (CC0 / public domain from Wikimedia Commons,
 * menu and chalkboard made for this project).
 */
export const DEMO_SHOP = {
  name: "Frozen Cashew",
  city: "Bengaluru",
  hours: "08:00-20:00",
  closedDays: [1],
  voice: "warm, a little playful, short sentences, talks like the person behind the counter",
  brandColor: "#c2512f",
  currency: "₹",
};

export const DEMO_PHOTOS = {
  menu: "chalk/uploads/demo_menu",
  chalkboard: "chalk/uploads/demo_chalkboard",
};

export const DEMO_PRODUCTS: {
  name: string;
  category: string;
  price: string;
  description: string;
  photo?: string;
}[] = [
  { name: "Espresso", category: "Coffee", price: "₹120", description: "" },
  { name: "Cappuccino", category: "Coffee", price: "₹160", description: "", photo: "chalk/uploads/demo_cappuccino" },
  { name: "Flat White", category: "Coffee", price: "₹170", description: "", photo: "chalk/uploads/demo_latte_art" },
  { name: "Cold Brew", category: "Coffee", price: "₹190", description: "", photo: "chalk/uploads/demo_iced_coffee" },
  { name: "Iced Cashew Latte", category: "Coffee", price: "₹220", description: "house cashew milk", photo: "chalk/uploads/demo_iced_coffee" },
  { name: "Butter Croissant", category: "Bakes", price: "₹140", description: "", photo: "chalk/uploads/demo_croissants" },
  { name: "Cinnamon Roll", category: "Bakes", price: "₹160", description: "", photo: "chalk/uploads/demo_cinnamon_bread" },
  { name: "Banana Walnut Bread", category: "Bakes", price: "₹130", description: "", photo: "chalk/uploads/demo_pastry_counter" },
  { name: "Pumpkin Loaf", category: "Bakes", price: "₹150", description: "warm, with salted butter" },
  { name: "Choc Chip Cookie", category: "Bakes", price: "₹90", description: "", photo: "chalk/uploads/demo_pastry_counter" },
];
