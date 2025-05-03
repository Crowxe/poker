/**
 * utils.js - Funciones utilitarias para la aplicación de torneos de poker
 * Contiene funcionalidades para formateo, notificaciones y audio
 */

// Función auxiliar para verificar que el DOM esté listo
function domReady() {
  return new Promise(resolve => {
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      resolve();
    } else {
      document.addEventListener('DOMContentLoaded', () => resolve());
    }
  });
}

// Función para comprobar si un elemento existe
function elementExists(selector) {
  return !!document.querySelector(selector);
}

// Función para formatear el tiempo en formato HH:MM:SS o MM:SS
function formatTime(seconds, showHours = true) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (showHours) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  } else {
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

// Función para formatear números como moneda
function formatMoney(amount) {
  return new Intl.NumberFormat('es-ES').format(amount);
}

// Audio Context para sonidos
let audioContext;
try {
  // Verificar si estamos en un contexto con soporte para Web Audio API
  if (typeof window !== 'undefined' && window.AudioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
} catch (e) {
  console.log('Web Audio API no es soportada en este navegador');
}

// Reproducir sonidos
function playSound(soundId) {
  if (!audioContext) {
    console.log('Web Audio API no disponible');
    return;
  }
  
  // Generar sonidos usando Web Audio API
  switch(soundId) {
    case 'level-change':
      playLevelChangeSound();
      break;
    case 'notification':
      playNotificationSound();
      break;
    case 'winner':
      playWinnerSound();
      break;
  }
}

// Sonido para cambio de nivel
function playLevelChangeSound() {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Configuración de sonido para cambio de nivel
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // La nota A4
  oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.2); // Sube a A5
  
  gainNode.gain.setValueAtTime(0.8, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);
  
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 1);
}

// Sonido para notificación
function playNotificationSound() {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime); // Mi
  
  gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
  
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.3);
}

// Sonido para ganador
function playWinnerSound() {
  const notes = [392, 440, 493.88, 523.25, 587.33, 659.25, 783.99]; // Escala G mayor
  
  notes.forEach((note, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = note;
    
    gainNode.gain.setValueAtTime(0.6, audioContext.currentTime + index * 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + index * 0.1 + 0.3);
    
    oscillator.start(audioContext.currentTime + index * 0.1);
    oscillator.stop(audioContext.currentTime + index * 0.1 + 0.3);
  });
}

// Mostrar notificaciones
function showNotification(title, message, type = 'info') {
  console.log(`[${type}] ${title}: ${message}`);
  
  domReady().then(() => {
    const notificationsContainer = document.getElementById('notifications-container');
    if (!notificationsContainer) {
      console.warn('Contenedor de notificaciones no encontrado');
      return;
    }
    
    // Crear la notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-icon">
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
      </div>
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close">×</button>
    `;
    
    // Agregar al contenedor
    notificationsContainer.appendChild(notification);
    
    // Animación de entrada
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Configurar botón de cierre
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    });
    
    // Auto-eliminación después de un tiempo
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 5000);
  });
}

// Función para cambiar de pantalla
function showScreen(screen) {
  domReady().then(() => {
    const screenElement = document.getElementById(screen);
    if (!screenElement) {
      console.error(`Pantalla no encontrada: ${screen}`);
      window.showLoadingError && window.showLoadingError(`Pantalla no encontrada: ${screen}`);
      return;
    }
    
    const screens = document.querySelectorAll('.app-screen');
    screens.forEach(s => s.classList.remove('active'));
    screenElement.classList.add('active');
  });
}

// Agregar estilos dinámicos para componentes
function addDynamicStyles() {
  domReady().then(() => {
    // Verificamos si los estilos ya existen para evitar duplicados
    if (document.querySelector('style[data-dynamic="true"]')) {
      return;
    }
    
    const style = document.createElement('style');
    style.setAttribute('data-dynamic', 'true');
    style.textContent = `
      .highlight-pot {
        font-size: 1.2em;
        font-weight: bold;
        color: #ffdd57;
        text-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      
      .player-spent {
        font-size: 1.1em;
        color: #2ecc71;
        margin-top: 5px;
        font-weight: bold;
      }
      
      .player-rebuys {
        font-size: 0.8em;
        color: #ff9900;
        margin-top: 2px;
        font-style: italic;
      }
      
      .return-btn {
        background-color: #3498db;
        color: white;
        margin-bottom: 10px;
        width: 100%;
        padding: 15px;
        transition: background-color 0.3s;
      }
      
      .return-btn:hover {
        background-color: #2980b9;
      }
      
      .player-actions {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
      }
      
      .player-actions button {
        padding: 5px 8px;
        font-size: 0.85em;
        flex: 1;
        margin: 0 2px;
      }
      
      .rebuy-active-btn {
        background-color: #f1c40f;
        border-color: #f39c12;
      }
      
      .rebuy-active-btn:hover {
        background-color: #f39c12;
      }
    `;
    document.head.appendChild(style);
  });
}

// Calcular el gasto total de un jugador
function calculatePlayerTotalSpent(player, entryFee) {
  let totalSpent = entryFee; // Buy-in inicial
  
  // Sumar recompras y gastos adicionales del historial
  player.history.forEach(entry => {
    if (entry.action === 'rebuy' || entry.action === 'add') {
      totalSpent += entry.amount;
    }
  });
  
  return totalSpent;
}

// Calcular el número de reentradas de un jugador
function calculatePlayerRebuys(player) {
  let rebuys = 0;
  
  player.history.forEach(entry => {
    if (entry.action === 'rebuy') {
      rebuys++;
    }
  });
  
  return rebuys;
}

// Exportar las funciones
export {
  formatTime,
  formatMoney,
  playSound,
  showNotification,
  showScreen,
  addDynamicStyles,
  calculatePlayerTotalSpent,
  calculatePlayerRebuys,
  domReady,
  elementExists
}; 