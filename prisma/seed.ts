/* eslint-disable no-console */
// Cafes, categories and menus for CafeConnect. Safe to re-run: does nothing if cafes already exist.
// No accounts are created here: people sign in through the portal; staff are added in Admin > Staff.
// The same data ships as plain SQL in scripts/cafe-seed.sql (used by `npm run db:setup`).
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────── DATA ───────────────────────────────

const CAFES = [
  {
    code: 'C1', name: 'Cafe 1 · Chai Point', emoji: '🫖',
    description: 'The original campus chai counter — quick bites, hot drinks and friendly service right inside the main building.',
    location: 'Block A, Main Building', opening: '08:00', closing: '20:00',
  },
  {
    code: 'C2', name: 'Cafe 2 · Food Junction', emoji: '🍔',
    description: 'The busiest spot on campus. Burgers, thalis, pizza and everything in between — best around lunch and evening.',
    location: 'Main Gate, Food Court', opening: '08:30', closing: '21:00',
  },
  {
    code: 'C3', name: 'Cafe 3 · Fresh Bites', emoji: '🥪',
    description: 'Light meals and fresh juices on the library floor. A calm corner for breaks between classes.',
    location: 'Library Block, 2nd Floor', opening: '09:00', closing: '19:00',
  },
];

const CATEGORIES = [
  ['SNACKS', 'Quick savoury bites'],
  ['BEVERAGES', 'Hot & cold drinks'],
  ['FAST FOOD', 'Burgers, wraps & more'],
  ['MEALS', 'Hearty full meals'],
  ['DESSERTS', 'Something sweet'],
];

type ItemDef = { name: string; desc: string; price: number; emoji: string; cat: number; unavail?: boolean };

const MENUS: Record<string, ItemDef[]> = {
  C1: [
    { name: 'Masala Chai', desc: 'Strong, spiced and brewed the classic way', price: 20, emoji: '🫖', cat: 1 },
    { name: 'Filter Coffee', desc: 'South-Indian style frothy filter coffee', price: 30, emoji: '☕', cat: 1 },
    { name: 'Cold Coffee', desc: 'Thick, creamy and chilled', price: 60, emoji: '🥤', cat: 1 },
    { name: 'Lime Soda', desc: 'Freshly squeezed lime with soda', price: 30, emoji: '🍋', cat: 1 },
    { name: 'Orange Juice', desc: '100% fresh pressed, no added sugar', price: 50, emoji: '🍊', cat: 1 },
    { name: 'Masala Chaas', desc: 'Spiced buttermilk — the ultimate refresher', price: 25, emoji: '🥛', cat: 1 },
    { name: 'Samosa', desc: 'Crispy potato-filled snack with chutney', price: 15, emoji: '🥟', cat: 0 },
    { name: 'Kachori', desc: 'Flaky pastry stuffed with spiced peas', price: 12, emoji: '🧆', cat: 0 },
    { name: 'Spring Roll (Veg)', desc: 'Crunchy veggie roll, 2 pcs', price: 40, emoji: '🌯', cat: 0 },
    { name: 'Cheese Toastie', desc: 'Grilled bread with melted cheese', price: 50, emoji: '🥪', cat: 2 },
    { name: 'Maggi', desc: 'Street-style masala maggi', price: 40, emoji: '🍜', cat: 2 },
    { name: 'Momos (6 pcs)', desc: 'Steamed veg momos with spicy chutney', price: 45, emoji: '🥟', cat: 2 },
    { name: 'Dosa', desc: 'Crispy dosa with sambar and chutney', price: 40, emoji: '🫓', cat: 3 },
    { name: 'Chole Bhature', desc: 'Puffed bhature with spicy chole, 2 pcs', price: 60, emoji: '🍛', cat: 3 },
    { name: 'Ice Cream (2 scoops)', desc: 'Vanilla / butterscotch / mango', price: 50, emoji: '🍨', cat: 4 },
    { name: 'Pastry', desc: 'Caramel pastry, baked fresh daily', price: 45, emoji: '🥐', cat: 4, unavail: true },
  ],
  C2: [
    { name: 'Paneer Burger', desc: 'Grilled paneer patty, potato mayo', price: 80, emoji: '🍔', cat: 2 },
    { name: 'Veg Pizza Slice', desc: 'Cheesy veg pizza, 1 slice', price: 60, emoji: '🍕', cat: 2 },
    { name: 'French Fries', desc: 'Golden fries with peri-peri dust', price: 50, emoji: '🍟', cat: 2 },
    { name: 'Chicken Nuggets (6)', desc: 'Crispy nuggets with two dips', price: 80, emoji: '🍗', cat: 2, unavail: true },
    { name: 'Pav Bhaji', desc: 'Mumbai-style buttery pav bhaji', price: 60, emoji: '🍲', cat: 2 },
    { name: 'Grilled Sandwich', desc: 'Triple-decker loaded veg sandwich', price: 50, emoji: '🥪', cat: 2 },
    { name: 'Veg Roll', desc: 'Paratha roll with spicy aloo masala', price: 60, emoji: '🌯', cat: 2 },
    { name: 'Cold Drink', desc: 'Cola / lemon / mango, 750ml', price: 30, emoji: '🥤', cat: 1 },
    { name: 'Fresh Juice', desc: 'Orange / watermelon / mixed fruit', price: 60, emoji: '🧃', cat: 1 },
    { name: 'Masala Chaas', desc: 'Chilled spiced buttermilk', price: 25, emoji: '🥛', cat: 1 },
    { name: 'Veg Cold Coffee', desc: 'Vegan cold coffee, no dairy', price: 70, emoji: '☕', cat: 1 },
    { name: 'Dal Tadka Thali', desc: 'Rice, 2 sabzi, dal tadka, salad', price: 90, emoji: '🍱', cat: 3 },
    { name: 'Chole Bhature', desc: '2 bhature with chole and kachumber', price: 70, emoji: '🍛', cat: 3 },
    { name: 'Gulab Jamun (2)', desc: 'Soft, warm and soaked in syrup', price: 30, emoji: '🍮', cat: 4 },
    { name: 'Choco Brownie', desc: 'Fudgy brownie with walnut', price: 60, emoji: '🍫', cat: 4 },
  ],
  C3: [
    { name: 'Fresh Juice', desc: 'Seasonal fruits, no sugar added', price: 60, emoji: '🧃', cat: 1 },
    { name: 'Fruit Salad', desc: 'Daily-cut seasonal fruits', price: 80, emoji: '🥗', cat: 1 },
    { name: 'Lassi', desc: 'Sweet Punjabi lassi', price: 45, emoji: '🥛', cat: 1 },
    { name: 'Cold Coffee', desc: 'Frothy café-style cold coffee', price: 70, emoji: '☕', cat: 1 },
    { name: 'Samosa (2 pcs)', desc: 'Hot samosas with mint chutney', price: 30, emoji: '🥟', cat: 0 },
    { name: 'Veg Spring Roll', desc: 'Hand-rolled, 2 pcs', price: 55, emoji: '🌯', cat: 0 },
    { name: 'Salted Muffin', desc: 'Buttery sesame muffin', price: 50, emoji: '🧁', cat: 0 },
    { name: 'Veg Burger', desc: 'Classic veggie patty burger', price: 65, emoji: '🍔', cat: 2 },
    { name: 'Club Sandwich', desc: 'Toasted club, cut in quarters', price: 70, emoji: '🥪', cat: 2 },
    { name: 'Maggi', desc: 'Loaded masala maggi', price: 45, emoji: '🍜', cat: 2 },
    { name: 'Masala Dosa', desc: 'Potato masala dosa with sambar', price: 50, emoji: '🫓', cat: 3 },
    { name: 'Veg Thali', desc: 'Rice, dal, 2 sabzi, curd, salad', price: 110, emoji: '🍱', cat: 3 },
    { name: 'Ice Cream Cup', desc: '3 scoops of your choice', price: 45, emoji: '🍨', cat: 4 },
    { name: 'Pastry Box', desc: 'Assorted pastry box (4 pcs)', price: 70, emoji: '🥧', cat: 4 },
  ],
};

async function main() {
  if ((await prisma.cafe.count()) > 0) {
    console.log('Cafes already exist; nothing to do.');
    return;
  }
  for (const c of CAFES) {
    const cafe = await prisma.cafe.create({
      data: {
        code: c.code, name: c.name, description: c.description, location: c.location,
        coverEmoji: c.emoji, openingTime: c.opening, closingTime: c.closing,
      },
    });
    const cats: string[] = [];
    for (let i = 0; i < CATEGORIES.length; i++) {
      const cat = await prisma.category.create({
        data: { cafeId: cafe.id, name: CATEGORIES[i][0], description: CATEGORIES[i][1], sortOrder: i },
      });
      cats.push(cat.id);
    }
    for (const m of MENUS[c.code]) {
      await prisma.menuItem.create({
        data: {
          cafeId: cafe.id, categoryId: cats[m.cat], name: m.name, description: m.desc,
          price: m.price, emoji: m.emoji, isAvailable: !m.unavail,
        },
      });
    }
  }
  const items = await prisma.menuItem.count();
  console.log(`Seeded ${CAFES.length} cafes and ${items} menu items.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
