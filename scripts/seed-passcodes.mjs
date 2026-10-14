// Generates a random passcode per sample user, prints them once, and writes
// bcrypt hashes + a JWT secret into .env.local. Dev use only.
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";

const ids = ["20070", "18915", "18221", "1234", "1532"];
const hashes = {};
for (const id of ids) {
  const pass = crypto.randomInt(100000, 999999).toString();
  hashes[id] = bcrypt.hashSync(pass, 10);
  console.log(`${id}: ${pass}`);
}
const file = ".env.local";
let env = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const set = (k, v) => {
  env = env.split("\n").filter((l) => !l.startsWith(k + "=")).join("\n");
  env = env.replace(/\n*$/, "\n") + `${k}=${v}\n`;
};
// base64 so bcrypt's `$` characters survive .env variable expansion
set("PASSCODE_HASHES", Buffer.from(JSON.stringify(hashes)).toString("base64"));
if (!/^JWT_SECRET=/m.test(env)) set("JWT_SECRET", crypto.randomBytes(32).toString("hex"));
fs.writeFileSync(file, env);
console.log("\nWrote hashes to .env.local. Add GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_CLIENT_ID yourself.");
