import "server-only";

/**
 * A ready-made café so a judge can try every feature in under a minute.
 * Photos live in our Cloudinary folder: Wikimedia Commons images under CC0, public
 * domain, CC BY or CC BY-SA (credits in README), plus a menu and chalkboard made for
 * this project.
 */
export const DEMO_SHOP = {
  name: "Frozen Cashew",
  city: "Melbourne",
  hours: "08:00-20:00",
  closedDays: [1],
  voice: "warm, a little playful, short sentences, talks like the person behind the counter",
  brandColor: "#c2512f",
  currency: "$",
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
  { name: "Espresso", category: "Coffee", price: "$4", description: "" },
  { name: "Cappuccino", category: "Coffee", price: "$5", description: "", photo: "chalk/uploads/demo_cappuccino" },
  { name: "Flat White", category: "Coffee", price: "$5.50", description: "", photo: "chalk/uploads/demo_latte_art" },
  { name: "Cold Brew", category: "Coffee", price: "$6", description: "", photo: "chalk/uploads/demo_iced_coffee" },
  { name: "Iced Cashew Latte", category: "Coffee", price: "$7", description: "house cashew milk", photo: "chalk/uploads/demo_iced_coffee" },
  { name: "Butter Croissant", category: "Bakes", price: "$5", description: "", photo: "chalk/uploads/demo_croissants" },
  { name: "Cinnamon Roll", category: "Bakes", price: "$5.50", description: "", photo: "chalk/uploads/demo_cinnamon_bread" },
  { name: "Banana Walnut Bread", category: "Bakes", price: "$5", description: "", photo: "chalk/uploads/demo_banana_bread" },
  { name: "Pumpkin Loaf", category: "Bakes", price: "$5.50", description: "warm, with salted butter", photo: "chalk/uploads/demo_pumpkin_loaf" },
  { name: "Choc Chip Cookie", category: "Bakes", price: "$3.50", description: "", photo: "chalk/uploads/demo_cookie" },
];
