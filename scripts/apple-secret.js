// Generuje client secret (JWT, ES256) dla Sign in with Apple. Użycie: node apple-secret.js <p8> <teamId> <keyId> <servicesId> <wyjscie>
const fs = require("fs");
const crypto = require("crypto");

const [p8Path, teamId, keyId, servicesId, outPath] = process.argv.slice(2);
if (!p8Path || !teamId || !keyId || !servicesId || !outPath) {
  console.error("Brak argumentów");
  process.exit(1);
}

const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 15777000; // maksimum dozwolone przez Apple (ok. 6 miesięcy)

const header = { alg: "ES256", kid: keyId };
const payload = { iss: teamId, iat, exp, aud: "https://appleid.apple.com", sub: servicesId };
const data = `${b64(header)}.${b64(payload)}`;

const key = crypto.createPrivateKey(fs.readFileSync(p8Path, "utf8"));
const sig = crypto.sign("sha256", Buffer.from(data), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
const jwt = `${data}.${sig}`;

fs.writeFileSync(outPath, jwt + "\n");
console.log("Zapisano sekret JWT:", outPath);
console.log("Długość:", jwt.length, "znaków");
console.log("Wygasa:", new Date(exp * 1000).toISOString().slice(0, 10));
console.log("Przypomnienie o odnowieniu: ok.", new Date((exp - 14 * 86400) * 1000).toISOString().slice(0, 10));
