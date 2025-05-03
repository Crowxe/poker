/**
 * script.js - Punto de entrada principal para la aplicación de torneos de poker
 * Importa y coordina los módulos
 */

// Función para mostrar errores durante la carga
function mostrarErrorCarga(mensaje) {
  console.error('Error durante la carga:', mensaje);
  
  // Actualizar el elemento de error en pantalla si existe
  if (window.showLoadingError) {
    window.showLoadingError(mensaje);
      } else {
    // Si el DOM está listo, intentar mostrar el error directamente
    const errorDiv = document.getElementById('loading-error');
    if (errorDiv) {
      errorDiv.textContent = `Error: ${mensaje}`;
      errorDiv.style.display = 'block';
    }
  }
}

// Agregar manejador de errores global
window.addEventListener('error', (event) => {
  mostrarErrorCarga(event.error?.message || event.message || 'Error desconocido');
});

// Registrar el progreso
console.log('Iniciando importación de módulos...');

// Importar módulos directamente (sin importaciones dinámicas)
import { init } from './ui.js';

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM cargado, inicializando aplicación');
  try {
    init();
  } catch (error) {
    mostrarErrorCarga(`Error al inicializar: ${error.message}`);
  }
  });