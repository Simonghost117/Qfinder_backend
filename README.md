Qfinder Backend
Descripción
Este es el backend de la aplicación Qfinder, diseñado para gestionar usuarios, pacientes, personal médico, medicación, monitoreo de salud y redes de apoyo. La arquitectura está construida con Node.js, Express y Sequelize para la gestión de bases de datos en MySQL, incluyendo integraciones de seguridad y comunicación en tiempo real.
Tecnologías Utilizadas
Backend
•	Node.js: Entorno de ejecución de JavaScript en el servidor.
•	Express: Framework minimalista para la creación de servidores.
•	Sequelize: ORM para la gestión de bases de datos SQL.
•	MySQL2: Conector para la base de datos MySQL.
Seguridad
•	jsonwebtoken (JWT): Manejo de autenticación.
•	bcryptjs: Hashing de contraseñas.
•	helmet: Configuraciones de seguridad HTTP.
•	cors: Control de acceso a la API.
•	cookie-parser: Manejo de cookies.
Desarrollo y Utilidades
•	dotenv: Manejo de variables de entorno.
•	nodemon: Recarga automática en desarrollo.
•	morgan: Logging de peticiones HTTP.
•	zod: Validación de datos.
•	eslint & prettier: Formateo y estandarización del código.
________________________________________
Estructura del Proyecto
Qfinder-backend/
│
├── src/
│   ├── config/
│   │   ├── db.js          # Configuración de la base de datos (Sequelize)
│   │   ├── socket.js      # Configuración de Socket.IO
│   ├── controllers/       # Controladores para manejar la lógica de las rutas
│   ├── middlewares/       # Middlewares para autenticación, validación, etc.
│   ├── models/            # Modelos de la base de datos (Sequelize)
│   ├── routes/            # Definición de las rutas de la API
│   ├── services/          # Lógica de negocio y servicios
│   ├── utils/             # Utilidades reutilizables (errores personalizados, etc.)
│   ├── validators/        # Validaciones de datos de entrada
│   ├── app.js             # Configuración de Express
│   └── server.js          # Punto de entrada del servidor
│
├── .env                   # Variables de entorno
├── .eslintrc.js           # Configuración de ESLint
├── .prettierrc            # Configuración de Prettier
├── package.json           # Dependencias y scripts del proyecto
└── README.md              # Este archivo
________________________________________
Configuración del Proyecto
1. Clonar el Repositorio
git clone https://github.com/tu-usuario/Qfinder-backend.git
cd Qfinder-backend
2. Instalar Dependencias
npm install
3. Configurar Variables de Entorno
Crea un archivo .env y agrega lo siguiente:
PORT=3000
NODE_ENV=development

DB_NAME=Qfinder
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_HOST=localhost
DB_PORT=3306

JWT_SECRET=tu_secreto_jwt
JWT_EXPIRES_IN=1h
4. Configurar la Base de Datos
npx sequelize-cli db:migrate
5. Ejecutar el Servidor
Modo Desarrollo
npm run dev
El servidor estará disponible en http://localhost:3000.
Modo Producción
npm start
________________________________________
Endpoints de la API
Autenticación
•	POST /api/auth/register: Registro de usuarios (Paciente, Familiar, Médico, Admin).
•	POST /api/auth/login: Iniciar sesión.
•	GET /api/auth/profile: Obtener información del usuario autenticado.
Pacientes y Usuarios
•	POST /api/pacientes: Registrar un paciente.
•	GET /api/pacientes/:id: Obtener información de un paciente.
•	POST /api/familiares: Vincular familiar con paciente.
•	GET /api/medicos: Obtener lista de médicos registrados.
Notas Médicas y Citas
•	POST /api/notas-medicas: Crear una nueva nota médica.
•	GET /api/pacientes/:id/notas-medicas: Obtener notas médicas del paciente.
•	POST /api/citas: Crear una nueva cita médica.
•	GET /api/citas: Obtener citas médicas programadas.
Monitoreo y Registros
•	POST /api/sintomas: Registrar síntomas.
•	GET /api/sintomas/:id: Obtener historial de síntomas de un paciente.
•	POST /api/actividad: Registrar actividad física o nutricional.
•	GET /api/actividad/:id: Obtener registros de actividad de un paciente.
Redes de Apoyo y Mensajes
•	POST /api/redes: Crear una red de apoyo.
•	POST /api/redes/mensajes: Enviar mensaje dentro de una red.
•	GET /api/redes/:id/mensajes: Obtener mensajes de una red de apoyo.
Gestón de Emergencias
•	POST /api/emergencias: Registrar un episodio de salud grave.
•	GET /api/emergencias/:id: Obtener historial de emergencias.
________________________________________
Contribuir
Si deseas contribuir, sigue estos pasos:
1.	Haz un fork del repositorio.
2.	Crea una nueva rama (git checkout -b feature/nueva-funcionalidad).
3.	Realiza los cambios y haz commit (git commit -m 'Nueva funcionalidad').
4.	Haz push a la rama (git push origin feature/nueva-funcionalidad).
5.	Abre un Pull Request.
________________________________________
Licencia
Este proyecto está bajo la licencia MIT.
¡Gracias por contribuir a Qfinder Backend!
