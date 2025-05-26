// src/config/firebase-admin.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import admin from 'firebase-admin';
// 🔥 ATENCIÓN: En producción NUNCA expongas estas credenciales
// Esto es SOLO para fines de aprendizaje
const serviceAccount = {
  type: "service_account",
  project_id: "qfinder-comunity",
  private_key_id: "414ac2ca5263feca5c9f4ce0d639efd6572bac4e",
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCfHU35MdGnWuFZ
gpqc1WSw2zA80ob0RrEc2cKRU3eWKdMvipWgPLuFAq8PxOxBrUyg3jwzqx5/eNm5
eGJPT4wTiq7GNDdBOjqaZ3r47+NslJ7Z88NOyDvharJMy6UUeznR5++/myg5iPb4
zLTpTvCug6VDmHCU9XOhCI6qHKoun8XtDKSprBRhFRoIqsnH8X3ipBPITttK0BH3
rsZ5M85KF5WB+13fC49Y0mcxB8AI35CCEF0VNeqozgLqY/gLNSfqgP4Q0ghr/wIY
lF44sotHL93BtT7/oQtd/JW9uG/VSdabLc3XgBMVNnd6iHgdZZkKSmlFDVtw+yIu
/ALbbqJHAgMBAAECggEAAwjqDdC3cPu4xJ5LGKaxTvY/S0mwrUQT6Lr2jRMMet69
WnDIPdAqu3S7pg9Zej818POMLmgbIs9JR9JV/bFEuLKydrFURHg52ewTWmAo9E85
YGrX1M7Y5YnFcNWJhoR7K9fCqOLqt343R7OP18tbp9h29H0Z2J194Rpqri/xxwXZ
aTgNQOze7e2MDiGYlPMdVJXVGhDu1G0f1LJo1lqDovcEQN1QbudglUgGtjuT359S
kydomdCsMHEPvPNR6SM3uOiayPX+VqSRub9QkmCUvHSuvcQbbKxVsbmsu1HuGKzZ
v2ZjhJMgUqwbDSuKf4OLJ0gbXGuckawqyRZXiyLPYQKBgQDUFBRiUWhYgnqWTAGR
9PwTV/tyblEzL79OTdGX/9Ln56TxOeTRo8C28bYJuVeT83/T9/EsFGsXtSx+3vSd
iTSz5KAZXZ96KpN3olOZhiEAHDSaq7jmFdhjwwPK29Ri3JYAIwzvehJ9bzYBOEn9
rppds5hphOmKaABu+FVQJsuoaQKBgQDAETHqfYNAapbU51Sxxenj2D6bo01YXW4Z
t1ThUCRH+d21GXt0BUOT3VxDnBVSVxMZ1Kwk38NzSWQJ+z5vTcBhJ87vB2pnn3Ez
Jvy1mvw4oD8Cr9JTBN3g7+NmU5/EWSyVSqKGGogGVGdUAC1Xz3Nw08ZY73ROHBRp
OoQpmLYfLwKBgQCVoUEsiSFk6VJSfnfRIhdEEpxfBUSXJ8YDGlaZtq54XnB6ng06
eB29NdbpD3Kh+Xgj9tia8CELDhHBxc6y455imhj3LJ4bVLTNAKOZOxBHgp7+zc/b
zmfpIyum0ekMg3P1zsUOpYMsKu3geHWD3dAd8lvDfzpDI9PCd8XBkk24mQKBgQCi
fOmRy+WCVaqNK7gHPbyFuagd26XPoBtJPkRc6YQIMGdUkt5SZTGqopcvy5huNKRA
MiAAgh3EJs6vcxJ673hVuWvj5I4sZENMVytsKFZBQbCNAVoaSf+8ELZ9FzoOzrJd
Cus8MK3rTPStqAi0RRkQ1tjy3IG0oyTRcWPmHP/WmQKBgFdJddJVnbFzg1D93qK9
BwhLY2Q5GTBbt98Saz+F3tBRf2gVTC9PGX6Qrr02k3TVpMyqSvQ3LBCAlxlxGNl9
v/YyPS5VtUUn9vYh4yAUY/DP3l3nBIClly8GDnOEqyTtXJQu70AgziHe84AFs6Ga
hKcJpBwPdqnZnJisvEXEZGqf
-----END PRIVATE KEY-----`,
  client_email: "firebase-adminsdk-fbsvc@qfinder-comunity.iam.gserviceaccount.com",
  client_id: "110195551660133849636",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40qfinder-comunity.iam.gserviceaccount.com"
};

// Verificación de campos obligatorios
const requiredFields = ['project_id', 'private_key', 'client_email'];
const missingFields = requiredFields.filter(field => !serviceAccount[field]);

if (missingFields.length > 0) {
  throw new Error(`Faltan campos esenciales: ${missingFields.join(', ')}`);
}

// Inicialización de Firebase
const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://qfinder-comunity-default-rtdb.firebaseio.com"
});
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://qfinder-comunity-default-rtdb.firebaseio.com"
  });
}
// Exporta los servicios
export const auth = admin.auth();
export const db = getDatabase(app);

console.log('✅ Firebase Admin inicializado correctamente');