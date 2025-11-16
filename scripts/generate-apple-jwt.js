const jwt = require("jsonwebtoken");

// Apple Key ID (Keys sayfasından)
const KEY_ID = "SP9FP9VGAS";

// Team ID
const TEAM_ID = "9W6CR7KXM7";

// Service ID (Client ID)
const CLIENT_ID = "com.litxtech.mytrabzon.login";

// .p8 PRIVATE KEY (TAMAMI)
const privateKey = `
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgcoa8P1l7l82VufWR
dLe+0+55ylc/BExmYGhHLc2+Qa2gCgYIKoZIzj0DAQehRANCAAQyNdvB/QR6ZEIb
1x4avfOdKp60Dgho26C+I5QHIxaf6qEOPPHK9WErLJRVE6L/IcIAJPpqPPXo/meW
kz8jB8Wd
-----END PRIVATE KEY-----
`.trim();

const now = Math.floor(Date.now() / 1000);

// 180 gün geçerli token
const expires = now + 180 * 24 * 60 * 60;

const token = jwt.sign(
  {
    iss: TEAM_ID,
    iat: now,
    exp: expires,
    aud: "https://appleid.apple.com",
    sub: CLIENT_ID,
  },
  privateKey,
  {
    algorithm: "ES256",
    header: {
      kid: KEY_ID,
    },
  }
);

console.log("\nApple Client Secret (JWT):\n");
console.log(token);
console.log("\nBu stringi Supabase → Authentication → Providers → Apple → Secret Key (for OAuth) alanına yapıştır.\n");

