// Encrypts the GoatCounter read-only API token with the owner's back-office password.
// Output (admin.json) is safe to publish: only the password can open it.
// Format matches the page's Web Crypto code: PBKDF2-SHA256 → AES-256-GCM, ciphertext||tag.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const token = process.env.GC_TOKEN || '';
const pw = process.env.ADMIN_PW || '';
const site = process.env.GC_SITE || 'kittisakcowork';
const ITER = 310000;

(async () => {
  if (!token || !pw) { console.error('ต้องมีทั้ง token และรหัสผ่าน'); process.exit(1); }
  const r = await fetch(`https://${site}.goatcounter.com/api/v0/stats/total`, { headers: { Authorization: 'Bearer ' + token } });
  if (r.status === 401 || r.status === 403) { console.error('token ใช้ไม่ได้ (ต้องมีสิทธิ์ Read statistics) ลองสร้างใหม่'); process.exit(1); }
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(pw, salt, ITER, 32, 'sha256');
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(token, 'utf8'), c.final(), c.getAuthTag()]);
  const out = { v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt: salt.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64') };
  const dest = path.join(__dirname, '..', '..', 'admin.json');
  fs.writeFileSync(dest, JSON.stringify(out) + '\n');
  console.log('บันทึกแล้ว: admin.json (เข้ารหัสแล้ว เผยแพร่ได้)');
})();
