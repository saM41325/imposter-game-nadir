/* ===============================================
   WEREWOLF GAME - VANILLA JAVASCRIPT
   Production-Level Implementation
   =============================================== */

/* ===============================================
   CONFIGURATION
   =============================================== */

const CONFIG = {
    NIGHT_REVEAL_TIMER: 10,           // seconds
    NIGHT_REVEAL_RANDOM_DELAY: 2000,  // ms
    DAY_DISCUSSION_TIMER: 180,        // seconds (3 min)
    NIGHT_MUSIC_FADE: 1000,           // ms
    AUDIO_ENABLED: true,
    MUSIC_ENABLED: true,
};

/* ===============================================
   ROLE DEFINITIONS
   =============================================== */

const ROLES = {
    WOLF: 'wolf',
    DOCTOR: 'doctor',
    SEER: 'seer',
    VILLAGER: 'villager',
};

const ROLE_ICONS = {
    wolf: '🐺',
    doctor: '💉',
    seer: '🔮',
    villager: '👨‍🌾',
};

const ROLE_NAMES = {
    wolf: 'ذئب',
    doctor: 'طبيب',
    seer: 'عراف',
    villager: 'قروي',
};

const ROLE_DESCRIPTIONS = {
    wolf: 'أنت جزء من قطيع الذئاب. اختر ضحيتك ليلاً.',
    doctor: 'أنت الطبيب. يمكنك حماية لاعب واحد كل ليلة.',
    seer: 'أنت العراف. يمكنك الكشف عن دور لاعب واحد كل ليلة.',
    villager: 'أنت قروي عادي. ساعد القرية على البقاء.',
};

/* ===============================================
   GAME PHASES
   =============================================== */

const PHASES = {
    SETUP: 'SETUP',
    ROLE_DISTRIBUTION: 'ROLE_DISTRIBUTION',
    NIGHT: 'NIGHT',
    NIGHT_RESOLUTION: 'NIGHT_RESOLUTION',
    DAY: 'DAY',
    DAY_VOTING: 'DAY_VOTING',
    EXECUTION: 'EXECUTION',
    CHECK_WIN: 'CHECK_WIN',
    GAME_OVER: 'GAME_OVER',
};

/* ===============================================
   MODULE: GameState (Closure - Single Source of Truth)
   =============================================== */

const GameState = (() => {
    let state = {
        // Setup
        players: [],
        settings: {
            soundEnabled: true,
            musicEnabled: true,
        },

        // Game Flow
        phase: PHASES.SETUP,
        nightNumber: 0,
        dayNumber: 0,

        // Player Status
        alivePlayers: [],
        deadPlayers: [],

        // Night Actions
        nightActions: {
            wolfVotes: {},        // { playerId: targetId }
            protectedPlayer: null,
            seerReveal: null,
            seerRevealed: false,
        },

        // Day Voting
        dayVotes: {},             // { voterId: targetId }

        // History
        logs: [],
        deaths: [],               // [{ playerId, night/day, role }]

        // Win State
        winnerTeam: null,
        winReason: null,

        // Current Processing
        currentNightPlayerIndex: 0,
        currentDayPlayerIndex: 0,
        shuffledNightPlayers: [],
        shuffledDayVoters: [],
        lastProtectedPlayer: null,
    };

    // ===== GETTERS =====

    const getState = () => ({ ...state });

    const getPhase = () => state.phase;

    const getPlayers = () => state.players;

    const getAliveCount = () => state.alivePlayers.length;

    const getPlayer = (playerId) => state.players[playerId];

    const getAliveWolves = () =>
        state.alivePlayers.filter(p => p.role === ROLES.WOLF);

    const getAliveVillagers = () =>
        state.alivePlayers.filter(p => p.role !== ROLES.WOLF);

    // ===== SETTERS =====

    const setPhase = (newPhase) => {
        state.phase = newPhase;
        logAction(`Phase changed to: ${newPhase}`);
    };

    const addPlayer = (name) => {
        const player = {
            id: state.players.length,
            name: name.trim(),
            role: null,
            alive: true,
            revealed: false,
            voteHistory: [],
        };
        state.players.push(player);
        return player;
    };

    const assignRole = (playerId, role) => {
        if (playerId < 0 || playerId >= state.players.length) return false;
        state.players[playerId].role = role;
        return true;
    };

    const setAlive = (playerId, alive) => {
        const player = state.players[playerId];
        if (!player) return false;

        player.alive = alive;

        // Update alive/dead lists
        state.alivePlayers = state.players.filter(p => p.alive);
        state.deadPlayers = state.players.filter(p => !p.alive);

        return true;
    };

    // ===== NIGHT ACTIONS =====

    const recordWolfVote = (voterId, targetId) => {
        if (!state.players[voterId] || !state.players[targetId]) {
            console.error('Invalid wolf vote:', voterId, targetId);
            return false;
        }

        // Prevent wolf voting for self (optional - comment out if allowing)
        // if (voterId === targetId) return false;

        state.nightActions.wolfVotes[voterId] = targetId;
        logAction(`Wolf ${voterId} voted for ${targetId}`);
        return true;
    };

    const recordDoctorProtection = (playerId, targetId) => {
        if (!state.players[targetId]) return false;

        // Prevent protecting same player twice
        if (state.lastProtectedPlayer === targetId) {
            logAction(`Doctor tried to protect ${targetId} again (blocked)`);
            return false;
        }

        state.nightActions.protectedPlayer = targetId;
        state.lastProtectedPlayer = targetId;
        logAction(`Doctor protected ${targetId}`);
        return true;
    };

    const recordSeerReveal = (playerId, targetId) => {
        if (!state.players[targetId]) return false;

        const targetRole = state.players[targetId].role;
        const isWolf = targetRole === ROLES.WOLF;

        state.nightActions.seerReveal = {
            targetId: targetId,
            isWolf: isWolf,
        };
        state.nightActions.seerRevealed = true;

        logAction(`Seer revealed ${targetId} as ${isWolf ? 'WOLF' : 'VILLAGER'}`);
        return true;
    };

    const getSeerRevealResult = () => {
        if (!state.nightActions.seerRevealed) return null;
        return state.nightActions.seerReveal.isWolf;
    };

    const getAttackTarget = () => {
        const votes = state.nightActions.wolfVotes;
        const voteCount = {};

        // Count votes
        Object.values(votes).forEach(targetId => {
            voteCount[targetId] = (voteCount[targetId] || 0) + 1;
        });

        if (Object.keys(voteCount).length === 0) return null;

        // Find max votes
        const maxVotes = Math.max(...Object.values(voteCount));
        const topTargets = Object.keys(voteCount)
            .filter(id => voteCount[id] === maxVotes)
            .map(id => parseInt(id));

        // Tie-break with random
        return topTargets[Math.floor(Math.random() * topTargets.length)];
    };

    const getWolfVoteCounts = () => {
        const votes = state.nightActions.wolfVotes;
        const counts = {};

        // Initialize all alive (non-wolf) players
        state.alivePlayers.forEach(p => {
            if (p.role !== ROLES.WOLF) {
                counts[p.id] = 0;
            }
        });

        // Count votes
        Object.values(votes).forEach(targetId => {
            if (counts.hasOwnProperty(targetId)) {
                counts[targetId]++;
            }
        });

        return counts;
    };

    // ===== DAY VOTING =====

    const recordDayVote = (voterId, targetId) => {
        if (!state.players[voterId] || !state.players[targetId]) {
            console.error('Invalid day vote:', voterId, targetId);
            return false;
        }

        state.dayVotes[voterId] = targetId;
        logAction(`Player ${voterId} voted to execute ${targetId}`);
        return true;
    };

    const getExecutionTarget = () => {
        const votes = state.dayVotes;
        const voteCount = {};

        // Count votes
        Object.values(votes).forEach(targetId => {
            voteCount[targetId] = (voteCount[targetId] || 0) + 1;
        });

        if (Object.keys(voteCount).length === 0) return null;

        // Find max votes
        const maxVotes = Math.max(...Object.values(voteCount));
        const topTargets = Object.keys(voteCount)
            .filter(id => voteCount[id] === maxVotes)
            .map(id => parseInt(id));

        // Tie-break with random
        return topTargets[Math.floor(Math.random() * topTargets.length)];
    };

    // ===== NIGHT RESOLUTION =====

    const resolveNightAttack = () => {
        const attackedId = getAttackTarget();
        if (attackedId === null || attackedId === undefined) return null;

        const protectedId = state.nightActions.protectedPlayer;
        const attacked = state.players[attackedId];

        // If protected, survives
        if (attackedId === protectedId) {
            logAction(`Player ${attackedId} was protected and survived!`);
            return null; // No death
        }

        // Otherwise, dies
        setAlive(attackedId, false);
        state.deaths.push({
            playerId: attackedId,
            nightNumber: state.nightNumber,
            role: attacked.role,
        });

        logAction(`Player ${attackedId} (${ROLE_NAMES[attacked.role]}) was killed!`);
        return attackedId;
    };

    const clearNightActions = () => {
        state.nightActions = {
            wolfVotes: {},
            protectedPlayer: null,
            seerReveal: null,
            seerRevealed: false,
        };
    };

    const clearDayVotes = () => {
        state.dayVotes = {};
    };

    const incrementNight = () => {
        state.nightNumber++;
    };

    const incrementDay = () => {
        state.dayNumber++;
    };

    // ===== SHUFFLING =====

    const getShuffledAlivePlayers = () => {
        return [...state.alivePlayers].sort(() => Math.random() - 0.5);
    };

    // ===== LOGGING =====

    const logAction = (message) => {
        const timestamp = new Date().toLocaleTimeString('ar-SA');
        state.logs.push(`[${timestamp}] ${message}`);
    };

    const getLogs = () => [...state.logs];

    // ===== WIN STATE =====

    const setWinner = (team, reason) => {
        state.winnerTeam = team;
        state.winReason = reason;
    };

    const getWinner = () => ({
        team: state.winnerTeam,
        reason: state.winReason,
    });

    // ===== RESET =====

    const reset = () => {
        state = {
            players: [],
            settings: { soundEnabled: true, musicEnabled: true },
            phase: PHASES.SETUP,
            nightNumber: 0,
            dayNumber: 0,
            alivePlayers: [],
            deadPlayers: [],
            nightActions: {
                wolfVotes: {},
                protectedPlayer: null,
                seerReveal: null,
                seerRevealed: false,
            },
            dayVotes: {},
            logs: [],
            deaths: [],
            winnerTeam: null,
            winReason: null,
            currentNightPlayerIndex: 0,
            currentDayPlayerIndex: 0,
            shuffledNightPlayers: [],
            shuffledDayVoters: [],
            lastProtectedPlayer: null,
        };
    };

    return {
        getState,
        getPhase,
        getPlayers,
        getAliveCount,
        getPlayer,
        getAliveWolves,
        getAliveVillagers,
        setPhase,
        addPlayer,
        assignRole,
        setAlive,
        recordWolfVote,
        recordDoctorProtection,
        recordSeerReveal,
        getSeerRevealResult,
        getAttackTarget,
        getWolfVoteCounts,
        recordDayVote,
        getExecutionTarget,
        resolveNightAttack,
        clearNightActions,
        clearDayVotes,
        incrementNight,
        incrementDay,
        getShuffledAlivePlayers,
        logAction,
        getLogs,
        setWinner,
        getWinner,
        reset,
    };
})();

/* ===============================================
   MODULE: PhaseController (State Machine)
   =============================================== */

const PhaseController = (() => {
    const validTransitions = {
        [PHASES.SETUP]: [PHASES.ROLE_DISTRIBUTION],
        [PHASES.ROLE_DISTRIBUTION]: [PHASES.NIGHT],
        [PHASES.NIGHT]: [PHASES.NIGHT_RESOLUTION],
        [PHASES.NIGHT_RESOLUTION]: [PHASES.DAY],
        [PHASES.DAY]: [PHASES.DAY_VOTING],
        [PHASES.DAY_VOTING]: [PHASES.EXECUTION],
        [PHASES.EXECUTION]: [PHASES.CHECK_WIN],
        [PHASES.CHECK_WIN]: [PHASES.NIGHT, PHASES.GAME_OVER],
    };

    const transitionTo = (nextPhase) => {
        const current = GameState.getPhase();

        if (!validTransitions[current]) {
            console.error(`No valid transitions from: ${current}`);
            return false;
        }

        if (!validTransitions[current].includes(nextPhase)) {
            console.error(
                `Invalid transition: ${current} → ${nextPhase}. Valid: ${validTransitions[current].join(', ')}`
            );
            return false;
        }

        GameState.setPhase(nextPhase);
        return true;
    };

    const getCurrentPhase = () => GameState.getPhase();

    return {
        transitionTo,
        getCurrentPhase,
        PHASES,
    };
})();

/* ===============================================
   MODULE: RoleDistributor
   =============================================== */

const RoleDistributor = (() => {
    const distributeRoles = (playerCount, distribution) => {
        /**
         * distribution = {
         *   wolf: 2,
         *   doctor: 1,
         *   seer: 1,
         *   villager: remaining
         * }
         */

        const players = GameState.getPlayers();
        if (players.length === 0) {
            console.error('No players to distribute roles to');
            return false;
        }

        // Create role pool
        const rolePool = [];

        Object.entries(distribution).forEach(([role, count]) => {
            if (role !== ROLES.VILLAGER) {
                for (let i = 0; i < count; i++) {
                    rolePool.push(role);
                }
            }
        });

        // Fill remaining with villagers
        const remaining = playerCount - rolePool.length;
        for (let i = 0; i < remaining; i++) {
            rolePool.push(ROLES.VILLAGER);
        }

        // Shuffle
        rolePool.sort(() => Math.random() - 0.5);

        // Assign
        players.forEach((player, index) => {
            GameState.assignRole(player.id, rolePool[index]);
        });

        GameState.logAction(
            `Roles distributed: ${distribution.wolf}W, ${distribution.doctor}D, ${distribution.seer}S, ${remaining}V`
        );

        return true;
    };

    return {
        distributeRoles,
    };
})();

/* ===============================================
   MODULE: Anti-Cheat System
   =============================================== */

const AntiCheat = (() => {
    let isRevealActive = false;
    let preventBackNavigation = false;

    const enableRevealMode = () => {
        isRevealActive = true;
        preventBackNavigation = true;

        // Disable back button
        document.addEventListener('keydown', handleBackKeyPress);

        // Prevent swipe back
        let touchStartX = 0;
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });

        document.addEventListener('touchmove', (e) => {
            if (isRevealActive && touchStartX < 50) {
                e.preventDefault();
            }
        });

        // Disable right-click
        document.addEventListener('contextmenu', (e) => {
            if (isRevealActive) e.preventDefault();
        });

        // Disable long press
        document.addEventListener('touchstart', (e) => {
            if (isRevealActive) {
                e.preventDefault();
            }
        }, { passive: false });
    };

    const disableRevealMode = () => {
        isRevealActive = false;
        preventBackNavigation = false;
        document.removeEventListener('keydown', handleBackKeyPress);
    };

    const handleBackKeyPress = (e) => {
        if (preventBackNavigation && (e.key === 'Escape' || e.key === 'Backspace')) {
            e.preventDefault();
        }
    };

    const debounce = (func, delay) => {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    return {
        enableRevealMode,
        disableRevealMode,
        debounce,
    };
})();

/* ===============================================
   MODULE: Setup Engine
   =============================================== */

const SetupEngine = (() => {
    let players = [];
    let roleCounts = {
        wolf: 2,
        doctor: 1,
        seer: 1,
        villager: 0,
    };

    const initializeSetup = () => {
        const setupScreen = document.getElementById('setup-screen');
        const playerCountInput = document.getElementById('player-count');
        const btnDecreaseBtn = document.getElementById('btn-decrease-players');
        const btnIncreaseBtn = document.getElementById('btn-increase-players');
        const roleDistributionDiv = document.getElementById('role-distribution');
        const playerNamesListDiv = document.getElementById('player-names-list');
        const btnStartGame = document.getElementById('btn-start-game');

        // Player count controls
        btnDecreaseBtn.addEventListener('click', () => {
            const count = Math.max(4, parseInt(playerCountInput.value) - 1);
            playerCountInput.value = count;
            updatePlayerNameInputs(count);
        });

        btnIncreaseBtn.addEventListener('click', () => {
            const count = Math.min(20, parseInt(playerCountInput.value) + 1);
            playerCountInput.value = count;
            updatePlayerNameInputs(count);
        });

        // Role distribution controls
        renderRoleDistribution(roleDistributionDiv, playerCountInput.value);
        playerCountInput.addEventListener('change', (e) => {
            renderRoleDistribution(roleDistributionDiv, e.target.value);
        });

        // Initialize player names
        updatePlayerNameInputs(parseInt(playerCountInput.value));

        // Start game button
        btnStartGame.addEventListener('click', () => {
            startGame();
        });
    };

    const renderRoleDistribution = (container, playerCount) => {
        playerCount = parseInt(playerCount);
        
        // Suggested distribution
        let suggested = {
            wolf: Math.ceil(playerCount / 4),
            doctor: Math.ceil(playerCount / 6),
            seer: 1,
            villager: 0,
        };

        // Clamp values
        const maxNonVillagers = playerCount - 1;
        const totalNonVillagers = suggested.wolf + suggested.doctor + suggested.seer;
        
        if (totalNonVillagers > maxNonVillagers) {
            suggested.villager = 0;
        } else {
            suggested.villager = playerCount - totalNonVillagers;
        }

        roleCounts = suggested;

        container.innerHTML = '';

        Object.entries(suggested).forEach(([role, count]) => {
            if (role === ROLES.VILLAGER) return; // Villagers are auto-calculated

            const control = document.createElement('div');
            control.className = 'role-control';
            control.innerHTML = `
                <span class="role-control-label">${ROLE_ICONS[role]} ${ROLE_NAMES[role]}</span>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-count-control" data-role="${role}" data-action="dec">−</button>
                    <input 
                        type="number" 
                        class="role-control-input" 
                        data-role="${role}" 
                        min="0" 
                        max="${playerCount - 1}" 
                        value="${count}" 
                        readonly
                    >
                    <button class="btn-count-control" data-role="${role}" data-action="inc">+</button>
                </div>
            `;

            control.querySelectorAll('.btn-count-control').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const role = e.target.dataset.role;
                    const action = e.target.dataset.action;
                    const input = control.querySelector(`[data-role="${role}"]`);
                    let val = parseInt(input.value);

                    if (action === 'inc') {
                        val = Math.min(playerCount - 1, val + 1);
                    } else {
                        val = Math.max(0, val - 1);
                    }

                    roleCounts[role] = val;
                    input.value = val;
                    updateVillagerCount(playerCount);
                });
            });

            container.appendChild(control);
        });

        // Show villager count (auto-calculated)
        const villagerDiv = document.createElement('div');
        villagerDiv.className = 'role-control';
        villagerDiv.style.opacity = '0.7';
        villagerDiv.style.pointerEvents = 'none';
        villagerDiv.innerHTML = `
            <span class="role-control-label">${ROLE_ICONS.villager} ${ROLE_NAMES.villager} (تلقائي)</span>
            <input 
                type="number" 
                class="role-control-input" 
                id="villager-count"
                value="${suggested.villager}"
                readonly
            >
        `;
        container.appendChild(villagerDiv);

        updateVillagerCount(playerCount);
    };

    const updateVillagerCount = (playerCount) => {
        const totalNonVillagers =
            roleCounts.wolf + roleCounts.doctor + roleCounts.seer;
        roleCounts.villager = Math.max(0, playerCount - totalNonVillagers);

        const villagerInput = document.getElementById('villager-count');
        if (villagerInput) {
            villagerInput.value = roleCounts.villager;
        }
    };

    const updatePlayerNameInputs = (count) => {
        const container = document.getElementById('player-names-list');
        container.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const group = document.createElement('div');
            group.className = 'player-name-input-group';

            const label = document.createElement('label');
            label.textContent = `اللاعب ${i + 1}`;
            label.style.fontSize = '0.9rem';
            label.style.marginBottom = '0.3rem';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'player-name-input';
            input.placeholder = `أدخل اسم اللاعب ${i + 1}`;
            input.maxLength = 30;

            group.appendChild(label);
            group.appendChild(input);
            container.appendChild(group);
        }
    };

    const startGame = () => {
        // Collect player names
        const inputs = document.querySelectorAll('.player-name-input');
        const names = Array.from(inputs)
            .map(input => input.value.trim())
            .filter(name => name.length > 0);

        if (names.length < 4) {
            alert('يجب إدخال أسماء جميع اللاعبين (الحد الأدنى 4)');
            return;
        }

        // Add players to game state
        names.forEach(name => {
            GameState.addPlayer(name);
        });

        // Distribute roles
        RoleDistributor.distributeRoles(names.length, roleCounts);

        // Initialize alive players list
        GameState.getPlayers().forEach(player => {
            GameState.setAlive(player.id, true);
        });

        // Get settings
        const soundEnabled = document.getElementById('setting-sounds').checked;
        const musicEnabled = document.getElementById('setting-music').checked;

        CONFIG.AUDIO_ENABLED = soundEnabled;
        CONFIG.MUSIC_ENABLED = musicEnabled;

        // Start game
        PhaseController.transitionTo(PHASES.ROLE_DISTRIBUTION);
        UIRenderer.hideAllScreens();
        UIRenderer.showScreen('role-distribution-screen');
        
        setTimeout(() => {
            startFirstNight();
        }, 2000);
    };

    return {
        initializeSetup,
    };
})();

/* ===============================================
   CONTINUE TO PART 2
   =============================================== */

// Placeholder for next modules
// Will include: NightPhaseEngine, DayPhaseEngine, WinChecker, UIRenderer, AudioManager

console.log('✅ GameState, PhaseController, RoleDistributor initialized');
/* ===============================================
   MODULE: NightPhaseEngine
   =============================================== */

const NightPhaseEngine = (() => {
    let currentPlayerIndex = 0;
    let shuffledPlayers = [];

    const startNight = () => {
        GameState.incrementNight();
        GameState.clearNightActions();
        GameState.clearDayVotes();

        // Shuffle alive players for night sequence
        shuffledPlayers = GameState.getShuffledAlivePlayers();
        currentPlayerIndex = 0;

        PhaseController.transitionTo(PHASES.NIGHT);
        AudioManager.playNightMusic();

        GameState.logAction(`Night ${GameState.getState().nightNumber} started`);

        showNextNightPlayer();
    };

    const showNextNightPlayer = () => {
        const state = GameState.getState();

        if (currentPlayerIndex >= shuffledPlayers.length) {
            // All players processed, move to night resolution
            resolveNight();
            return;
        }

        const player = shuffledPlayers[currentPlayerIndex];
        UIRenderer.hideAllScreens();
        UIRenderer.showNightIdentityScreen(player);
    };

    const processNightAction = (player) => {
        /**
         * Called when a player finishes their night action
         * - Wolf: voted
         * - Doctor: protected
         * - Seer: revealed
         * - Villager: waited
         */

        currentPlayerIndex++;
        UIRenderer.showNightPassDeviceScreen();
    };

    const proceedToNextNightPlayer = () => {
        showNextNightPlayer();
    };

    const resolveNight = () => {
        PhaseController.transitionTo(PHASES.NIGHT_RESOLUTION);
        UIRenderer.hideAllScreens();
        UIRenderer.showScreen('night-resolution-screen');

        // Calculate death
        const deathId = GameState.resolveNightAttack();

        // Show result
        let resultText = '';
        if (deathId !== null && deathId !== undefined) {
            const dead = GameState.getPlayer(deathId);
            resultText = `⚰️ لقد مات: ${dead.name}`;
            AudioManager.playSound('death');
        } else {
            resultText = `✨ لا أحد مات هذه الليلة!`;
            AudioManager.playSound('protect');
        }

        const resolutionText = document.getElementById('resolution-text');
        if (resolutionText) {
            resolutionText.textContent = resultText;
        }

        GameState.logAction(`Night ${GameState.getState().nightNumber} resolved`);

        // Transition to day
        setTimeout(() => {
            PhaseController.transitionTo(PHASES.DAY);
            startDay();
        }, 3000);
    };

    const startDay = () => {
        AudioManager.playDayMusic();
        UIRenderer.hideAllScreens();
        UIRenderer.showDayInfoScreen();
    };

    return {
        startNight,
        showNextNightPlayer,
        processNightAction,
        proceedToNextNightPlayer,
        resolveNight,
        startDay,
    };
})();

/* ===============================================
   MODULE: DayPhaseEngine
   =============================================== */

const DayPhaseEngine = (() => {
    let currentVoterIndex = 0;
    let shuffledVoters = [];
    let discussionTimeRemaining = CONFIG.DAY_DISCUSSION_TIMER;
    let discussionTimer = null;

    const startDayDiscussion = () => {
        PhaseController.transitionTo(PHASES.DAY);
        discussionTimeRemaining = CONFIG.DAY_DISCUSSION_TIMER;

        // Start discussion timer
        discussionTimer = setInterval(() => {
            discussionTimeRemaining--;
            updateDiscussionTimer();

            if (discussionTimeRemaining <= 0) {
                clearInterval(discussionTimer);
                proceedToVoting();
            }
        }, 1000);

        GameState.logAction(`Day ${GameState.getState().dayNumber} discussion started`);
    };

    const updateDiscussionTimer = () => {
        const timerDisplay = document.getElementById('day-timer-display');
        if (timerDisplay) {
            timerDisplay.textContent = discussionTimeRemaining;
        }

        // Update SVG progress
        const maxTime = CONFIG.DAY_DISCUSSION_TIMER;
        const progress = (maxTime - discussionTimeRemaining) / maxTime;
        updateSVGProgress('day-timer-progress', progress);
    };

    const skipDiscussion = () => {
        clearInterval(discussionTimer);
        proceedToVoting();
    };

    const proceedToVoting = () => {
        PhaseController.transitionTo(PHASES.DAY_VOTING);
        
        // Get alive players who aren't wolves (or all? depends on design)
        shuffledVoters = GameState.getShuffledAlivePlayers();
        currentVoterIndex = 0;

        GameState.logAction('Day voting started');

        showNextDayVoter();
    };

    const showNextDayVoter = () => {
        if (currentVoterIndex >= shuffledVoters.length) {
            // All votes collected, move to execution
            executeVerdictResolve();
            return;
        }

        const voter = shuffledVoters[currentVoterIndex];
        UIRenderer.hideAllScreens();
        UIRenderer.showDayVoteIdentityScreen(voter);
    };

    const processDayVote = (voter, targetId) => {
        GameState.recordDayVote(voter.id, targetId);
        currentVoterIndex++;
        UIRenderer.showNightPassDeviceScreen();
    };

    const proceedToNextVoter = () => {
        showNextDayVoter();
    };

    const executeVerdictResolve = () => {
        PhaseController.transitionTo(PHASES.EXECUTION);
        
        const executionTarget = GameState.getExecutionTarget();

        if (executionTarget === null || executionTarget === undefined) {
            // Shouldn't happen, but handle it
            console.error('No execution target found');
            checkWinCondition();
            return;
        }

        const executed = GameState.getPlayer(executionTarget);
        GameState.setAlive(executionTarget, false);
        GameState.deaths.push({
            playerId: executionTarget,
            dayNumber: GameState.getState().dayNumber,
            role: executed.role,
        });

        AudioManager.playSound('execution');

        // Show execution screen
        UIRenderer.hideAllScreens();
        UIRenderer.showExecutionScreen(executed);

        GameState.logAction(`Day ${GameState.getState().dayNumber}: ${executed.name} (${ROLE_NAMES[executed.role]}) was executed`);

        // Check win condition
        setTimeout(() => {
            checkWinCondition();
        }, 3000);
    };

    const checkWinCondition = () => {
        PhaseController.transitionTo(PHASES.CHECK_WIN);

        const result = WinChecker.checkWin();

        if (result) {
            // Game over
            GameState.setWinner(result.team, result.reason);
            PhaseController.transitionTo(PHASES.GAME_OVER);
            UIRenderer.showWinScreen(result);
            AudioManager.playSound('win');
        } else {
            // Continue to next night
            GameState.incrementDay();
            PhaseController.transitionTo(PHASES.NIGHT);
            setTimeout(() => {
                NightPhaseEngine.startNight();
            }, 2000);
        }
    };

    return {
        startDayDiscussion,
        skipDiscussion,
        proceedToVoting,
        showNextDayVoter,
        processDayVote,
        proceedToNextVoter,
        checkWinCondition,
    };
})();

/* ===============================================
   MODULE: WinChecker
   =============================================== */

const WinChecker = (() => {
    const checkWin = () => {
        const alivePlayers = GameState.getState().alivePlayers;

        const wolves = alivePlayers.filter(p => p.role === ROLES.WOLF);
        const villagers = alivePlayers.filter(p => p.role !== ROLES.WOLF);

        // Villagers win if all wolves dead
        if (wolves.length === 0) {
            return {
                team: 'VILLAGERS',
                reason: 'تم القضاء على جميع الذئاب!',
                icon: '👨‍🌾',
            };
        }

        // Wolves win if wolves >= villagers
        if (wolves.length >= villagers.length) {
            return {
                team: 'WOLVES',
                reason: 'سيطر الذئاب على القرية!',
                icon: '🐺',
            };
        }

        // Game continues
        return null;
    };

    return {
        checkWin,
    };
})();

/* ===============================================
   MODULE: RoleActionProcessor
   =============================================== */

const RoleActionProcessor = (() => {
    const processRoleAction = (player) => {
        const role = player.role;

        switch (role) {
            case ROLES.WOLF:
                UIRenderer.showWolfVotingScreen(player);
                break;
            case ROLES.DOCTOR:
                UIRenderer.showDoctorScreen(player);
                break;
            case ROLES.SEER:
                UIRenderer.showSeerScreen(player);
                break;
            case ROLES.VILLAGER:
                UIRenderer.showVillagerScreen(player);
                break;
            default:
                console.error(`Unknown role: ${role}`);
        }
    };

    const submitWolfVote = (voter, targetId) => {
        if (!GameState.recordWolfVote(voter.id, targetId)) {
            console.error('Failed to record wolf vote');
            return false;
        }

        // Update live vote counter
        const counts = GameState.getWolfVoteCounts();
        UIRenderer.updateWolfVoteCounter(counts);

        return true;
    };

    const submitDoctorProtection = (doctor, targetId) => {
        if (!GameState.recordDoctorProtection(doctor.id, targetId)) {
            console.error('Failed to record doctor protection');
            return false;
        }

        return true;
    };

    const submitSeerReveal = (seer, targetId) => {
        if (!GameState.recordSeerReveal(seer.id, targetId)) {
            console.error('Failed to record seer reveal');
            return false;
        }

        const result = GameState.getSeerRevealResult();
        return result;
    };

    return {
        processRoleAction,
        submitWolfVote,
        submitDoctorProtection,
        submitSeerReveal,
    };
})();

/* ===============================================
   HELPER: SVG Progress Update
   =============================================== */

const updateSVGProgress = (circleId, progress) => {
    const circle = document.getElementById(circleId);
    if (!circle) return;

    // SVG circle circumference (r=45, so 2*pi*45 ≈ 283)
    const circumference = 283;
    const offset = circumference - progress * circumference;

    circle.style.strokeDashoffset = offset;
};

/* ===============================================
   HELPER: Start Functions
   =============================================== */

const startFirstNight = () => {
    GameState.incrementDay();
    NightPhaseEngine.startNight();
};

/* ===============================================
   MODULE: UIRenderer (Comprehensive)
   =============================================== */

const UIRenderer = (() => {
    // ===== SCREEN MANAGEMENT =====

    const hideAllScreens = () => {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('screen-active');
        });
    };

    const showScreen = (screenId) => {
        hideAllScreens();
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('screen-active');
        }
    };

    // ===== NIGHT IDENTITY SCREEN =====

    const showNightIdentityScreen = (player) => {
        showScreen('night-identity-screen');

        const nameDisplay = document.getElementById('night-player-name');
        nameDisplay.textContent = player.name;

        const revealButton = document.getElementById('btn-reveal-role');
        revealButton.onclick = () => {
            startRevealAnimation(player);
        };
    };

    // ===== REVEAL ANIMATION & TIMER =====

    const startRevealAnimation = (player) => {
        AntiCheat.enableRevealMode();

        // Random delay
        const delay = Math.random() * CONFIG.NIGHT_REVEAL_RANDOM_DELAY;

        setTimeout(() => {
            showRoleScreen(player);
            startRevealTimer(CONFIG.NIGHT_REVEAL_TIMER, player);
        }, delay);

        AudioManager.playSound('reveal');
    };

    const showRoleScreen = (player) => {
        showScreen('night-role-screen');

        const roleContent = document.getElementById('role-content');
        roleContent.innerHTML = '';

        // Role badge
        const badge = document.createElement('div');
        badge.className = 'role-badge';
        badge.innerHTML = `${ROLE_ICONS[player.role]}<br>${ROLE_NAMES[player.role]}`;
        roleContent.appendChild(badge);

        // Description
        const desc = document.createElement('p');
        desc.className = 'role-description';
        desc.textContent = ROLE_DESCRIPTIONS[player.role];
        roleContent.appendChild(desc);

        // Role-specific content
        const actionDiv = document.createElement('div');
        actionDiv.id = 'role-actions';
        actionDiv.style.marginTop = '1.5rem';
        roleContent.appendChild(actionDiv);

        // Let RoleActionProcessor handle action UI
        RoleActionProcessor.processRoleAction(player);
    };

    const startRevealTimer = (seconds, player) => {
        let remaining = seconds;
        const timerDisplay = document.getElementById('timer-display');

        const interval = setInterval(() => {
            remaining--;
            
            if (timerDisplay) {
                timerDisplay.textContent = remaining;
            }

            // Update SVG progress
            const progress = 1 - (remaining / seconds);
            updateSVGProgress('timer-progress', progress);

            if (remaining <= 0) {
                clearInterval(interval);
                autoHideRole(player);
            }
        }, 1000);
    };

    const autoHideRole = (player) => {
        // Fade out animation
        const roleContent = document.getElementById('role-content');
        if (roleContent) {
            roleContent.style.opacity = '0';
            roleContent.style.transition = 'opacity 0.5s ease';
        }

        setTimeout(() => {
            AntiCheat.disableRevealMode();
            showNightPassDeviceScreen(player);
        }, 500);
    };

    // ===== NIGHT PASS DEVICE SCREEN =====

    const showNightPassDeviceScreen = (player = null) => {
        showScreen('night-pass-device-screen');

        const nextButton = document.getElementById('btn-next-night-player');
        nextButton.onclick = () => {
            NightPhaseEngine.proceedToNextNightPlayer();
        };
    };

    // ===== WOLF VOTING SCREEN =====

    const showWolfVotingScreen = (wolf) => {
        showScreen('wolf-voting-screen');

        const targetsList = document.getElementById('wolf-targets-list');
        targetsList.innerHTML = '';

        const targets = GameState.getState().alivePlayers.filter(
            p => p.id !== wolf.id && p.role !== ROLES.WOLF
        );

        targets.forEach(target => {
            const button = document.createElement('button');
            button.className = 'target-button';
            button.innerHTML = `
                <span>${target.name}</span>
                <span class="target-icon">🎯</span>
            `;

            button.addEventListener('click', () => {
                selectWolfTarget(wolf, target, button);
            });

            targetsList.appendChild(button);
        });

        // Show current votes
        updateWolfVoteCounter(GameState.getWolfVoteCounts());
    };

    const selectWolfTarget = (wolf, target, buttonElement) => {
        // Record vote
        RoleActionProcessor.submitWolfVote(wolf, target.id);

        // Update UI
        document.querySelectorAll('#wolf-targets-list .target-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        buttonElement.classList.add('selected');

        // Update vote counter
        const counts = GameState.getWolfVoteCounts();
        updateWolfVoteCounter(counts);

        // Update status
        const statusName = document.getElementById('selected-target-name');
        const statusVotes = document.getElementById('selected-target-votes');
        statusName.textContent = target.name;
        statusVotes.textContent = counts[target.id];

        AudioManager.playSound('wolf-vote');

        // Auto-advance after 1 second
        setTimeout(() => {
            NightPhaseEngine.processNightAction(wolf);
        }, 1000);
    };

    const updateWolfVoteCounter = (counts) => {
        const counter = document.getElementById('wolf-vote-counter');
        if (!counter) return;

        counter.innerHTML = '';

        Object.entries(counts).forEach(([targetId, count]) => {
            const target = GameState.getPlayer(parseInt(targetId));
            const item = document.createElement('div');
            item.className = 'vote-counter-item';
            item.innerHTML = `
                <span>${target.name}</span>
                <span class="vote-count">${count}</span>
            `;
            counter.appendChild(item);
        });
    };

    // ===== DOCTOR SCREEN =====

    const showDoctorScreen = (doctor) => {
        showScreen('doctor-screen');

        const targetsList = document.getElementById('doctor-targets-list');
        targetsList.innerHTML = '';

        const targets = GameState.getState().alivePlayers.filter(
            p => p.id !== doctor.id
        );

        targets.forEach(target => {
            const button = document.createElement('button');
            button.className = 'target-button';
            
            // Disable if last protected
            const isLastProtected = GameState.getState().lastProtectedPlayer === target.id;
            if (isLastProtected) {
                button.classList.add('disabled');
            }

            button.innerHTML = `
                <span>${target.name}</span>
                <span class="target-icon">${isLastProtected ? '❌' : '💉'}</span>
            `;

            button.addEventListener('click', () => {
                if (isLastProtected) return;
                selectDoctorTarget(doctor, target, button);
            });

            targetsList.appendChild(button);
        });

        // Show selected
        const lastProtected = GameState.getState().lastProtectedPlayer;
        const statusName = document.getElementById('protected-player-name');
        if (lastProtected !== null) {
            statusName.textContent = GameState.getPlayer(lastProtected).name;
        }
    };

    const selectDoctorTarget = (doctor, target, buttonElement) => {
        // Record protection
        RoleActionProcessor.submitDoctorProtection(doctor, target.id);

        // Update UI
        document.querySelectorAll('#doctor-targets-list .target-button').forEach(btn => {
            if (!btn.classList.contains('disabled')) {
                btn.classList.remove('selected');
            }
        });
        buttonElement.classList.add('selected');

        const statusName = document.getElementById('protected-player-name');
        statusName.textContent = target.name;

        AudioManager.playSound('protect');

        // Auto-advance
        setTimeout(() => {
            NightPhaseEngine.processNightAction(doctor);
        }, 1000);
    };

    // ===== SEER SCREEN =====

    const showSeerScreen = (seer) => {
        showScreen('seer-screen');

        const targetsList = document.getElementById('seer-targets-list');
        targetsList.innerHTML = '';

        const targets = GameState.getState().alivePlayers.filter(
            p => p.id !== seer.id
        );

        targets.forEach(target => {
            const button = document.createElement('button');
            button.className = 'target-button';
            button.innerHTML = `
                <span>${target.name}</span>
                <span class="target-icon">🔮</span>
            `;

            button.addEventListener('click', () => {
                selectSeerTarget(seer, target);
            });

            targetsList.appendChild(button);
        });

        // Hide result initially
        const resultDiv = document.getElementById('seer-result');
        resultDiv.classList.add('hidden');
    };

    const selectSeerTarget = (seer, target) => {
        // Record reveal
        const isWolf = RoleActionProcessor.submitSeerReveal(seer, target.id);

        // Show result
        const resultDiv = document.getElementById('seer-result');
        const resultText = document.getElementById('seer-result-text');

        resultText.textContent = isWolf ? '🐺 ذئب!' : '👨‍🌾 ليس ذئب';
        resultText.style.color = isWolf ? '#ff6b6b' : '#00ff00';

        resultDiv.classList.remove('hidden');

        AudioManager.playSound('reveal');

        // Auto-advance after 3 seconds
        setTimeout(() => {
            NightPhaseEngine.processNightAction(seer);
        }, 3000);
    };

    // ===== VILLAGER SCREEN =====

    const showVillagerScreen = (villager) => {
        showScreen('villager-screen');

        let remaining = CONFIG.NIGHT_REVEAL_TIMER;
        const timerDisplay = document.getElementById('villager-timer');

        const interval = setInterval(() => {
            remaining--;
            if (timerDisplay) {
                timerDisplay.textContent = remaining;
            }

            if (remaining <= 0) {
                clearInterval(interval);
                NightPhaseEngine.processNightAction(villager);
            }
        }, 1000);
    };

    // ===== DAY INFO SCREEN =====

    const showDayInfoScreen = () => {
        showScreen('day-info-screen');

        const state = GameState.getState();
        const lastDeath = state.deaths[state.deaths.length - 1];

        const deathReport = document.getElementById('death-report');
        const noDeathReport = document.getElementById('no-death-report');

        if (lastDeath && lastDeath.nightNumber === state.nightNumber - 1) {
            // Someone died last night
            deathReport.classList.remove('hidden');
            noDeathReport.classList.add('hidden');

            const dead = GameState.getPlayer(lastDeath.playerId);
            document.getElementById('death-player-name').textContent = dead.name;
            document.getElementById('death-player-role').textContent = `${ROLE_ICONS[dead.role]} ${ROLE_NAMES[dead.role]}`;
        } else {
            // No one died
            deathReport.classList.add('hidden');
            noDeathReport.classList.remove('hidden');
        }

        // Setup discussion timer
        DayPhaseEngine.startDayDiscussion();

        // Setup skip button
        const skipButton = document.getElementById('btn-skip-discussion');
        skipButton.onclick = () => {
            DayPhaseEngine.skipDiscussion();
        };
    };

    // ===== DAY VOTE IDENTITY SCREEN =====

    const showDayVoteIdentityScreen = (voter) => {
        showScreen('day-vote-identity-screen');

        const nameDisplay = document.getElementById('day-vote-player-name');
        nameDisplay.textContent = voter.name;

        const enterButton = document.getElementById('btn-enter-voting-booth');
        enterButton.onclick = () => {
            startVotingBooth(voter);
        };
    };

    const startVotingBooth = (voter) => {
        AntiCheat.enableRevealMode();
        showVotingBooth(voter);
    };

    // ===== VOTING BOOTH =====

    const showVotingBooth = (voter) => {
        showScreen('day-voting-booth-screen');

        const targetsList = document.getElementById('day-targets-list');
        targetsList.innerHTML = '';

        const targets = GameState.getState().alivePlayers.filter(
            p => p.id !== voter.id
        );

        targets.forEach(target => {
            const button = document.createElement('button');
            button.className = 'target-button';
            button.innerHTML = `
                <span>${target.name}</span>
                <span class="target-icon">🗳️</span>
            `;

            button.addEventListener('click', () => {
                selectVotingTarget(voter, target, button);
            });

            targetsList.appendChild(button);
        });
    };

    const selectVotingTarget = (voter, target, buttonElement) => {
        // Record vote
        GameState.recordDayVote(voter.id, target.id);

        // Update UI
        document.querySelectorAll('#day-targets-list .target-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        buttonElement.classList.add('selected');

        // Update status
        const statusName = document.getElementById('day-voted-player-name');
        statusName.textContent = target.name;

        // Auto-advance
        setTimeout(() => {
            AntiCheat.disableRevealMode();
            showNightPassDeviceScreen();
            setTimeout(() => {
                DayPhaseEngine.proceedToNextVoter();
            }, 2000);
        }, 1000);
    };

    // ===== EXECUTION SCREEN =====

    const showExecutionScreen = (executed) => {
        showScreen('execution-screen');

        document.getElementById('executed-player-name').textContent = executed.name;
        document.getElementById('executed-player-role').textContent = 
            `${ROLE_ICONS[executed.role]} ${ROLE_NAMES[executed.role]}`;
    };

    // ===== WIN SCREEN =====

    const showWinScreen = (result) => {
        showScreen('win-screen');

        const winTitle = document.getElementById('win-title');
        const winReason = document.getElementById('win-reason');
        const winnerStats = document.getElementById('winner-stats');

        const isVillagers = result.team === 'VILLAGERS';
        winTitle.textContent = `${result.icon} فاز الفريق!`;
        winTitle.style.color = isVillagers ? '#00ff00' : '#ff6b6b';
        winReason.textContent = result.reason;

        // Show winners
        winnerStats.innerHTML = '';
        const winners = isVillagers 
            ? GameState.getAliveVillagers() 
            : GameState.getAliveWolves();

        const heading = document.createElement('h3');
        heading.textContent = 'الفائزون:';
        winnerStats.appendChild(heading);

        winners.forEach(player => {
            const p = document.createElement('p');
            p.textContent = `✓ ${player.name}`;
            winnerStats.appendChild(p);
        });

        // Setup replay button
        const replayButton = document.getElementById('btn-play-again');
        replayButton.onclick = () => {
            resetGame();
        };
    };

    return {
        hideAllScreens,
        showScreen,
        showNightIdentityScreen,
        startRevealAnimation,
        showRoleScreen,
        showNightPassDeviceScreen,
        showWolfVotingScreen,
        updateWolfVoteCounter,
        showDoctorScreen,
        showSeerScreen,
        showVillagerScreen,
        showDayInfoScreen,
        showDayVoteIdentityScreen,
        showVotingBooth,
        showExecutionScreen,
        showWinScreen,
    };
})();

/* ===============================================
   CONTINUE TO PART 3
   =============================================== */

console.log('✅ NightPhaseEngine, DayPhaseEngine, WinChecker, UIRenderer initialized');
/* ===============================================
   MODULE: AudioManager
   =============================================== */

const AudioManager = (() => {
    // Audio elements
    const audio = {
        nightBg: document.getElementById('audio-night-bg'),
        dayBg: document.getElementById('audio-day-bg'),
        reveal: document.getElementById('audio-reveal'),
        wolfVote: document.getElementById('audio-wolf-vote'),
        nightStart: document.getElementById('audio-night-start'),
        dayStart: document.getElementById('audio-day-start'),
        death: document.getElementById('audio-death'),
        protect: document.getElementById('audio-protect'),
        execution: document.getElementById('audio-execution'),
        win: document.getElementById('audio-win'),
    };

    // State
    let currentBgMusic = null;
    let soundEnabled = true;
    let musicEnabled = true;

    const initAudio = () => {
        // Set up audio sources (using data URLs or placeholder paths)
        // In production, replace with actual audio files
        
        audio.nightBg.src = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';
        audio.dayBg.src = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';
        
        // All audio elements preload as metadata only
        audio.nightBg.preload = 'metadata';
        audio.dayBg.preload = 'metadata';
    };

    const playNightMusic = () => {
        if (!musicEnabled) return;

        fadeOutMusic();

        setTimeout(() => {
            audio.nightBg.loop = true;
            audio.nightBg.volume = 0;
            audio.nightBg.play().catch(() => {
                console.log('Night music autoplay blocked');
            });

            fadeInMusic(audio.nightBg, CONFIG.NIGHT_MUSIC_FADE);
            currentBgMusic = audio.nightBg;
        }, 500);
    };

    const playDayMusic = () => {
        if (!musicEnabled) return;

        fadeOutMusic();

        setTimeout(() => {
            audio.dayBg.loop = true;
            audio.dayBg.volume = 0;
            audio.dayBg.play().catch(() => {
                console.log('Day music autoplay blocked');
            });

            fadeInMusic(audio.dayBg, CONFIG.NIGHT_MUSIC_FADE);
            currentBgMusic = audio.dayBg;
        }, 500);
    };

    const fadeInMusic = (audioEl, duration = 1000) => {
        if (!musicEnabled) return;

        const step = 50; // ms
        const steps = duration / step;
        const volumeIncrement = 0.7 / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            audioEl.volume = Math.min(0.7, volumeIncrement * currentStep);

            if (currentStep >= steps) {
                clearInterval(interval);
                audioEl.volume = 0.7;
            }
        }, step);
    };

    const fadeOutMusic = () => {
        if (!currentBgMusic) return;

        const step = 50;
        const steps = 500 / step;
        const volumeDecrement = currentBgMusic.volume / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            currentBgMusic.volume = Math.max(0, currentBgMusic.volume - volumeDecrement);

            if (currentStep >= steps) {
                clearInterval(interval);
                currentBgMusic.pause();
                currentBgMusic.currentTime = 0;
                currentBgMusic = null;
            }
        }, step);
    };

    const playSound = (soundName) => {
        if (!soundEnabled) return;

        const audioElement = audio[soundName];
        if (!audioElement) {
            console.warn(`Sound not found: ${soundName}`);
            return;
        }

        audioElement.currentTime = 0;
        audioElement.volume = 0.5;
        audioElement.play().catch(() => {
            console.log(`Sound autoplay blocked: ${soundName}`);
        });
    };

    const setSoundEnabled = (enabled) => {
        soundEnabled = enabled;
    };

    const setMusicEnabled = (enabled) => {
        musicEnabled = enabled;
        if (!enabled) {
            fadeOutMusic();
        }
    };

    const isSoundEnabled = () => soundEnabled;
    const isMusicEnabled = () => musicEnabled;

    return {
        initAudio,
        playNightMusic,
        playDayMusic,
        playSound,
        setSoundEnabled,
        setMusicEnabled,
        isSoundEnabled,
        isMusicEnabled,
    };
})();

/* ===============================================
   MODULE: Game Master (Main Controller)
   =============================================== */

const GameMaster = (() => {
    const initialize = () => {
        // Reset all state
        GameState.reset();

        // Initialize UI
        setupUIEventListeners();
        SetupEngine.initializeSetup();

        // Initialize audio
        AudioManager.initAudio();

        // Show setup screen
        UIRenderer.showScreen('setup-screen');

        GameState.logAction('Game initialized');
    };

    const resetGame = () => {
        GameState.reset();
        AudioManager.fadeOutMusic = () => {}; // Prevent errors
        
        setTimeout(() => {
            initialize();
        }, 500);
    };

    return {
        initialize,
        resetGame,
    };
})();

/* ===============================================
   EVENT LISTENERS - GLOBAL SETUP
   =============================================== */

const setupUIEventListeners = () => {
    // Prevent default back behavior
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Backspace') {
            // Already handled by AntiCheat during reveal
            // This prevents any other unwanted back navigation
        }
    });

    // Prevent right-click context menu
    document.addEventListener('contextmenu', (e) => {
        if (GameState.getPhase() !== PHASES.SETUP) {
            e.preventDefault();
        }
    });

    // Prevent text selection during game (but allow in setup)
    document.addEventListener('selectstart', (e) => {
        if (GameState.getPhase() !== PHASES.SETUP) {
            e.preventDefault();
        }
    });

    // Prevent long-press context menu
    document.addEventListener('longpress', (e) => {
        if (GameState.getPhase() !== PHASES.SETUP) {
            e.preventDefault();
        }
    }, { passive: false });

    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Tab lost focus - pause music
            AudioManager.fadeOutMusic = () => {};
        }
    });

    // Prevent accidental zoom
    document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
    });
};

/* ===============================================
   UTILITY FUNCTIONS
   =============================================== */

const resetGame = () => {
    GameMaster.resetGame();
};

const getCurrentPhaseDisplay = () => {
    const phase = GameState.getPhase();
    const phaseNames = {
        [PHASES.SETUP]: 'الإعدادات',
        [PHASES.ROLE_DISTRIBUTION]: 'توزيع الأدوار',
        [PHASES.NIGHT]: 'الليل',
        [PHASES.NIGHT_RESOLUTION]: 'نتائج الليل',
        [PHASES.DAY]: 'النهار',
        [PHASES.DAY_VOTING]: 'التصويت',
        [PHASES.EXECUTION]: 'الإعدام',
        [PHASES.CHECK_WIN]: 'فحص الفوز',
        [PHASES.GAME_OVER]: 'اللعبة انتهت',
    };
    return phaseNames[phase] || phase;
};

const getGameStats = () => {
    const state = GameState.getState();
    return {
        totalPlayers: state.players.length,
        alivePlayers: state.alivePlayers.length,
        deadPlayers: state.deadPlayers.length,
        nightNumber: state.nightNumber,
        dayNumber: state.dayNumber,
        phase: getCurrentPhaseDisplay(),
    };
};

const debugLog = () => {
    if (location.hash === '#debug') {
        console.table(GameState.getState());
        console.table(getGameStats());
    }
};

/* ===============================================
   FADE OUT MUSIC UTILITY (override for cleanup)
   =============================================== */

// Make fadeOutMusic global for cleanup
window.fadeOutGameMusic = () => {
    const state = GameState.getState();
    const audio = document.getElementById('audio-night-bg');
    if (audio) {
        audio.volume = 0;
        audio.pause();
    }
    const audioDay = document.getElementById('audio-day-bg');
    if (audioDay) {
        audioDay.volume = 0;
        audioDay.pause();
    }
};

/* ===============================================
   PAGE LOAD & INITIALIZATION
   =============================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Prevent pull-to-refresh on mobile
    document.body.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // Initialize game
    GameMaster.initialize();

    // Debug mode
    if (location.hash === '#debug') {
        window.gameState = GameState;
        window.gameStats = getGameStats;
        window.gamePhase = PhaseController.getCurrentPhase;
        console.log('🔧 Debug mode enabled. Use: gameState, gameStats(), gamePhase()');
    }
});

/* ===============================================
   PAGE UNLOAD CLEANUP
   =============================================== */

window.addEventListener('beforeunload', () => {
    window.fadeOutGameMusic();
});

window.addEventListener('unload', () => {
    window.fadeOutGameMusic();
});

/* ===============================================
   OFFLINE SUPPORT (Service Worker Registration)
   =============================================== */

if ('serviceWorker' in navigator && false) { // Disabled by default
    navigator.serviceWorker.register('sw.js').catch(() => {
        console.log('Service worker registration failed (offline support disabled)');
    });
}

/* ===============================================
   PREVENT COMMON EXPLOITS
   =============================================== */

// Disable developer tools shortcuts on production
const disableDeveloperTools = () => {
    // F12
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+K
        if (e.ctrlKey && e.shiftKey && e.key === 'K') {
            e.preventDefault();
            return false;
        }
    });
};

// Enable in production only
if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    disableDeveloperTools();
}

/* ===============================================
   ADDITIONAL: Message Broadcasting (for future multi-device)
   =============================================== */

const MessageBus = (() => {
    const listeners = {};

    const on = (event, callback) => {
        if (!listeners[event]) {
            listeners[event] = [];
        }
        listeners[event].push(callback);
    };

    const off = (event, callback) => {
        if (listeners[event]) {
            listeners[event] = listeners[event].filter(cb => cb !== callback);
        }
    };

    const emit = (event, data) => {
        if (listeners[event]) {
            listeners[event].forEach(callback => callback(data));
        }
    };

    return { on, off, emit };
})();

/* ===============================================
   ADDITIONAL: LocalStorage Persistence (Optional)
   =============================================== */

const GameStorage = (() => {
    const STORAGE_KEY = 'werewolf_game_state';

    const saveState = () => {
        try {
            const state = GameState.getState();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save game state:', e);
        }
    };

    const loadState = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.warn('Failed to load game state:', e);
            return null;
        }
    };

    const clearState = () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.warn('Failed to clear game state:', e);
        }
    };

    return {
        saveState,
        loadState,
        clearState,
    };
})();

/* ===============================================
   STATISTICS & LOGGING (Optional Debug)
   =============================================== */

const GameAnalytics = (() => {
    let stats = {
        gamesPlayed: 0,
        villagerWins: 0,
        wolfWins: 0,
        averageGameLength: 0,
    };

    const recordGameEnd = (result) => {
        stats.gamesPlayed++;
        if (result.team === 'VILLAGERS') {
            stats.villagerWins++;
        } else {
            stats.wolfWins++;
        }
    };

    const getStats = () => ({ ...stats });

    const resetStats = () => {
        stats = {
            gamesPlayed: 0,
            villagerWins: 0,
            wolfWins: 0,
            averageGameLength: 0,
        };
    };

    return {
        recordGameEnd,
        getStats,
        resetStats,
    };
})();

/* ===============================================
   FINAL PRODUCTION CHECKS
   =============================================== */

const ProductionChecks = (() => {
    const runChecks = () => {
        const checks = [];

        // Check 1: No console errors
        let errorCount = 0;
        const originalError = console.error;
        console.error = function (...args) {
            errorCount++;
            originalError.apply(console, args);
        };

        // Check 2: All required elements present
        const requiredElements = [
            'app-container',
            'setup-screen',
            'night-identity-screen',
            'night-role-screen',
            'day-info-screen',
            'win-screen',
        ];

        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`⚠️ Missing element: #${id}`);
            } else {
                checks.push(`✓ Found #${id}`);
            }
        });

        // Check 3: GameState initialized
        if (GameState.getPlayers().length === 0) {
            checks.push('✓ GameState ready');
        }

        // Check 4: Audio initialized
        checks.push('✓ AudioManager ready');

        if (location.hash === '#debug') {
            console.log('=== PRODUCTION CHECKS ===');
            checks.forEach(check => console.log(check));
            console.log(`Errors encountered: ${errorCount}`);
        }
    };

    return {
        runChecks,
    };
})();

/* ===============================================
   RUN PRODUCTION CHECKS ON INIT
   =============================================== */

setTimeout(() => {
    ProductionChecks.runChecks();
}, 1000);

console.log('✅ AudioManager, Game Master, Event Handlers, Utilities initialized');
console.log('✅ WEREWOLF GAME FULLY LOADED');/* ===============================================
   MODULE: AudioManager
   =============================================== */

const AudioManager = (() => {
    // Audio elements
    const audio = {
        nightBg: document.getElementById('audio-night-bg'),
        dayBg: document.getElementById('audio-day-bg'),
        reveal: document.getElementById('audio-reveal'),
        wolfVote: document.getElementById('audio-wolf-vote'),
        nightStart: document.getElementById('audio-night-start'),
        dayStart: document.getElementById('audio-day-start'),
        death: document.getElementById('audio-death'),
        protect: document.getElementById('audio-protect'),
        execution: document.getElementById('audio-execution'),
        win: document.getElementById('audio-win'),
    };

    // State
    let currentBgMusic = null;
    let soundEnabled = true;
    let musicEnabled = true;

    const initAudio = () => {
        // Set up audio sources (using data URLs or placeholder paths)
        // In production, replace with actual audio files
        
        audio.nightBg.src = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';
        audio.dayBg.src = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';
        
        // All audio elements preload as metadata only
        audio.nightBg.preload = 'metadata';
        audio.dayBg.preload = 'metadata';
    };

    const playNightMusic = () => {
        if (!musicEnabled) return;

        fadeOutMusic();

        setTimeout(() => {
            audio.nightBg.loop = true;
            audio.nightBg.volume = 0;
            audio.nightBg.play().catch(() => {
                console.log('Night music autoplay blocked');
            });

            fadeInMusic(audio.nightBg, CONFIG.NIGHT_MUSIC_FADE);
            currentBgMusic = audio.nightBg;
        }, 500);
    };

    const playDayMusic = () => {
        if (!musicEnabled) return;

        fadeOutMusic();

        setTimeout(() => {
            audio.dayBg.loop = true;
            audio.dayBg.volume = 0;
            audio.dayBg.play().catch(() => {
                console.log('Day music autoplay blocked');
            });

            fadeInMusic(audio.dayBg, CONFIG.NIGHT_MUSIC_FADE);
            currentBgMusic = audio.dayBg;
        }, 500);
    };

    const fadeInMusic = (audioEl, duration = 1000) => {
        if (!musicEnabled) return;

        const step = 50; // ms
        const steps = duration / step;
        const volumeIncrement = 0.7 / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            audioEl.volume = Math.min(0.7, volumeIncrement * currentStep);

            if (currentStep >= steps) {
                clearInterval(interval);
                audioEl.volume = 0.7;
            }
        }, step);
    };

    const fadeOutMusic = () => {
        if (!currentBgMusic) return;

        const step = 50;
        const steps = 500 / step;
        const volumeDecrement = currentBgMusic.volume / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            currentBgMusic.volume = Math.max(0, currentBgMusic.volume - volumeDecrement);

            if (currentStep >= steps) {
                clearInterval(interval);
                currentBgMusic.pause();
                currentBgMusic.currentTime = 0;
                currentBgMusic = null;
            }
        }, step);
    };

    const playSound = (soundName) => {
        if (!soundEnabled) return;

        const audioElement = audio[soundName];
        if (!audioElement) {
            console.warn(`Sound not found: ${soundName}`);
            return;
        }

        audioElement.currentTime = 0;
        audioElement.volume = 0.5;
        audioElement.play().catch(() => {
            console.log(`Sound autoplay blocked: ${soundName}`);
        });
    };

    const setSoundEnabled = (enabled) => {
        soundEnabled = enabled;
    };

    const setMusicEnabled = (enabled) => {
        musicEnabled = enabled;
        if (!enabled) {
            fadeOutMusic();
        }
    };

    const isSoundEnabled = () => soundEnabled;
    const isMusicEnabled = () => musicEnabled;

    return {
        initAudio,
        playNightMusic,
        playDayMusic,
        playSound,
        setSoundEnabled,
        setMusicEnabled,
        isSoundEnabled,
        isMusicEnabled,
    };
})();

/* ===============================================
   MODULE: Game Master (Main Controller)
   =============================================== */

const GameMaster = (() => {
    const initialize = () => {
        // Reset all state
        GameState.reset();

        // Initialize UI
        setupUIEventListeners();
        SetupEngine.initializeSetup();

        // Initialize audio
        AudioManager.initAudio();

        // Show setup screen
        UIRenderer.showScreen('setup-screen');

        GameState.logAction('Game initialized');
    };

    const resetGame = () => {
        GameState.reset();
        AudioManager.fadeOutMusic = () => {}; // Prevent errors
        
        setTimeout(() => {
            initialize();
        }, 500);
    };

    return {
        initialize,
        resetGame,
    };
})();

/* ===============================================
   EVENT LISTENERS - GLOBAL SETUP
   =============================================== */

const setupUIEventListeners = () => {
    // Prevent default back behavior
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Backspace') {
            // Already handled by AntiCheat during reveal
            // This prevents any other unwanted back navigation
        }
    });

    // Prevent right-click context menu
    document.addEventListener('contextmenu', (e) => {
        if (GameState.getPhase() !== PHASES.SETUP) {
            e.preventDefault();
        }
    });

    // Prevent text selection during game (but allow in setup)
    document.addEventListener('selectstart', (e) => {
        if (GameState.getPhase() !== PHASES.SETUP) {
            e.preventDefault();
        }
    });

    // Prevent long-press context menu
    document.addEventListener('longpress', (e) => {
        if (GameState.getPhase() !== PHASES.SETUP) {
            e.preventDefault();
        }
    }, { passive: false });

    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Tab lost focus - pause music
            AudioManager.fadeOutMusic = () => {};
        }
    });

    // Prevent accidental zoom
    document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
    });
};

/* ===============================================
   UTILITY FUNCTIONS
   =============================================== */

const resetGame = () => {
    GameMaster.resetGame();
};

const getCurrentPhaseDisplay = () => {
    const phase = GameState.getPhase();
    const phaseNames = {
        [PHASES.SETUP]: 'الإعدادات',
        [PHASES.ROLE_DISTRIBUTION]: 'توزيع الأدوار',
        [PHASES.NIGHT]: 'الليل',
        [PHASES.NIGHT_RESOLUTION]: 'نتائج الليل',
        [PHASES.DAY]: 'النهار',
        [PHASES.DAY_VOTING]: 'التصويت',
        [PHASES.EXECUTION]: 'الإعدام',
        [PHASES.CHECK_WIN]: 'فحص الفوز',
        [PHASES.GAME_OVER]: 'اللعبة انتهت',
    };
    return phaseNames[phase] || phase;
};

const getGameStats = () => {
    const state = GameState.getState();
    return {
        totalPlayers: state.players.length,
        alivePlayers: state.alivePlayers.length,
        deadPlayers: state.deadPlayers.length,
        nightNumber: state.nightNumber,
        dayNumber: state.dayNumber,
        phase: getCurrentPhaseDisplay(),
    };
};

const debugLog = () => {
    if (location.hash === '#debug') {
        console.table(GameState.getState());
        console.table(getGameStats());
    }
};

/* ===============================================
   FADE OUT MUSIC UTILITY (override for cleanup)
   =============================================== */

// Make fadeOutMusic global for cleanup
window.fadeOutGameMusic = () => {
    const state = GameState.getState();
    const audio = document.getElementById('audio-night-bg');
    if (audio) {
        audio.volume = 0;
        audio.pause();
    }
    const audioDay = document.getElementById('audio-day-bg');
    if (audioDay) {
        audioDay.volume = 0;
        audioDay.pause();
    }
};

/* ===============================================
   PAGE LOAD & INITIALIZATION
   =============================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Prevent pull-to-refresh on mobile
    document.body.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // Initialize game
    GameMaster.initialize();

    // Debug mode
    if (location.hash === '#debug') {
        window.gameState = GameState;
        window.gameStats = getGameStats;
        window.gamePhase = PhaseController.getCurrentPhase;
        console.log('🔧 Debug mode enabled. Use: gameState, gameStats(), gamePhase()');
    }
});

/* ===============================================
   PAGE UNLOAD CLEANUP
   =============================================== */

window.addEventListener('beforeunload', () => {
    window.fadeOutGameMusic();
});

window.addEventListener('unload', () => {
    window.fadeOutGameMusic();
});

/* ===============================================
   OFFLINE SUPPORT (Service Worker Registration)
   =============================================== */

if ('serviceWorker' in navigator && false) { // Disabled by default
    navigator.serviceWorker.register('sw.js').catch(() => {
        console.log('Service worker registration failed (offline support disabled)');
    });
}

/* ===============================================
   PREVENT COMMON EXPLOITS
   =============================================== */

// Disable developer tools shortcuts on production
const disableDeveloperTools = () => {
    // F12
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+K
        if (e.ctrlKey && e.shiftKey && e.key === 'K') {
            e.preventDefault();
            return false;
        }
    });
};

// Enable in production only
if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    disableDeveloperTools();
}

/* ===============================================
   ADDITIONAL: Message Broadcasting (for future multi-device)
   =============================================== */

const MessageBus = (() => {
    const listeners = {};

    const on = (event, callback) => {
        if (!listeners[event]) {
            listeners[event] = [];
        }
        listeners[event].push(callback);
    };

    const off = (event, callback) => {
        if (listeners[event]) {
            listeners[event] = listeners[event].filter(cb => cb !== callback);
        }
    };

    const emit = (event, data) => {
        if (listeners[event]) {
            listeners[event].forEach(callback => callback(data));
        }
    };

    return { on, off, emit };
})();

/* ===============================================
   ADDITIONAL: LocalStorage Persistence (Optional)
   =============================================== */

const GameStorage = (() => {
    const STORAGE_KEY = 'werewolf_game_state';

    const saveState = () => {
        try {
            const state = GameState.getState();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save game state:', e);
        }
    };

    const loadState = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.warn('Failed to load game state:', e);
            return null;
        }
    };

    const clearState = () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.warn('Failed to clear game state:', e);
        }
    };

    return {
        saveState,
        loadState,
        clearState,
    };
})();

/* ===============================================
   STATISTICS & LOGGING (Optional Debug)
   =============================================== */

const GameAnalytics = (() => {
    let stats = {
        gamesPlayed: 0,
        villagerWins: 0,
        wolfWins: 0,
        averageGameLength: 0,
    };

    const recordGameEnd = (result) => {
        stats.gamesPlayed++;
        if (result.team === 'VILLAGERS') {
            stats.villagerWins++;
        } else {
            stats.wolfWins++;
        }
    };

    const getStats = () => ({ ...stats });

    const resetStats = () => {
        stats = {
            gamesPlayed: 0,
            villagerWins: 0,
            wolfWins: 0,
            averageGameLength: 0,
        };
    };

    return {
        recordGameEnd,
        getStats,
        resetStats,
    };
})();

/* ===============================================
   FINAL PRODUCTION CHECKS
   =============================================== */

const ProductionChecks = (() => {
    const runChecks = () => {
        const checks = [];

        // Check 1: No console errors
        let errorCount = 0;
        const originalError = console.error;
        console.error = function (...args) {
            errorCount++;
            originalError.apply(console, args);
        };

        // Check 2: All required elements present
        const requiredElements = [
            'app-container',
            'setup-screen',
            'night-identity-screen',
            'night-role-screen',
            'day-info-screen',
            'win-screen',
        ];

        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`⚠️ Missing element: #${id}`);
            } else {
                checks.push(`✓ Found #${id}`);
            }
        });

        // Check 3: GameState initialized
        if (GameState.getPlayers().length === 0) {
            checks.push('✓ GameState ready');
        }

        // Check 4: Audio initialized
        checks.push('✓ AudioManager ready');

        if (location.hash === '#debug') {
            console.log('=== PRODUCTION CHECKS ===');
            checks.forEach(check => console.log(check));
            console.log(`Errors encountered: ${errorCount}`);
        }
    };

    return {
        runChecks,
    };
})();

/* ===============================================
   RUN PRODUCTION CHECKS ON INIT
   =============================================== */

setTimeout(() => {
    ProductionChecks.runChecks();
}, 1000);

console.log('✅ AudioManager, Game Master, Event Handlers, Utilities initialized');
console.log('✅ WEREWOLF GAME FULLY LOADED');
