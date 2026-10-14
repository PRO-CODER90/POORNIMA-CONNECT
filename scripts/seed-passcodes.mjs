// Dev helper. Writes PASSCODE_HASHES (base64 JSON of bcrypt hashes) and a JWT_SECRET to .env.local.
//   node scripts/seed-passcodes.mjs          random passcodes, printed once
//   node scripts/seed-passcodes.mjs --demo   fixed PUBLIC test passcodes; never use on a real deployment
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";

const demo = { "20070": "Hj@20070", "18915": "Vs@18915", "18221": "Ar@18221", "1234": "Rk@1234", "1532": "Kv@1532" };
const useDemo = process.argv.includes("--demo");

const hashes = {};
for (const id of Object.keys(demo)) {
  const pass = useDemo ? demo[id] : crypto.randomInt(100000, 999999).toString();
  hashes[id] = bcrypt.hashSync(pass, 10);
  console.log(`${id}: ${pass}`);
}

const file = ".env.local";
let env = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const set = (k, v) => {
  env = env.split("\n").filter((l) => !l.startsWith(k + "=")).join("\n");
  env = env.replace(/\n*$/, "\n") + `${k}=${v}\n`;
};
// base64 so bcrypt's `$` characters survive env-variable expansion
set("PASSCODE_HASHES", Buffer.from(JSON.stringify(hashes)).toString("base64"));
if (!/^JWT_SECRET=./m.test(env)) set("JWT_SECRET", crypto.randomBytes(32).toString("hex"));
fs.writeFileSync(file, env);
console.log("\nWrote .env.local. Copy PASSCODE_HASHES and JWT_SECRET into Vercel; add the Google client IDs.");
