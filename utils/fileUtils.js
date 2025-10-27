const fs = require('fs');
const path = require('path');

/**
 * Elimina un archivo del sistema de archivos
 * @param {string} filePath - Ruta del archivo a eliminar
 * @returns {Promise<boolean>} - true si se eliminó correctamente, false si no existía o hubo error
 */
const deleteFile = async (filePath) => {
  try {
    let fullPath;
    
    // Si la ruta empieza con /uploads/, construir desde la raíz del proyecto
    if (filePath.startsWith('/uploads/')) {
      fullPath = path.join(__dirname, '..', filePath);
    }
    // Si la ruta ya es absoluta, usarla tal como está
    else if (path.isAbsolute(filePath)) {
      fullPath = filePath;
    }
    // Si es solo el nombre del archivo, asumir que está en uploads
    else {
      fullPath = path.join(__dirname, '..', 'uploads', filePath);
    }
    
    // Verificar si el archivo existe
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`✅ Archivo eliminado: ${fullPath}`);
      return true;
    } else {
      console.log(`⚠️ Archivo no encontrado: ${fullPath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error al eliminar archivo ${filePath}:`, error.message);
    return false;
  }
};

/**
 * Elimina múltiples archivos
 * @param {string[]} filePaths - Array de rutas de archivos a eliminar
 * @returns {Promise<number>} - Número de archivos eliminados exitosamente
 */
const deleteFiles = async (filePaths) => {
  if (!Array.isArray(filePaths)) {
    filePaths = [filePaths];
  }
  
  let deletedCount = 0;
  for (const filePath of filePaths) {
    if (filePath && filePath.trim() !== '') {
      const deleted = await deleteFile(filePath);
      if (deleted) deletedCount++;
    }
  }
  
  return deletedCount;
};

module.exports = {
  deleteFile,
  deleteFiles
};
