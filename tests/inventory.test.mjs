import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import sharp from "sharp";
import { PGlite } from "@electric-sql/pglite";
import { deductStock, cancelAndRestock, adjustStock, StockError } from "../src/cafe/lib/stockSql.ts";
import { stockState, canOrder, isAllowedImageUrl, demoImageFor } from "../src/cafe/lib/stock.ts";
import { parseItem } from "../src/cafe/lib/menuItemSchema.ts";
import { detectImageType, toProductWebp, productImageKey, MAX_UPLOAD_BYTES } from "../src/cafe/lib/imageUpload.ts";
import { liveStock, stockEtag, toMenuItemDto } from "../src/cafe/lib/liveStock.ts";

// The real stock SQL runs against an in-process Postgres loaded with the app's own schema.
let pg;
const q = (t) => async (text, params) => (await t.query(text, params)).rows;
const tx = (fn) => pg.transaction((t) => fn(q(t)));
const schema = fs.readFileSync(new URL("../scripts/cafe-schema.sql", import.meta.url), "utf8");
const seedSql = fs.readFileSync(new URL("../scripts/cafe-seed.sql", import.meta.url), "utf8");

async function reset() {
  await pg.exec(`TRUNCATE "StockMovement","OrderItem","Order","MenuItem","Category","Student","User","Cafe" CASCADE`);
  await pg.exec(`
    INSERT INTO "Cafe" (id, code, name, "updatedAt") VALUES ('cafe1','C1','Cafe 1', now()), ('cafe2','C2','Cafe 2', now());
    INSERT INTO "Category" (id, "cafeId", name, "updatedAt") VALUES ('cat1','cafe1','SNACKS', now()), ('cat2','cafe1','BEVERAGES', now());
    INSERT INTO "User" (id, email, role, "updatedAt") VALUES ('u1','s@x.in','STUDENT', now());
    INSERT INTO "Student" (id, "userId", "studentCode", name, email, department, course, year, "updatedAt") VALUES ('st1','u1','1','S','s@x.in','','',1, now());
    INSERT INTO "MenuItem" (id, "cafeId", "categoryId", name, price, "itemType", "stockQty", "lowStockThreshold", "updatedAt") VALUES
      ('chips','cafe1','cat1','Chips',20,'PACKET',5,2, now()),
      ('water','cafe1','cat2','Water',20,'PACKET',1,1, now()),
      ('chai','cafe1','cat2','Chai',15,'PREPARED',NULL,5, now());`);
}

let orderSeq = 0;
async function newOrder(t, lines, status = "PLACED") {
  const id = `o${++orderSeq}`;
  await t.query(`INSERT INTO "Order" (id, "orderNumber", "studentId", "cafeId", "totalAmount", "orderStatus", "updatedAt") VALUES ($1,$1,'st1','cafe1',0,$2,now())`, [id, status]);
  for (const l of lines) {
    await t.query(`INSERT INTO "OrderItem" (id, "orderId", "menuItemId", "itemName", quantity, "unitPrice", subtotal) VALUES ($1,$2,$3,'x',$4,1,1)`, [`${id}-${l.menuItemId}`, id, l.menuItemId, l.quantity]);
  }
  return id;
}
/** Places an order the way createOrder does: order row + stock in one transaction. */
const placeOrder = (lines) =>
  pg.transaction(async (t) => {
    const id = await newOrder(t, lines);
    await deductStock(q(t), "cafe1", id, lines);
    return id;
  });
const qty = async (id) => (await pg.query(`SELECT "stockQty" FROM "MenuItem" WHERE id = $1`, [id])).rows[0].stockQty;
const ledger = async (id) => Number((await pg.query(`SELECT COALESCE(SUM(delta),0)::int AS s FROM "StockMovement" WHERE "menuItemId" = $1`, [id])).rows[0].s);

describe("packet stock", () => {
  before(async () => {
    pg = new PGlite();
    await pg.exec(schema);
  });
  beforeEach(reset);

  it("never oversells: stock 5, 10 orders of 1 -> 5 succeed, 5 get 'sold out'", async () => {
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => placeOrder([{ menuItemId: "chips", quantity: 1 }])));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.filter((r) => r.status === "rejected");
    assert.equal(ok, 5);
    assert.equal(rejected.length, 5);
    for (const r of rejected) {
      assert.ok(r.reason instanceof StockError);
      assert.match(r.reason.message, /sold out/);
    }
    assert.equal(await qty("chips"), 0);
    assert.equal(await ledger("chips"), -5);
    assert.equal((await pg.query(`SELECT COUNT(*)::int AS n FROM "Order"`)).rows[0].n, 5, "failed orders were rolled back");
  });

  it("is all-or-nothing: a short second line leaves the first line's stock untouched", async () => {
    await assert.rejects(placeOrder([{ menuItemId: "chips", quantity: 2 }, { menuItemId: "water", quantity: 3 }]), /Only 1 left of Water/);
    assert.equal(await qty("chips"), 5);
    assert.equal(await qty("water"), 1);
    assert.equal(await ledger("chips"), 0);
  });

  it("restores stock exactly once when the same order is cancelled twice", async () => {
    const id = await placeOrder([{ menuItemId: "chips", quantity: 3 }]);
    assert.equal(await qty("chips"), 2);
    const [a, b] = await Promise.all([tx((qq) => cancelAndRestock(qq, id, "x")), tx((qq) => cancelAndRestock(qq, id, "x"))]);
    assert.deepEqual([a, b].sort(), [false, true]);
    assert.equal(await qty("chips"), 5);
    assert.equal(await ledger("chips"), 0);
  });

  it("never cancels or restocks a completed order", async () => {
    const id = await placeOrder([{ menuItemId: "chips", quantity: 2 }]);
    await pg.query(`UPDATE "Order" SET "orderStatus" = 'COMPLETED' WHERE id = $1`, [id]);
    assert.equal(await tx((qq) => cancelAndRestock(qq, id, "x")), false);
    assert.equal(await qty("chips"), 3);
  });

  it("leaves prepared items without stock", async () => {
    await placeOrder([{ menuItemId: "chai", quantity: 4 }]);
    assert.equal(await qty("chai"), null);
    assert.equal(await ledger("chai"), 0);
  });

  it("database rejects negative stock and stock on prepared items", async () => {
    await assert.rejects(pg.query(`UPDATE "MenuItem" SET "stockQty" = -1 WHERE id = 'chips'`));
    await assert.rejects(pg.query(`UPDATE "MenuItem" SET "stockQty" = 3 WHERE id = 'chai'`));
  });

  it("adjusts with a movement per change and refuses to go below zero", async () => {
    const r = await tx((qq) => adjustStock(qq, { menuItemId: "chips", cafeId: "cafe1", mode: "add", qty: 10, reason: "RESTOCK", note: "", actorUserId: null }));
    assert.deepEqual(r, { before: 5, after: 15 });
    await tx((qq) => adjustStock(qq, { menuItemId: "chips", cafeId: "cafe1", mode: "set", qty: 12, reason: "ADJUST", note: "count", actorUserId: null }));
    assert.equal(await qty("chips"), 12);
    await assert.rejects(tx((qq) => adjustStock(qq, { menuItemId: "chips", cafeId: "cafe1", mode: "remove", qty: 13, reason: "WASTAGE", note: "x", actorUserId: null })), StockError);
    await assert.rejects(tx((qq) => adjustStock(qq, { menuItemId: "chips", cafeId: "cafe2", mode: "add", qty: 1, reason: "RESTOCK", note: "", actorUserId: null })), StockError, "another cafe's item is not found");
    assert.equal(await ledger("chips"), 12 - 5);
  });

  it("demo-image backfill fills gaps once and never overwrites an upload", async () => {
    await pg.query(`UPDATE "MenuItem" SET "imageUrl" = 'https://x.public.blob.vercel-storage.com/menu/C1/a.webp' WHERE id = 'water'`);
    const backfill = seedSql.slice(seedSql.indexOf('UPDATE public."MenuItem" m SET "imageUrl"'), seedSql.indexOf("-- Sample packet products"));
    await pg.exec(backfill);
    await pg.exec(backfill);
    const rows = Object.fromEntries((await pg.query(`SELECT id, "imageUrl" FROM "MenuItem"`)).rows.map((r) => [r.id, r.imageUrl]));
    assert.equal(rows.chips, "/images/menu/demo/packet.webp");
    assert.equal(rows.chai, "/images/menu/demo/beverages.webp");
    assert.equal(rows.water, "https://x.public.blob.vercel-storage.com/menu/C1/a.webp");
  });
});

describe("stock rules", () => {
  const base = { itemType: "PACKET", lowStockThreshold: 5, expiryDate: null, isAvailable: true };
  it("labels OK / LOW / OUT / EXPIRED and blocks ordering when out or expired", () => {
    assert.equal(stockState({ ...base, stockQty: 6 }).kind, "OK");
    assert.equal(stockState({ ...base, stockQty: 5 }).kind, "LOW");
    assert.equal(stockState({ ...base, stockQty: 0 }).kind, "OUT");
    assert.equal(stockState({ ...base, stockQty: 9, expiryDate: "2020-01-01" }).kind, "EXPIRED");
    assert.equal(stockState({ ...base, itemType: "PREPARED", stockQty: null }).kind, "NA");
    assert.equal(canOrder({ ...base, stockQty: 0 }), false);
    assert.equal(canOrder({ ...base, stockQty: 1 }), true);
    assert.equal(canOrder({ ...base, stockQty: 3, isAvailable: false }), false);
  });

  it("only accepts our uploads or demo images as item photos", () => {
    assert.ok(isAllowedImageUrl("/images/menu/demo/snacks.webp"));
    assert.ok(isAllowedImageUrl("https://abc.public.blob.vercel-storage.com/menu/C1/x.webp"));
    assert.ok(!isAllowedImageUrl("https://evil.example.com/a.webp"));
    assert.ok(!isAllowedImageUrl("javascript:alert(1)"));
    assert.ok(!isAllowedImageUrl("/images/menu/demo/../../x.webp"));
    assert.equal(demoImageFor("FAST FOOD"), "/images/menu/demo/fast-food.webp");
    assert.equal(demoImageFor("SNACKS", "PACKET"), "/images/menu/demo/packet.webp");
  });

  it("student DTO has an image, live stock and no emoji / SKU / MRP", () => {
    const dto = toMenuItemDto({
      id: "i", name: "Chips", description: "", price: 20, imageUrl: null, categoryId: "c", isAvailable: true,
      itemType: "PACKET", isVeg: true, packSize: "52 g", stockQty: 3, lowStockThreshold: 5, expiryDate: null, category: { name: "SNACKS" },
      emoji: "x", sku: "S", mrp: 25,
    });
    assert.equal(dto.imageUrl, "/images/menu/demo/packet.webp");
    assert.deepEqual(dto.stock, { state: "LOW", qty: 3, available: true });
    for (const k of ["emoji", "sku", "mrp", "stockQty"]) assert.ok(!(k in dto), `${k} must not reach students`);
  });

  it("ETag changes only when stock changes", () => {
    const a = { x: liveStock({ itemType: "PACKET", stockQty: 4, lowStockThreshold: 2, expiryDate: null, isAvailable: true }) };
    const b = { x: liveStock({ itemType: "PACKET", stockQty: 3, lowStockThreshold: 2, expiryDate: null, isAvailable: true }) };
    assert.equal(stockEtag(a), stockEtag(structuredClone(a)));
    assert.notEqual(stockEtag(a), stockEtag(b));
  });
});

describe("item validation", () => {
  const ok = { name: "Chips", categoryId: "c", description: "", itemType: "PACKET", price: "20", mrp: "", isVeg: true, packSize: "52 g", sku: "CH-1", stockQty: "10", lowStockThreshold: "5", expiryDate: "", imageUrl: null, isAvailable: true };
  it("accepts a valid packet", () => assert.equal(parseItem(ok, true).ok, true));
  const bad = (patch, creating = true) => {
    const r = parseItem({ ...ok, ...patch }, creating);
    assert.equal(r.ok, false);
    return r.errors;
  };
  it("rejects bad input with field messages", () => {
    assert.ok(bad({ stockQty: "-1" }).stockQty);
    assert.ok(bad({ stockQty: "" }).stockQty, "a new packet needs a count");
    assert.ok(bad({ itemType: "PREPARED", stockQty: "4" }).stockQty, "prepared items carry no stock");
    assert.ok(bad({ price: "0" }).price);
    assert.ok(bad({ price: "100001" }).price);
    assert.ok(bad({ mrp: "10" }).mrp, "MRP below price");
    assert.ok(bad({ sku: "has space" }).sku);
    assert.ok(bad({ imageUrl: "https://evil.example.com/x.png" }).imageUrl);
    assert.ok(bad({ name: "x" }).name);
    assert.ok(bad({ expiryDate: "2001-01-01" }).expiryDate);
  });
});

describe("image upload", () => {
  const png = () => sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#c33" } }).png().toBuffer();
  it("detects the real type from the first bytes", async () => {
    assert.equal(detectImageType(await png()), "png");
    assert.equal(detectImageType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>")), null);
    assert.equal(detectImageType(Buffer.from("GIF89a....")), null);
    assert.equal(detectImageType(Buffer.from("<html><script>alert(1)</script></html>")), null);
  });
  it("rejects SVG, GIF, HTML-as-JPG and files over 2 MB", async () => {
    await assert.rejects(toProductWebp(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>")), { status: 415 });
    await assert.rejects(toProductWebp(Buffer.from("GIF89a\x01\x00\x01\x00")), { status: 415 });
    await assert.rejects(toProductWebp(Buffer.from("<!doctype html><p>hi")), { status: 415 });
    await assert.rejects(toProductWebp(Buffer.alloc(MAX_UPLOAD_BYTES + 1, 0xff)), { status: 413 });
  });
  it("re-encodes to an 800px WebP with no EXIF and a server-made name", async () => {
    const withExif = await sharp(await png()).jpeg().withMetadata({ exif: { IFD0: { Copyright: "secret-gps" } } }).toBuffer();
    assert.ok((await sharp(withExif).metadata()).exif, "fixture carries EXIF");
    const out = await toProductWebp(withExif);
    const m = await sharp(out).metadata();
    assert.equal(m.format, "webp");
    assert.equal(m.width, 800);
    assert.equal(m.height, 800);
    assert.equal(m.exif, undefined);
    assert.match(productImageKey("C1"), /^menu\/C1\/[0-9a-f-]{36}\.webp$/);
    assert.match(productImageKey("../../etc"), /^menu\/etc\//);
  });
});
