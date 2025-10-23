# Arquitectura del Backend - SIGEU

## Estructura de Carpetas

```
IngSoft_backend/
├── controllers/          # Controladores HTTP (manejo de req/res)
├── services/            # Lógica de negocio y validaciones
├── repositories/        # Acceso a base de datos
├── models/              # Modelos/DTOs y validaciones
├── middleware/          # Middleware de autenticación y validación
├── routes/              # Definición de rutas
├── db.js               # Configuración de base de datos
└── server.js           # Punto de entrada de la aplicación
```

## Principios de la Arquitectura

### 1. **Controllers** (`controllers/`)
- **Responsabilidad**: Manejo de requests HTTP y responses
- **Funciones**:
  - Extraer datos del request (`req.body`, `req.params`, `req.query`)
  - Llamar a los services correspondientes
  - Manejar errores y devolver responses apropiados
  - **NO** debe contener lógica de negocio ni consultas SQL

### 2. **Services** (`services/`)
- **Responsabilidad**: Lógica de negocio y validaciones avanzadas
- **Funciones**:
  - Validaciones de negocio
  - Orquestación de operaciones complejas
  - Transformación de datos
  - Llamar a repositories para acceso a datos
  - **NO** debe contener consultas SQL directas

### 3. **Repositories** (`repositories/`)
- **Responsabilidad**: Acceso a base de datos
- **Funciones**:
  - Ejecutar consultas SQL usando `executeQuery` de `db.js`
  - Mapear datos de la base de datos
  - Operaciones CRUD básicas
  - **NO** debe contener lógica de negocio

### 4. **Models** (`models/`)
- **Responsabilidad**: Definición de modelos de datos y DTOs
- **Funciones**:
  - Validaciones de datos
  - Transformación de objetos
  - Métodos de utilidad para los modelos
  - Definición de esquemas de datos

## Flujo de Datos

```
Request → Controller → Service → Repository → Database
                ↓
Response ← Controller ← Service ← Repository ← Database
```

## Ejemplos de Uso

### Controller
```javascript
const authService = require('../services/authService');

const login = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    const result = await authService.login(correo, contrasena);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};
```

### Service
```javascript
const userRepository = require('../repositories/userRepository');

class AuthService {
  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error('Usuario no encontrado');
    
    const validPassword = await bcrypt.compare(password, user.contrasena);
    if (!validPassword) throw new Error('Contraseña incorrecta');
    
    return { token: this.generateToken(user), user: user.toPublicJSON() };
  }
}
```

### Repository
```javascript
const { executeQuery } = require('../db');

class UserRepository {
  async findByEmail(email) {
    const query = `
      SELECT u.*, r.nombre as rol_nombre 
      FROM usuarios u 
      INNER JOIN roles r ON u.rol_id = r.id 
      WHERE u.correo = ? AND u.activo = 1
    `;
    const [user] = await executeQuery(query, [email]);
    return user;
  }
}
```

## Beneficios de esta Arquitectura

1. **Separación de Responsabilidades**: Cada capa tiene una responsabilidad específica
2. **Mantenibilidad**: Código más fácil de mantener y modificar
3. **Testabilidad**: Cada capa puede ser probada independientemente
4. **Escalabilidad**: Fácil agregar nuevas funcionalidades
5. **Reutilización**: Services y repositories pueden ser reutilizados
6. **Consistencia**: Patrón uniforme en toda la aplicación

## Convenciones de Naming

- **Controllers**: `[entity]Controller.js` (ej: `authController.js`)
- **Services**: `[entity]Service.js` (ej: `authService.js`)
- **Repositories**: `[entity]Repository.js` (ej: `userRepository.js`)
- **Models**: `[Entity].js` (ej: `User.js`)

## Manejo de Errores

- **Controllers**: Capturan errores y devuelven responses HTTP apropiados
- **Services**: Lanzan errores descriptivos que serán capturados por los controllers
- **Repositories**: Lanzan errores de base de datos que serán manejados por los services
