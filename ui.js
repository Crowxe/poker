/**
 * ui.js - Gestión de la interfaz de usuario para la aplicación de torneos de poker
 * Contiene funciones para actualizar la UI, manejar eventos y configurar pantallas
 */

import { 
  formatTime, 
  formatMoney, 
  showNotification, 
  showScreen, 
  addDynamicStyles,
  calculatePlayerTotalSpent,
  calculatePlayerRebuys,
  domReady,
  elementExists
} from './utils.js';

import {
  tournament,
  savedTournament,
  levelPresets,
  startTimers,
  pauseTimers,
  togglePause,
  advanceToNextLevel,
  addNewPlayerDuringGame,
  eliminatePlayer,
  rebuyPlayer,
  rebuyActivePlayer,
  addChipsToPlayer,
  endTournament,
  resetTournament,
  restoreSavedTournament,
  setUpdateGameUI,
  setShowResultsModal
} from './tournament.js';

// Referenciando elementos DOM
let appContainer, loader, welcomeScreen, configScreen, gameScreen, resultsScreen;

// Inicialización segura de elementos DOM
function initDOMReferences() {
  return new Promise((resolve, reject) => {
    try {
      appContainer = document.getElementById('app-container');
      if (!appContainer) throw new Error('app-container no encontrado');
      
      loader = document.getElementById('loader');
      if (!loader) throw new Error('loader no encontrado');
      
      welcomeScreen = document.getElementById('welcome-screen');
      if (!welcomeScreen) throw new Error('welcome-screen no encontrado');
      
      configScreen = document.getElementById('config-screen');
      if (!configScreen) throw new Error('config-screen no encontrado');
      
      gameScreen = document.getElementById('game-screen');
      if (!gameScreen) throw new Error('game-screen no encontrado');
      
      resultsScreen = document.getElementById('results-screen');
      if (!resultsScreen) throw new Error('results-screen no encontrado');
      
      resolve();
    } catch (error) {
      console.error('Error al inicializar referencias DOM:', error);
      window.showLoadingError && window.showLoadingError(error.message);
      reject(error);
    }
  });
}

// Inicialización y bienvenida
function init() {
  console.log('Inicializando UI');
  
  // Primero conectamos las funciones críticas con tournament.js
  setUpdateGameUI(updateGameUI);
  setShowResultsModal(showResultsModal);
  
  // Luego esperamos que el DOM esté listo e inicializamos todo
  domReady()
    .then(() => {
      console.log('DOM listo, inicializando referencias');
      return initDOMReferences();
    })
    .then(() => {
      console.log('Referencias DOM inicializadas');
      
      // Agregar estilos dinámicos
      addDynamicStyles();
      
      // Configurar eventos
      setupWelcomeEvents();
      
      // Simular carga
      setTimeout(() => {
        if (loader) {
          loader.style.opacity = 0;
          loader.style.visibility = 'hidden';
        }
        
        // Mostrar pantalla de bienvenida
        showScreen('welcome-screen');
        console.log('Aplicación iniciada correctamente');
      }, 2000);
    })
    .catch(error => {
      console.error('Error en la inicialización:', error);
      window.showLoadingError && window.showLoadingError(error.message);
    });
}

// Configurar eventos de la pantalla de bienvenida
function setupWelcomeEvents() {
  document.getElementById('new-tournament-btn').addEventListener('click', () => {
    // Si hay un torneo en curso, confirmar antes de continuar
    if (tournament.gameStarted) {
      if (confirm('¿Estás seguro de crear un nuevo torneo? El torneo actual se guardará y podrás volver a él más tarde.')) {
        // Guardar el torneo actual
        savedTournament = JSON.parse(JSON.stringify(tournament));
        
        // Mostrar botón para volver al torneo
        const returnBtn = document.createElement('button');
        returnBtn.id = 'return-tournament-btn';
        returnBtn.className = 'btn btn-primary return-btn';
        returnBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Volver al torneo en curso';
        
        const welcomeScreen = document.getElementById('welcome-screen');
        const newTournamentBtn = document.getElementById('new-tournament-btn');
        
        welcomeScreen.insertBefore(returnBtn, newTournamentBtn);
        
        returnBtn.addEventListener('click', () => {
          // Restaurar el torneo guardado
          restoreSavedTournament();
          showScreen('game-screen');
          updateGameUI();
          startTimers();
        });
        
        // Continuar con la creación del nuevo torneo
        showScreen('config-screen');
        setupConfigScreen();
      }
    } else {
      showScreen('config-screen');
      setupConfigScreen();
    }
  });
}

// Configuración del torneo
function setupConfigScreen() {
  // Resetear variables completamente
  resetTournament();
  
  // Limpiar formularios
  document.getElementById('tournament-name').value = tournament.name;
  document.getElementById('entry-fee').value = tournament.entryFee;
  document.getElementById('player-name').value = '';
  document.getElementById('initial-chips').value = tournament.entryFee;
  
  // Limpiar tablas
  document.getElementById('players-body').innerHTML = '';
  
  // Cargar presets de niveles
  const presetBtns = document.querySelectorAll('.preset-btn');
  presetBtns.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
  });
  
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetName = btn.dataset.preset;
      tournament.levels = [...levelPresets[presetName]];
      updateLevelsTable();
    });
  });
  
  // Inicializar con nivel predeterminado (casual)
  tournament.levels = [...levelPresets.casual];
  updateLevelsTable();
  
  // Restablecer tablas
  updatePlayersTable();
  
  // Configuración para agregar niveles
  const addLevelBtn = document.getElementById('add-level-btn');
  const newAddLevelBtn = addLevelBtn.cloneNode(true);
  addLevelBtn.parentNode.replaceChild(newAddLevelBtn, addLevelBtn);
  
  document.getElementById('add-level-btn').addEventListener('click', () => {
    const smallBlind = parseInt(document.getElementById('small-blind').value);
    const bigBlind = parseInt(document.getElementById('big-blind').value);
    const ante = parseInt(document.getElementById('ante').value) || 0;
    const duration = parseInt(document.getElementById('level-duration').value);
    
    if (isNaN(smallBlind) || isNaN(bigBlind) || isNaN(duration) || smallBlind <= 0 || bigBlind <= 0 || duration <= 0) {
      showNotification('Error', 'Ingresa valores válidos para el nivel.', 'error');
      return;
    }
    
    tournament.levels.push({
      smallBlind,
      bigBlind,
      ante,
      duration
    });
    
    updateLevelsTable();
    
    // Limpiar campos
    document.getElementById('small-blind').value = '';
    document.getElementById('big-blind').value = '';
    document.getElementById('ante').value = '';
    document.getElementById('level-duration').value = '';
  });
  
  // Configuración para agregar jugadores
  const addPlayerBtn = document.getElementById('add-player-btn');
  const newAddPlayerBtn = addPlayerBtn.cloneNode(true);
  addPlayerBtn.parentNode.replaceChild(newAddPlayerBtn, addPlayerBtn);
  
  document.getElementById('add-player-btn').addEventListener('click', () => {
    const playerName = document.getElementById('player-name').value.trim();
    const initialChips = parseInt(document.getElementById('initial-chips').value) || tournament.entryFee;
    
    if (playerName === '') {
      showNotification('Error', 'Ingresa un nombre válido.', 'error');
      return;
    }
    
    // Verificar nombre duplicado
    if (tournament.players.some(p => p.name === playerName)) {
      showNotification('Error', 'Ya existe un jugador con ese nombre.', 'error');
      return;
    }
    
    tournament.players.push({
      id: Date.now().toString(),
      name: playerName,
      chips: initialChips,
      active: true,
      history: []
    });
    
    updatePlayersTable();
    
    // Limpiar campos
    document.getElementById('player-name').value = '';
  });
  
  // Actualizar precio de entrada
  document.getElementById('entry-fee').addEventListener('change', (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      tournament.entryFee = value;
      document.getElementById('initial-chips').value = value;
      updatePrizeDistribution();
    }
  });
  
  // Inicializar botones de navegación
  const steps = document.querySelectorAll('.config-step');
  const nextBtns = document.querySelectorAll('.next-step');
  const prevBtns = document.querySelectorAll('.prev-step');
  
  // Eliminar listeners anteriores
  nextBtns.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
  });
  
  prevBtns.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
  });
  
  // Agregar nuevos listeners
  document.querySelectorAll('.next-step').forEach(btn => {
    btn.addEventListener('click', () => {
      const currentStep = parseInt(btn.dataset.step);
      const nextStep = currentStep + 1;
      
      // Validaciones antes de avanzar
      if (currentStep === 1 && tournament.levels.length === 0) {
        showNotification('Error', 'Debes agregar al menos un nivel.', 'error');
        return;
      }
      
      if (currentStep === 3 && tournament.players.length < 2) {
        showNotification('Error', 'Debes agregar al menos dos jugadores.', 'error');
        return;
      }
      
      // Actualizar UI
      steps.forEach(step => step.style.display = 'none');
      document.getElementById(`step-${nextStep}`).style.display = 'block';
      
      // Actualizar indicador de progreso
      updateProgressIndicator(nextStep);
      
      // Acciones especiales
      if (nextStep === 3) {
        updatePrizeDistribution();
      }
      
      if (nextStep === 4) {
        updateTournamentSummary();
      }
    });
  });
  
  document.querySelectorAll('.prev-step').forEach(btn => {
    btn.addEventListener('click', () => {
      const currentStep = parseInt(btn.dataset.step);
      const prevStep = currentStep - 1;
      
      steps.forEach(step => step.style.display = 'none');
      document.getElementById(`step-${prevStep}`).style.display = 'block';
      
      updateProgressIndicator(prevStep);
    });
  });
  
  // Asegurar que el primer paso sea visible al iniciar
  steps.forEach(step => step.style.display = 'none');
  document.getElementById('step-1').style.display = 'block';
  
  // Restablecer indicador de progreso
  updateProgressIndicator(1);
  
  // Botón de iniciar torneo
  const startTournamentBtn = document.getElementById('start-tournament-btn');
  const newStartTournamentBtn = startTournamentBtn.cloneNode(true);
  startTournamentBtn.parentNode.replaceChild(newStartTournamentBtn, startTournamentBtn);
  
  document.getElementById('start-tournament-btn').addEventListener('click', () => {
    tournament.name = document.getElementById('tournament-name').value;
    
    if (tournament.players.length < 2) {
      showNotification('Error', 'Se necesitan al menos 2 jugadores para iniciar.', 'error');
      return;
    }
    
    if (tournament.levels.length === 0) {
      showNotification('Error', 'Se necesita al menos un nivel.', 'error');
      return;
    }
    
    tournament.totalPot = tournament.players.reduce((sum, player) => sum + player.chips, 0);
    
    // Iniciar el torneo
    startTournament();
  });
}

// Actualizar tabla de niveles
function updateLevelsTable() {
  const tableBody = document.getElementById('levels-body');
  tableBody.innerHTML = '';
  
  tournament.levels.forEach((level, index) => {
    const row = document.createElement('div');
    row.className = 'level-item';
    
    row.innerHTML = `
      <div>${index + 1}</div>
      <div>$${formatMoney(level.smallBlind)}</div>
      <div>$${formatMoney(level.bigBlind)}</div>
      <div>${level.ante > 0 ? '$' + formatMoney(level.ante) : '-'}</div>
      <div>${level.duration} min</div>
      <div>
        <button class="btn btn-outline btn-sm delete-level" data-index="${index}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Eventos para eliminar niveles
  document.querySelectorAll('.delete-level').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      tournament.levels.splice(index, 1);
      updateLevelsTable();
    });
  });
}

// Actualizar tabla de jugadores
function updatePlayersTable() {
  const tableBody = document.getElementById('players-body');
  tableBody.innerHTML = '';
  
  tournament.players.forEach((player, index) => {
    const row = document.createElement('div');
    row.className = 'player-item';
    
    row.innerHTML = `
      <div>${player.name}</div>
      <div>$${formatMoney(player.chips)}</div>
      <div>
        <button class="btn btn-outline btn-sm delete-player" data-index="${index}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Eventos para eliminar jugadores
  document.querySelectorAll('.delete-player').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      tournament.players.splice(index, 1);
      updatePlayersTable();
      updatePrizeDistribution();
    });
  });
  
  // Actualizar bote total
  tournament.totalPot = tournament.players.reduce((sum, player) => sum + player.chips, 0);
  updatePrizeDistribution();
}

// Actualizar indicador de progreso
function updateProgressIndicator(step) {
  const steps = document.querySelectorAll('.progress-step');
  steps.forEach((s, i) => {
    if (i + 1 < step) {
      s.classList.remove('active');
      s.classList.add('completed');
      s.innerHTML = '<i class="fas fa-check"></i>';
    } else if (i + 1 === step) {
      s.classList.add('active');
      s.classList.remove('completed');
      s.textContent = i + 1;
    } else {
      s.classList.remove('active', 'completed');
      s.textContent = i + 1;
    }
  });
}

// Actualizar distribución de premios
function updatePrizeDistribution() {
  const numPlayers = tournament.players.length;
  const totalPrize = tournament.totalPot;
  const distributionList = document.getElementById('prize-distribution-list');
  distributionList.innerHTML = '';
  
  // Sin jugadores, no hay premios
  if (numPlayers === 0) return;
  
  // Calcular distribución según el número de jugadores
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
  
  // Mostrar distribución hasta el máximo disponible
  const maxPositions = Math.min(distribution.length, numPlayers);
  
  for (let i = 0; i < maxPositions; i++) {
    const percentage = distribution[i];
    const prize = Math.round(totalPrize * percentage / 100);
    
    const prizeItem = document.createElement('div');
    prizeItem.className = 'prize-position';
    prizeItem.innerHTML = `
      <div class="prize-position-label">${i + 1}° Lugar</div>
      <div class="prize-amount">$${formatMoney(prize)}</div>
      <div class="prize-percentage">${percentage}%</div>
    `;
    
    distributionList.appendChild(prizeItem);
  }
}

// Actualizar el resumen del torneo
function updateTournamentSummary() {
  document.getElementById('summary-tournament-name').textContent = document.getElementById('tournament-name').value;
  document.getElementById('summary-players').textContent = tournament.players.length;
  document.getElementById('summary-buy-in').textContent = `$${formatMoney(tournament.entryFee)}`;
  document.getElementById('summary-total-pot').textContent = `$${formatMoney(tournament.totalPot)}`;
  document.getElementById('summary-levels').textContent = tournament.levels.length;
  
  // Calcular duración estimada
  const totalMinutes = tournament.levels.reduce((sum, level) => sum + level.duration, 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  document.getElementById('summary-duration').textContent = `${hours}h ${minutes}m`;
}

// Iniciar el torneo
function startTournament() {
  showScreen('game-screen');
  tournament.gameStarted = true;
  tournament.isRunning = true;
  tournament.currentLevelIndex = 0;

  // Inicializar temporizadores
  tournament.levelTimer = tournament.levels[0].duration * 60;
  
  // Actualizar la interfaz del juego
  updateGameUI();
  
  // Iniciar los temporizadores
  startTimers();

  // Configurar eventos para el juego
  setupGameEvents();
  
  // Mostrar notificación
  showNotification('Torneo iniciado', '¡Buena suerte a todos los jugadores!', 'success');
}

// Configurar eventos específicos de la pantalla de juego
function setupGameEvents() {
  // Mostrar/ocultar la estructura de ciegas
  const structureBtn = document.getElementById('structure-btn');
  const newStructureBtn = structureBtn.cloneNode(true);
  structureBtn.parentNode.replaceChild(newStructureBtn, structureBtn);
  
  document.getElementById('structure-btn').addEventListener('click', () => {
    const blindStructure = document.getElementById('blind-structure');
    blindStructure.style.display = blindStructure.style.display === 'none' ? 'block' : 'none';
  });

  // Cerrar estructura de ciegas
  const closeStructure = document.getElementById('close-structure');
  const newCloseStructure = closeStructure.cloneNode(true);
  closeStructure.parentNode.replaceChild(newCloseStructure, closeStructure);
  
  document.getElementById('close-structure').addEventListener('click', () => {
    document.getElementById('blind-structure').style.display = 'none';
  });

  // Evento de cerrar panel de jugador
  const closePanel = document.querySelector('.close-panel');
  const newClosePanel = closePanel.cloneNode(true);
  closePanel.parentNode.replaceChild(newClosePanel, closePanel);
  
  document.querySelector('.close-panel').addEventListener('click', () => {
    document.getElementById('player-action-panel').classList.remove('active');
  });

  // Evento de pausa/reanudar
  const pauseBtn = document.getElementById('pause-btn');
  const newPauseBtn = pauseBtn.cloneNode(true);
  pauseBtn.parentNode.replaceChild(newPauseBtn, pauseBtn);
  
  document.getElementById('pause-btn').addEventListener('click', togglePause);

  // Evento de avanzar nivel
  const nextLevelBtn = document.getElementById('next-level-btn');
  const newNextLevelBtn = nextLevelBtn.cloneNode(true);
  nextLevelBtn.parentNode.replaceChild(newNextLevelBtn, nextLevelBtn);
  
  document.getElementById('next-level-btn').addEventListener('click', () => {
    if (confirm('¿Estás seguro de avanzar al siguiente nivel?')) {
      advanceToNextLevel();
    }
  });

  // Evento de añadir jugador en juego
  const addPlayerGameBtn = document.getElementById('add-player-game-btn');
  const newAddPlayerGameBtn = addPlayerGameBtn.cloneNode(true);
  addPlayerGameBtn.parentNode.replaceChild(newAddPlayerGameBtn, addPlayerGameBtn);
  
  document.getElementById('add-player-game-btn').addEventListener('click', () => {
    const playerName = prompt('Nombre del nuevo jugador:');
    if (playerName && playerName.trim() !== '') {
      addNewPlayerDuringGame(playerName.trim());
    }
  });

  // Evento de finalizar torneo
  const endTournamentBtn = document.getElementById('end-tournament-btn');
  const newEndTournamentBtn = endTournamentBtn.cloneNode(true);
  endTournamentBtn.parentNode.replaceChild(newEndTournamentBtn, endTournamentBtn);
  
  document.getElementById('end-tournament-btn').addEventListener('click', () => {
    if (confirm('¿Estás seguro de terminar el torneo? Esta acción no se puede deshacer.')) {
      endTournament();
    }
  });
}

// Actualizar toda la interfaz del juego
function updateGameUI() {
  // Actualizar información del torneo
  document.getElementById('game-tournament-name').textContent = tournament.name;
  document.getElementById('players-count').textContent = tournament.players.filter(p => p.active).length;
  document.getElementById('total-pot').innerHTML = `<span class="highlight-pot">$${formatMoney(tournament.totalPot)}</span>`;
  
  // Actualizar información del nivel actual
  const currentLevel = tournament.levels[tournament.currentLevelIndex];
  document.getElementById('current-level').textContent = `Nivel ${tournament.currentLevelIndex + 1}`;
  document.getElementById('current-blinds-values').textContent = `$${formatMoney(currentLevel.smallBlind)} / $${formatMoney(currentLevel.bigBlind)}`;
  
  if (currentLevel.ante > 0) {
    document.getElementById('current-blind-ante').textContent = `Ante: $${formatMoney(currentLevel.ante)}`;
    document.getElementById('current-blind-ante').style.display = 'block';
  } else {
    document.getElementById('current-blind-ante').style.display = 'none';
  }
  
  // Actualizar información del próximo nivel
  const nextLevelIndex = tournament.currentLevelIndex + 1;
  if (nextLevelIndex < tournament.levels.length) {
    const nextLevel = tournament.levels[nextLevelIndex];
    document.getElementById('next-blind-values').textContent = `$${formatMoney(nextLevel.smallBlind)} / $${formatMoney(nextLevel.bigBlind)}`;
    document.getElementById('next-level-box').style.display = 'block';
  } else {
    document.getElementById('next-level-box').style.display = 'none';
  }
  
  // Actualizar estructura de ciegas
  updateBlindStructureTable();
  
  // Actualizar tarjetas de jugadores
  updatePlayerCards();
}

// Actualizar tabla de estructura de ciegas
function updateBlindStructureTable() {
  const tableBody = document.getElementById('structure-table-body');
  tableBody.innerHTML = '';
  
  tournament.levels.forEach((level, index) => {
    const row = document.createElement('tr');
    if (index === tournament.currentLevelIndex) {
      row.className = 'current-level-row';
    }
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>$${formatMoney(level.smallBlind)}</td>
      <td>$${formatMoney(level.bigBlind)}</td>
      <td>${level.ante > 0 ? '$' + formatMoney(level.ante) : '-'}</td>
      <td>${level.duration} min</td>
    `;
    
    tableBody.appendChild(row);
  });
}

// Actualizar las tarjetas de jugadores
function updatePlayerCards() {
  const playersContainer = document.getElementById('players-container');
  playersContainer.innerHTML = '';
  
  // Ordenar jugadores: primero activos con más fichas, luego eliminados
  const sortedPlayers = [...tournament.players].sort((a, b) => {
    if (a.active && !b.active) return -1;
    if (!a.active && b.active) return 1;
    if (a.active && b.active) return b.chips - a.chips;
    return 0;
  });
  
  sortedPlayers.forEach(player => {
    const card = document.createElement('div');
    card.className = `player-card ${player.active ? '' : 'eliminated'}`;
    card.dataset.playerId = player.id;
    
    // Calcular el gasto total del jugador
    const totalSpent = calculatePlayerTotalSpent(player, tournament.entryFee);
    const rebuys = calculatePlayerRebuys(player);
    
    card.innerHTML = `
      <div class="player-name">${player.name}</div>
      <div class="player-chips">$${formatMoney(player.chips)}</div>
      <div class="player-spent">$${formatMoney(totalSpent)}</div>
      ${rebuys > 0 ? `<div class="player-rebuys">x${rebuys} reentrada${rebuys > 1 ? 's' : ''}</div>` : ''}
      <div class="player-status-label ${player.active ? '' : 'eliminated'}">
        ${player.active ? 'Activo' : 'Eliminado'}
      </div>
      <div class="player-actions">
        ${player.active ? `
          <button class="btn btn-primary action-btn" data-player-id="${player.id}">
            <i class="fas fa-coins"></i> Fichas
          </button>
          <button class="btn btn-success rebuy-active-btn" data-player-id="${player.id}">
            <i class="fas fa-redo"></i> Recompra
          </button>
          <button class="btn btn-danger eliminate-btn" data-player-id="${player.id}">
            <i class="fas fa-times"></i>
          </button>
        ` : `
          <button class="btn btn-success rebuy-btn" data-player-id="${player.id}">
            <i class="fas fa-redo"></i> Recompra
          </button>
        `}
      </div>
    `;
    
    playersContainer.appendChild(card);
  });
  
  // Eventos para los botones de acción de jugadores
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const playerId = btn.dataset.playerId;
      openPlayerActionPanel(playerId);
    });
  });
  
  document.querySelectorAll('.eliminate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const playerId = btn.dataset.playerId;
      eliminatePlayer(playerId);
    });
  });
  
  document.querySelectorAll('.rebuy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const playerId = btn.dataset.playerId;
      rebuyPlayer(playerId);
    });
  });
  
  document.querySelectorAll('.rebuy-active-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const playerId = btn.dataset.playerId;
      rebuyActivePlayer(playerId);
    });
  });
}

// Abrir panel de acción para un jugador
function openPlayerActionPanel(playerId) {
  const player = tournament.players.find(p => p.id === playerId);
  if (!player) return;
  
  // Actualizar el panel con la información del jugador
  document.getElementById('action-player-name').textContent = player.name;
  document.getElementById('action-player-chips').textContent = `$${formatMoney(player.chips)}`;
  
  // Limpiar historial
  const historyList = document.getElementById('player-history-list');
  historyList.innerHTML = '';
  
  // Mostrar historial
  player.history.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-item';
    
    let actionText = '';
    let iconClass = '';
    
    switch(entry.action) {
      case 'add':
        actionText = `+$${formatMoney(entry.amount)}`;
        iconClass = 'plus';
        break;
      case 'remove':
        actionText = `-$${formatMoney(entry.amount)}`;
        iconClass = 'minus';
        break;
      case 'rebuy':
        actionText = `Recompra: $${formatMoney(entry.amount)}`;
        iconClass = 'plus';
        break;
      case 'eliminate':
        actionText = `Eliminado: Nivel ${entry.level}`;
        iconClass = 'minus';
        break;
    }
    
    item.innerHTML = `
      <div class="history-action">
        <i class="fas fa-${iconClass === 'plus' ? 'plus' : 'minus'} history-icon ${iconClass}"></i>
        ${actionText}
      </div>
      <div class="history-time">${formatTime(entry.time)}</div>
    `;
    
    historyList.appendChild(item);
  });
  
  // Mostrar el panel
  const actionPanel = document.getElementById('player-action-panel');
  actionPanel.classList.add('active');
  
  // Eliminar listeners anteriores para evitar duplicación
  const chipButtons = document.querySelectorAll('.chip-btn');
  chipButtons.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
  });
  
  const customChipsBtn = document.getElementById('add-custom-chips');
  const newCustomBtn = customChipsBtn.cloneNode(true);
  customChipsBtn.parentNode.replaceChild(newCustomBtn, customChipsBtn);
  
  const rebuyBtn = document.getElementById('rebuy-btn');
  const newRebuyBtn = rebuyBtn.cloneNode(true);
  rebuyBtn.parentNode.replaceChild(newRebuyBtn, rebuyBtn);
  
  const eliminateBtn = document.getElementById('eliminate-btn');
  const newEliminateBtn = eliminateBtn.cloneNode(true);
  eliminateBtn.parentNode.replaceChild(newEliminateBtn, eliminateBtn);
  
  // Configurar evento para botones de fichas
  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = parseInt(btn.dataset.value);
      addChipsToPlayer(player, amount);
    });
  });
  
  // Botón de agregar fichas personalizadas
  document.getElementById('add-custom-chips').addEventListener('click', () => {
    const amount = parseInt(document.getElementById('custom-chips').value);
    if (!isNaN(amount) && amount > 0) {
      addChipsToPlayer(player, amount);
      document.getElementById('custom-chips').value = '';
    }
  });
  
  // Botón de recompra
  document.getElementById('rebuy-btn').addEventListener('click', () => {
    addChipsToPlayer(player, tournament.entryFee);
    
    // Registrar acción en el historial
    player.history.push({
      action: 'rebuy',
      time: tournament.globalTimer,
      amount: tournament.entryFee,
      level: tournament.currentLevelIndex + 1
    });
    
    // Mostrar notificación
    showNotification('Recompra realizada', `${player.name} ha realizado una recompra de $${formatMoney(tournament.entryFee)}.`, 'success');
    
    // Actualizar interfaz
    updateGameUI();
  });
  
  // Botón de eliminar jugador
  document.getElementById('eliminate-btn').addEventListener('click', () => {
    closePlayerActionPanel();
    eliminatePlayer(player.id);
  });
}

// Cerrar panel de acción de jugador
function closePlayerActionPanel() {
  const actionPanel = document.getElementById('player-action-panel');
  actionPanel.classList.remove('active');
}

// Mostrar modal de resultados
function showResultsModal(positions) {
  showScreen('results-screen');
  
  // Actualizar información del torneo en los resultados
  document.getElementById('result-tournament-name').textContent = tournament.name;
  document.getElementById('final-duration').textContent = formatTime(tournament.globalTimer);
  document.getElementById('final-players').textContent = tournament.players.length;
  document.getElementById('final-pot').textContent = `$${formatMoney(tournament.totalPot)}`;
  document.getElementById('final-levels').textContent = tournament.currentLevelIndex + 1;
  
  // Actualizar posiciones en el podio
  if (positions.length > 0) {
    const first = positions[0];
    document.querySelector('#first-place .winner-name').textContent = first.player.name;
    document.querySelector('#first-place .winner-prize').textContent = `$${formatMoney(first.prize)}`;
  }
  
  if (positions.length > 1) {
    const second = positions[1];
    document.querySelector('#second-place .winner-name').textContent = second.player.name;
    document.querySelector('#second-place .winner-prize').textContent = `$${formatMoney(second.prize)}`;
  }
  
  if (positions.length > 2) {
    const third = positions[2];
    document.querySelector('#third-place .winner-name').textContent = third.player.name;
    document.querySelector('#third-place .winner-prize').textContent = `$${formatMoney(third.prize)}`;
  }
  
  // Configurar botones de finalización
  document.getElementById('finish-tournament-btn').addEventListener('click', () => {
    resetTournament();
    showScreen('welcome-screen');
  });
}

// Exportar funciones
export {
  init,
  setupWelcomeEvents,
  setupConfigScreen,
  updateLevelsTable,
  updatePlayersTable,
  updateProgressIndicator,
  updatePrizeDistribution,
  updateTournamentSummary,
  startTournament,
  setupGameEvents,
  updateGameUI,
  updateBlindStructureTable,
  updatePlayerCards,
  openPlayerActionPanel,
  closePlayerActionPanel,
  showResultsModal
}; 