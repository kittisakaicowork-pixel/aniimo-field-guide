#!/bin/bash
# One-time back-office setup: type the GoatCounter token and a new password (input is hidden).
cd "$(dirname "$0")/../.." || exit 1
echo "== ตั้งค่าหลังบ้าน Aniimo Field Guide =="
read -rsp "วาง GoatCounter API token (Read statistics) แล้วกด Enter: " T; echo
read -rsp "ตั้งรหัสผ่านหลังบ้าน (อย่างน้อย 10 ตัว): " P1; echo
read -rsp "พิมพ์รหัสผ่านอีกครั้ง: " P2; echo
if [ "$P1" != "$P2" ]; then echo "รหัสผ่านไม่ตรงกัน ลองใหม่"; exit 1; fi
if [ ${#P1} -lt 10 ]; then echo "รหัสผ่านสั้นเกินไป ต้องอย่างน้อย 10 ตัว"; exit 1; fi
GC_TOKEN="$T" ADMIN_PW="$P1" node tools/admin/seal.js && echo "=== เสร็จแล้ว กลับไปบอก Claude ได้เลย ==="
