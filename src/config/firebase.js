// ❌ NO FUNCIONA EN MUCHOS ENTORNOS
// import serviceAccount from '../serviceAccountKey.json' assert { type: "json" };

// ✅ CAMBIA A:
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../alishon07-f8f29-firebase-adminsdk-fbsvc-b49bf5b198.json'), 'utf-8')
);

import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
