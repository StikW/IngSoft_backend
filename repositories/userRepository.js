const { executeQuery } = require('../db');

class UserRepository {
  // Buscar usuario por correo con su rol
  async findByEmail(email) {
    const query = `
      SELECT 
        u.id,
        u.nombre,
        u.correo,
        u.contrasena,
        u.telefono,
        u.rol_id,
        r.nombre as rol_nombre,
        u.activo
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE u.correo = ? AND u.activo = 1
      LIMIT 1;
    `;
    const [user] = await executeQuery(query, [email]);
    return user;
  }

  // Buscar usuario por ID con su rol
  async findById(id) {
    const query = `
      SELECT 
        u.id,
        u.nombre,
        u.correo,
        u.telefono,
        u.rol_id,
        r.nombre as rol_nombre,
        u.activo
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE u.id = ?
    `;
    const [user] = await executeQuery(query, [id]);
    return user;
  }

  // Verificar si existe un usuario con el correo dado
  async existsByEmail(email) {
    const query = 'SELECT id FROM usuarios WHERE correo = ?';
    const result = await executeQuery(query, [email]);
    return result.length > 0;
  }

  // Crear nuevo usuario
  async create(userData) {
    const { nombre, correo, contrasena, telefono, rol_id } = userData;
    const query = `
      INSERT INTO usuarios (nombre, correo, contrasena, telefono, rol_id, activo)
      VALUES (?, ?, ?, ?, ?, 1)
    `;
    const result = await executeQuery(query, [nombre, correo, contrasena, telefono || null, rol_id]);
    return result.insertId;
  }

  // Actualizar perfil de usuario
  async updateProfile(id, nombre, telefono) {
    const query = `
      UPDATE usuarios 
      SET nombre = ?, telefono = ?
      WHERE id = ?
    `;
    await executeQuery(query, [nombre, telefono || null, id]);
  }

  // Actualizar contraseña
  async updatePassword(id, hashedPassword) {
    const query = `
      UPDATE usuarios 
      SET contrasena = ?
      WHERE id = ?
    `;
    await executeQuery(query, [hashedPassword, id]);
  }

  // Verificar que el usuario existe y está activo
  async verifyUserExists(id, email) {
    const query = 'SELECT id FROM usuarios WHERE id = ? AND correo = ? AND activo = 1';
    const result = await executeQuery(query, [id, email]);
    return result.length > 0;
  }
}

module.exports = new UserRepository();
