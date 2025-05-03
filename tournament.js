/**
 * tournament.js - Lógica principal del torneo de poker
 * Contiene la estructura de datos y funciones para gestionar el torneo
 */

import { formatTime, formatMoney, playSound, showNotification, calculatePlayerTotalSpent, calculatePlayerRebuys } from './utils.js';

// Objeto principal del torneo
let tournament = {
  name: 'Torneo de Póker',
  entryFee: 10000,
  players: [],
  levels: [],
  currentLevelIndex: 0,
  totalPot: 0,
  gameStarted: false,
  isRunning: false,
  globalTimer: 0,
  levelTimer: 0,
  eliminatedPlayers: []
};

// Variable para guardar el torneo en curso
let savedTournament = null;

// Temporizadores
let globalTimerInterval;
let levelTimerInterval;

// Presets de niveles
const levelPresets = {
  casual: [
    { smallBlind: 25, bigBlind: 50, ante: 0, duration: 15 },
    { smallBlind: 50, bigBlind: 100, ante: 0, duration: 15 },
    { smallBlind: 75, bigBlind: 150, ante: 0, duration: 15 },
    { smallBlind: 100, bigBlind: 200, ante: 25, duration: 15 },
    { smallBlind: 150, bigBlind: 300, ante: 25, duration: 15 },
    { smallBlind: 200, bigBlind: 400, ante: 50, duration: 15 },
    { smallBlind: 300, bigBlind: 600, ante: 75, duration: 15 },
    { smallBlind: 400, bigBlind: 800, ante: 100, duration: 15 },
    { smallBlind: 500, bigBlind: 1000, ante: 125, duration: 15 },
    { smallBlind: 700, bigBlind: 1400, ante: 150, duration: 15 },
    { smallBlind: 1000, bigBlind: 2000, ante: 200, duration: 15 }
  ],
  standard: [
    { smallBlind: 25, bigBlind: 50, ante: 0, duration: 20 },
    { smallBlind: 50, bigBlind: 100, ante: 0, duration: 20 },
    { smallBlind: 100, bigBlind: 200, ante: 25, duration: 20 },
    { smallBlind: 150, bigBlind: 300, ante: 25, duration: 20 },
    { smallBlind: 200, bigBlind: 400, ante: 50, duration: 20 },
    { smallBlind: 300, bigBlind: 600, ante: 75, duration: 20 },
    { smallBlind: 400, bigBlind: 800, ante: 100, duration: 20 },
    { smallBlind: 500, bigBlind: 1000, ante: 125, duration: 20 },
    { smallBlind: 700, bigBlind: 1400, ante: 150, duration: 20 },
    { smallBlind: 1000, bigBlind: 2000, ante: 200, duration: 20 },
    { smallBlind: 1500, bigBlind: 3000, ante: 300, duration: 20 },
    { smallBlind: 2000, bigBlind: 4000, ante: 400, duration: 20 }
  ],
  turbo: [
    { smallBlind: 25, bigBlind: 50, ante: 0, duration: 10 },
    { smallBlind: 50, bigBlind: 100, ante: 0, duration: 10 },
    { smallBlind: 100, bigBlind: 200, ante: 25, duration: 10 },
    { smallBlind: 200, bigBlind: 400, ante: 50, duration: 10 },
    { smallBlind: 300, bigBlind: 600, ante: 75, duration: 10 },
    { smallBlind: 500, bigBlind: 1000, ante: 100, duration: 10 },
    { smallBlind: 800, bigBlind: 1600, ante: 150, duration: 10 },
    { smallBlind: 1000, bigBlind: 2000, ante: 200, duration: 10 },
    { smallBlind: 1500, bigBlind: 3000, ante: 300, duration: 10 },
    { smallBlind: 2000, bigBlind: 4000, ante: 400, duration: 10 },
    { smallBlind: 3000, bigBlind: 6000, ante: 600, duration: 10 }
  ]
};

// Funciones para UI (se asignarán desde ui.js)
let updateGameUI = () => {
  console.log('updateGameUI no configurado');
};

let showResultsModal = (positions) => {
  console.log('showResultsModal no configurado', positions);
};

// Funciones para configurar las funciones de UI desde fuera
function setUpdateGameUI(fn) {
  updateGameUI = fn;
}

function setShowResultsModal(fn) {
  showResultsModal = fn;
}

// Iniciar los temporizadores
function startTimers() {
  if (!tournament.isRunning) {
    tournament.isRunning = true;
    
    // Iniciar temporizador global
    globalTimerInterval = setInterval(() => {
      tournament.globalTimer++;
      updateTimerDisplay();
    }, 1000);
    
    // Iniciar temporizador de nivel
    levelTimerInterval = setInterval(() => {
      if (tournament.levelTimer > 0) {
        tournament.levelTimer--;
        updateTimerDisplay();
        
        // Advertencia cuando queden 30 segundos
        if (tournament.levelTimer === 30) {
          playSound('notification');
          showNotification('Aviso', 'El nivel está por terminar en 30 segundos', 'warning');
        }
      } else {
        // Fin del nivel
        clearInterval(levelTimerInterval);
        advanceToNextLevel();
      }
    }, 1000);
    
    // Actualizar botón de pausa
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
      pauseBtn.innerHTML = '<i class="fas fa-pause"></i><span>Pausar</span>';
    }
  }
}

// Pausar los temporizadores
function pauseTimers() {
  if (tournament.isRunning) {
    tournament.isRunning = false;
    clearInterval(globalTimerInterval);
    clearInterval(levelTimerInterval);
    
    // Actualizar botón de pausa
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
      pauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Reanudar</span>';
    }
  }
}

// Alternar entre pausa y reanudar
function togglePause() {
  if (tournament.isRunning) {
    pauseTimers();
  } else {
    startTimers();
  }
}

// Actualizar los temporizadores en la interfaz
function updateTimerDisplay() {
  // Actualizar el temporizador global
  const globalTimerElement = document.getElementById('global-timer-value');
  if (globalTimerElement) {
    globalTimerElement.textContent = formatTime(tournament.globalTimer);
  }
  
  // Actualizar el temporizador del nivel
  const timerElement = document.getElementById('timer-time');
  if (timerElement) {
    timerElement.textContent = formatTime(tournament.levelTimer, false);
  }
  
  // Actualizar el progreso del círculo del temporizador
  const timerProgress = document.querySelector('.timer-progress');
  if (timerProgress) {
    const currentLevel = tournament.levels[tournament.currentLevelIndex];
    if (currentLevel) {
      const maxTime = currentLevel.duration * 60;
      const percentage = (tournament.levelTimer / maxTime) * 100;
      
      // Calcular el radio y la circunferencia del círculo
      const radius = 120;
      const circumference = 2 * Math.PI * radius;
      
      // Establecer el valor de stroke-dasharray
      timerProgress.style.strokeDasharray = `${circumference}`;
      
      // Establecer el valor de stroke-dashoffset
      const offset = circumference - (percentage / 100) * circumference;
      timerProgress.style.strokeDashoffset = offset;
    }
  }
}

// Avanzar al siguiente nivel
function advanceToNextLevel() {
  // Reproducir sonido
  playSound('level-change');
  
  // Incrementar el índice de nivel
  tournament.currentLevelIndex++;
  
  // Verificar si hay más niveles disponibles
  if (tournament.currentLevelIndex < tournament.levels.length) {
    // Establecer el temporizador del nivel
    tournament.levelTimer = tournament.levels[tournament.currentLevelIndex].duration * 60;
    
    // Actualizar la interfaz
    updateGameUI();
    
    // Mostrar notificación del nuevo nivel
    const currentLevel = tournament.levels[tournament.currentLevelIndex];
    showNotification(
      'Nuevo Nivel',
      `Nivel ${tournament.currentLevelIndex + 1}: $${formatMoney(currentLevel.smallBlind)} / $${formatMoney(currentLevel.bigBlind)}${currentLevel.ante > 0 ? ` - Ante: $${formatMoney(currentLevel.ante)}` : ''}`,
      'info'
    );
    
    // Iniciar el temporizador si estaba en marcha
    if (tournament.isRunning) {
      clearInterval(levelTimerInterval);
      levelTimerInterval = setInterval(() => {
        if (tournament.levelTimer > 0) {
          tournament.levelTimer--;
          updateTimerDisplay();
          
          // Advertencia cuando queden 30 segundos
          if (tournament.levelTimer === 30) {
            playSound('notification');
            showNotification('Aviso', 'El nivel está por terminar en 30 segundos', 'warning');
          }
        } else {
          // Fin del nivel
          clearInterval(levelTimerInterval);
          advanceToNextLevel();
        }
      }, 1000);
    }
  } else {
    // No hay más niveles, mostrar mensaje final
    showNotification('Fin de Niveles', 'Se han jugado todos los niveles programados.', 'warning');
    pauseTimers();
  }
}

// Añadir un nuevo jugador durante el juego
function addNewPlayerDuringGame(playerName) {
  // Verificar nombre duplicado
  if (tournament.players.some(p => p.name === playerName)) {
    showNotification('Error', 'Ya existe un jugador con ese nombre.', 'error');
    return;
  }
  
  const newPlayer = {
    id: Date.now().toString(),
    name: playerName,
    chips: tournament.entryFee,
    active: true,
    history: [{
      action: 'add',
      time: tournament.globalTimer,
      amount: tournament.entryFee
    }]
  };
  
  tournament.players.push(newPlayer);
  tournament.totalPot += tournament.entryFee;
  
  updateGameUI();
  showNotification('Jugador añadido', `${playerName} se ha unido al torneo con $${formatMoney(tournament.entryFee)}.`, 'success');
}

// Eliminar a un jugador
function eliminatePlayer(playerId) {
  const playerIndex = tournament.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return;
  
  const player = tournament.players[playerIndex];
  
  // Confirmar eliminación
  if (confirm(`¿Eliminar a ${player.name} del torneo?`)) {
    // Marcar como eliminado
    player.active = false;
    
    // Registrar acción en el historial del jugador
    player.history.push({
      action: 'eliminate',
      time: tournament.globalTimer,
      level: tournament.currentLevelIndex + 1
    });
    
    // Agregar a la lista de eliminados y registrar posición
    tournament.eliminatedPlayers.push({
      player: player,
      position: tournament.players.filter(p => p.active).length + 1,
      time: tournament.globalTimer
    });
    
    // Actualizar la interfaz
    updateGameUI();
    
    // Mostrar notificación
    showNotification('Jugador eliminado', `${player.name} ha sido eliminado del torneo.`, 'info');
    
    // Verificar si solo queda un jugador (ganador)
    checkForWinner();
  }
}

// Recompra de un jugador
function rebuyPlayer(playerId) {
  const player = tournament.players.find(p => p.id === playerId);
  if (!player) return;
  
  // Confirmar recompra
  if (confirm(`¿Permitir que ${player.name} haga una recompra de $${formatMoney(tournament.entryFee)}?`)) {
    player.active = true;
    player.chips = tournament.entryFee;
    tournament.totalPot += tournament.entryFee;
    
    // Registrar acción en el historial del jugador
    player.history.push({
      action: 'rebuy',
      time: tournament.globalTimer,
      amount: tournament.entryFee,
      level: tournament.currentLevelIndex + 1
    });
    
    // Actualizar la interfaz
    updateGameUI();
    
    // Mostrar notificación
    showNotification('Recompra realizada', `${player.name} ha realizado una recompra de $${formatMoney(tournament.entryFee)}.`, 'success');
  }
}

// Recompra para un jugador activo (sin eliminarlo primero)
function rebuyActivePlayer(playerId) {
  const player = tournament.players.find(p => p.id === playerId);
  if (!player || !player.active) return;
  
  // Confirmar recompra
  if (confirm(`¿Añadir recompra de $${formatMoney(tournament.entryFee)} a ${player.name}?`)) {
    player.chips += tournament.entryFee;
    tournament.totalPot += tournament.entryFee;
    
    // Registrar acción en el historial del jugador
    player.history.push({
      action: 'rebuy',
      time: tournament.globalTimer,
      amount: tournament.entryFee,
      level: tournament.currentLevelIndex + 1
    });
    
    // Actualizar la interfaz
    updateGameUI();
    
    // Mostrar notificación
    showNotification('Recompra realizada', `${player.name} ha realizado una recompra de $${formatMoney(tournament.entryFee)}.`, 'success');
  }
}

// Agregar fichas a un jugador
function addChipsToPlayer(player, amount) {
  player.chips += amount;
  tournament.totalPot += amount;
  
  // Registrar acción en el historial
  player.history.push({
    action: 'add',
    time: tournament.globalTimer,
    amount: amount
  });
  
  // Actualizar información en el panel
  const playerChipsElement = document.getElementById('action-player-chips');
  if (playerChipsElement) {
    playerChipsElement.textContent = `$${formatMoney(player.chips)}`;
  }
  
  // Actualizar UI
  updateGameUI();
  
  // Actualizar historial en el panel
  const historyList = document.getElementById('player-history-list');
  if (historyList) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-action">
        <i class="fas fa-plus history-icon plus"></i>
        +$${formatMoney(amount)}
      </div>
      <div class="history-time">${formatTime(tournament.globalTimer)}</div>
    `;
    historyList.prepend(item);
  }
}

// Verificar si hay un ganador
function checkForWinner() {
  const activePlayers = tournament.players.filter(p => p.active);
  
  if (activePlayers.length === 1) {
    // Hay un ganador
    const winner = activePlayers[0];
    
    // Detener los temporizadores
    pauseTimers();
    
    // Mostrar mensaje de ganador
    showNotification('¡Tenemos un ganador!', `${winner.name} ha ganado el torneo.`, 'success');
    
    // Reproducir sonido
    playSound('winner');
    
    // Calcular posiciones finales
    const finalPositions = calculateFinalPositions();
    
    // Mostrar resultados finales
    showResultsModal(finalPositions);
  }
}

// Calcular posiciones finales
function calculateFinalPositions() {
  const positions = [];
  
  // Agregar jugador activo si existe (ganador)
  const activePlayer = tournament.players.find(p => p.active);
  if (activePlayer) {
    positions.push({
      player: activePlayer,
      position: 1,
      chips: activePlayer.chips,
      prize: 0
    });
  }
  
  // Agregar jugadores eliminados
  for (let i = 0; i < tournament.eliminatedPlayers.length; i++) {
    const eliminated = tournament.eliminatedPlayers[i];
    positions.push({
      player: eliminated.player,
      position: eliminated.position,
      chips: 0,
      prize: 0
    });
  }
  
  // Ordenar por posición
  positions.sort((a, b) => a.position - b.position);
  
  // Calcular premios según la distribución
  const numPlayers = tournament.players.length;
  let distribution;
  
  if (numPlayers <= 3) {
    distribution = [70, 30];
  } else if (numPlayers <= 5) {
    distribution = [60, 30, 10];
  } else if (numPlayers <= 9) {
    distribution = [50, 30, 20];
  } else {
    distribution = [45, 25, 15, 10, 5];
  }
  
  // Asignar premios
  for (let i = 0; i < positions.length && i < distribution.length; i++) {
    const percentage = distribution[i];
    positions[i].prize = Math.round(tournament.totalPot * percentage / 100);
  }
  
  return positions;
}

// Finalizar torneo manualmente
function endTournament() {
  // Pausar temporizadores
  tournament.isRunning = false;
  clearInterval(globalTimerInterval);
  clearInterval(levelTimerInterval);
  
  const finalPositions = calculateFinalPositions();
  showResultsModal(finalPositions);
}

// Inicializar nuevo torneo
function resetTournament() {
  tournament = {
    name: 'Torneo de Póker',
    entryFee: 10000,
    players: [],
    levels: [],
    currentLevelIndex: 0,
    totalPot: 0,
    gameStarted: false,
    isRunning: false,
    globalTimer: 0,
    levelTimer: 0,
    eliminatedPlayers: []
  };
}

// Restaurar torneo guardado
function restoreSavedTournament() {
  if (savedTournament) {
    tournament = savedTournament;
    return true;
  }
  return false;
}

// Exportar las funcionalidades del módulo
export {
  tournament,
  savedTournament,
  levelPresets,
  startTimers,
  pauseTimers,
  togglePause,
  updateTimerDisplay,
  advanceToNextLevel,
  addNewPlayerDuringGame,
  eliminatePlayer,
  rebuyPlayer,
  rebuyActivePlayer,
  addChipsToPlayer,
  checkForWinner,
  calculateFinalPositions,
  endTournament,
  resetTournament,
  restoreSavedTournament,
  setUpdateGameUI,
  setShowResultsModal
}; 