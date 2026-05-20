/* ===============================================
   WEREWOLF GAME - VANILLA JAVASCRIPT
   Production-Level Implementation - FIXED
   =============================================== */

/* ===============================================
   CONFIGURATION
   =============================================== */

const CONFIG = {
    NIGHT_REVEAL_TIMER: 10,
    NIGHT_REVEAL_RANDOM_DELAY: 2000,
    DAY_DISCUSSION_TIMER: 180,
    NIGHT_MUSIC_FADE: 1000,
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
        players: [],
        settings: {
            soundEnabled: true,
            musicEnabled: true,
        },
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

    const getState = () => ({ ...state });
    const getPhase = () => state.phase;
    const getPlayers = () => state.players;
    const getAliveCount = () => state.alivePlayers.length;
    const getPlayer = (playerId) => state.players[playerId];
    const getAliveWolves = () => state.alivePlayers.filter(p => p.role === ROLES.WOLF);
    const getAliveVillagers = () => state.alivePlayers.filter(p => p.role !== ROLES.WOLF);

    const setPhase = (newPhase) => {
        state.phase = newPhase;
        logAction(`Phase: ${newPhase}`);
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
        state.alivePlayers = state.players.filter(p => p.alive);
        state.deadPlayers = state.players.filter(p => !p.alive);
        return true;
    };

    const recordWolfVote = (voterId, targetId) => {
        if (!state.players[voterId] || !state.players[targetId]) return false;
        state.nightActions.wolfVotes[voterId] = targetId;
        logAction(`Wolf ${voterId} voted for ${targetId}`);
        return true;
    };

    const recordDoctorProtection = (playerId, targetId) => {
        if (!state.players[targetId]) return false;
        if (state.lastProtectedPlayer === targetId) {
            logAction(`Doctor tried same target (blocked)`);
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
        state.nightActions.seerReveal = { targetId: targetId, isWolf: isWolf };
        state.nightActions.seerRevealed = true;
        logAction(`Seer revealed ${targetId}`);
        return true;
    };

    const getSeerRevealResult = () => {
        if (!state.nightActions.seerRevealed) return null;
        return state.nightActions.seerReveal.isWolf;
    };

    const getAttackTarget = () => {
        const votes = state.nightActions.wolfVotes;
        const voteCount = {};
        Object.values(votes).forEach(targetId => {
            voteCount[targetId] = (voteCount[targetId] || 0) + 1;
        });
        if (Object.keys(voteCount).length === 0) return null;
        const maxVotes = Math.max(...Object.values(voteCount));
        const topTargets = Object.keys(voteCount)
            .filter(id => voteCount[id] === maxVotes)
            .map(id => parseInt(id));
        return topTargets[Math.floor(Math.random() * topTargets.length)];
    };

    const getWolfVoteCounts = () => {
        const votes = state.nightActions.wolfVotes;
        const counts = {};
        state.alivePlayers.forEach(p => {
            if (p.role !== ROLES.WOLF) counts[p.id] = 0;
        });
        Object.values(votes).forEach(targetId => {
            if (counts.hasOwnProperty(targetId)) counts[targetId]++;
        });
        return counts;
    };

    const recordDayVote = (voterId, targetId) => {
        if (!state.players[voterId] || !state.players[targetId]) return false;
        state.dayVotes[voterId] = targetId;
        logAction(`Player ${voterId} voted for ${targetId}`);
        return true;
    };

    const getExecutionTarget = () => {
        const votes = state.dayVotes;
        const voteCount = {};
        Object.values(votes).forEach(targetId => {
            voteCount[targetId] = (voteCount[targetId] || 0) + 1;
        });
        if (Object.keys(voteCount).length === 0) return null;
        const maxVotes = Math.max(...Object.values(voteCount));
        const topTargets = Object.keys(voteCount)
            .filter(id => voteCount[id] === maxVotes)
            .map(id => parseInt(id));
        return topTargets[Math.floor(Math.random() * topTargets.length)];
    };

    const resolveNightAttack = () => {
        const attackedId = getAttackTarget();
        if (attackedId === null || attackedId === undefined) return null;
        const protectedId = state.nightActions.protectedPlayer;
        const attacked = state.players[attackedId];
        if (attackedId === protectedId) {
            logAction(`Player ${attackedId} was protected!`);
            return null;
        }
        setAlive(attackedId, false);
        state.deaths.push({
            playerId: attackedId,
            nightNumber: state.nightNumber,
            role: attacked.role,
        });
        logAction(`Player ${attackedId} killed!`);
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

    const getShuffledAlivePlayers = () => {
        return [...state.alivePlayers].sort(() => Math.random() - 0.5);
    };

    const logAction = (message) => {
        const timestamp = new Date().toLocaleTimeString('ar-SA');
        state.logs.push(`[${timestamp}] ${message}`);
        console.log(message);
    };

    const getLogs = () => [...state.logs];

    const setWinner = (team, reason) => {
        state.winnerTeam = team;
        state.winReason = reason;
    };

    const getWinner = () => ({
        team: state.winnerTeam,
        reason: state.winReason,
    });

    const reset = () => {
        state = {
            players: [],
            settings: { soundEnabled: true, musicEnabled: true },
            phase: PHASES.SETUP,
            nightNumber: 0,
            dayNumber: 0,
            alivePlayers: [],
            deadPlayers: [],
            nightActions: { wolfVotes: {}, protectedPlayer: null, seerReveal: null, seerRevealed: false },
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
        getState, getPhase, getPlayers, getAliveCount, getPlayer, getAliveWolves, getAliveVillagers,
        setPhase, addPlayer, assignRole, setAlive, recordWolfVote, recordDoctorProtection,
        recordSeerReveal, getSeerRevealResult, getAttackTarget, getWolfVoteCounts, recordDayVote,
        getExecutionTarget, resolveNightAttack, clearNightActions, clearDayVotes, incrementNight,
        incrementDay, getShuffledAlivePlayers, logAction, getLogs, setWinner, getWinner, reset,
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
        if (!validTransitions[current] || !validTransitions[current].includes(nextPhase)) {
            console.error(`Invalid: ${current} → ${nextPhase}`);
            return false;
        }
        GameState.setPhase(nextPhase);
        return true;
    };

    const getCurrentPhase = () => GameState.getPhase();

    return { transitionTo, getCurrentPhase, PHASES };
})();

/* ===============================================
   MODULE: RoleDistributor
   =============================================== */

const RoleDistributor = (() => {
    const distributeRoles = (playerCount, distribution) => {
        const players = GameState.getPlayers();
        if (players.length === 0) return false;

        const rolePool = [];
        Object.entries(distribution).forEach(([role, count]) => {
            if (role !== ROLES.VILLAGER) {
                for (let i = 0; i < count; i++) rolePool.push(role);
            }
        });

        const remaining = playerCount - rolePool.length;
        for (let i = 0; i < remaining; i++) rolePool.push(ROLES.VILLAGER);

        rolePool.sort(() => Math.random() - 0.5);
        players.forEach((player, index) => {
            GameState.assignRole(player.id, rolePool[index]);
        });

        GameState.logAction(`Roles: ${distribution.wolf}W, ${distribution.doctor}D, ${distribution.seer}S, ${remaining}V`);
        return true;
    };

    return { distributeRoles };
})();

/* ===============================================
   MODULE: AntiCheat System
   =============================================== */

const AntiCheat = (() => {
    let isRevealActive = false;

    const enableRevealMode = () => {
        isRevealActive = true;
    };

    const disableRevealMode = () => {
        isRevealActive = false;
    };

    const debounce = (func, delay) => {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    return { enableRevealMode, disableRevealMode, debounce };
})();

/* ===============================================
   MODULE: Setup Engine
   =============================================== */

const SetupEngine = (() => {
    let roleCounts = { wolf: 2, doctor: 1, seer: 1, villager: 0 };

    const initializeSetup = () => {
        const playerCountInput = document.getElementById('player-count');
        const btnDecreaseBtn = document.getElementById('btn-decrease-players');
        const btnIncreaseBtn = document.getElementById('btn-increase-players');
        const roleDistributionDiv = document.getElementById('role-distribution');
        const btnStartGame = document.getElementById('btn-start-game');

        btnDecreaseBtn.addEventListener('click', () => {
            const count = Math.max(4, parseInt(playerCountInput.value) - 1);
            playerCountInput.value = count;
            updatePlayerNameInputs(count);
            renderRoleDistribution(roleDistributionDiv, count);
        });

        btnIncreaseBtn.addEventListener('click', () => {
            const count = Math.min(20, parseInt(playerCountInput.value) + 1);
            playerCountInput.value = count;
            updatePlayerNameInputs(count);
            renderRoleDistribution(roleDistributionDiv, count);
        });

        renderRoleDistribution(roleDistributionDiv, parseInt(playerCountInput.value));
        updatePlayerNameInputs(parseInt(playerCountInput.value));

        btnStartGame.addEventListener('click', () => {
            startGame();
        });
    };

    const renderRoleDistribution = (container, playerCount) => {
        playerCount = parseInt(playerCount);
        let suggested = {
            wolf: Math.ceil(playerCount / 4),
            doctor: Math.ceil(playerCount / 6),
            seer: 1,
            villager: 0,
        };

        const totalNonVillagers = suggested.wolf + suggested.doctor + suggested.seer;
        if (totalNonVillagers > playerCount - 1) {
            suggested.villager = 0;
        } else {
            suggested.villager = playerCount - totalNonVillagers;
        }

        roleCounts = suggested;
        container.innerHTML = '';

        Object.entries(suggested).forEach(([role, count]) => {
            if (role === ROLES.VILLAGER) return;

            const control = document.createElement('div');
            control.className = 'role-control';
            control.innerHTML = `
                <span class="role-control-label">${ROLE_ICONS[role]} ${ROLE_NAMES[role]}</span>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-count-control" data-role="${role}" data-action="dec">−</button>
                    <input type="number" class="role-control-input" data-role="${role}" min="0" max="${playerCount - 1}" value="${count}" readonly>
                    <button class="btn-count-control" data-role="${role}" data-action="inc">+</button>
                </div>
            `;

            control.querySelectorAll('.btn-count-control').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const role = e.target.dataset.role;
                    const action = e.target.dataset.action;
                    const input = control.querySelector(`[data-role="${role}"]`);
                    let val = parseInt(input.value);
                    val = action === 'inc' ? Math.min(playerCount - 1, val + 1) : Math.max(0, val - 1);
                    roleCounts[role] = val;
                    input.value = val;
                    updateVillagerCount(playerCount);
                });
            });

            container.appendChild(control);
        });

        const villagerDiv = document.createElement('div');
        villagerDiv.className = 'role-control';
        villagerDiv.style.opacity = '0.7';
        villagerDiv.style.pointerEvents = 'none';
        villagerDiv.innerHTML = `
            <span class="role-control-label">${ROLE_ICONS.villager} ${ROLE_NAMES.villager} (تلقائي)</span>
            <input type="number" class="role-control-input" id="villager-count" value="${suggested.villager}" readonly>
        `;
        container.appendChild(villagerDiv);
        updateVillagerCount(playerCount);
    };

    const updateVillagerCount = (playerCount) => {
        const totalNonVillagers = roleCounts.wolf + roleCounts.doctor + roleCounts.seer;
        roleCounts.villager = Math.max(0, playerCount - totalNonVillagers);
        const villagerInput = document.getElementById('villager-count');
        if (villagerInput) villagerInput.value = roleCounts.villager;
    };

    const updatePlayerNameInputs = (count) => {
        const container = document.getElementById('player-names-list');
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const group = document.createElement('div');
            group.className = 'player-name-input-group';
            const label = document.createElement('label');
            label.textContent = `اللاعب ${i + 1}`;
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
        const inputs = document.querySelectorAll('.player-name-input');
        const names = Array.from(inputs)
            .map(input => input.value.trim())
            .filter(name => name.length > 0);

        if (names.length < 4) {
            alert('أدخل أسماء جميع اللاعبين');
            return;
        }

        names.forEach(name => GameState.addPlayer(name));
        RoleDistributor.distributeRoles(names.length, roleCounts);
        GameState.getPlayers().forEach(player => GameState.setAlive(player.id, true));

        const soundEnabled = document.getElementById('setting-sounds').checked;
        const musicEnabled = document.getElementById('setting-music').checked;
        CONFIG.AUDIO_ENABLED = soundEnabled;
        CONFIG.MUSIC_ENABLED = musicEnabled;

        PhaseController.transitionTo(PHASES.ROLE_DISTRIBUTION);
        UIRenderer.hideAllScreens();
        UIRenderer.showScreen('role-distribution-screen');

        setTimeout(() => {
            startFirstNight();
        }, 2000);
    };

    return { initializeSetup };
})();

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
        shuffledPlayers = GameState.getShuffledAlivePlayers();
        currentPlayerIndex = 0;
        PhaseController.transitionTo(PHASES.NIGHT);
        AudioManager.playNightMusic();
        GameState.logAction(`Night ${GameState.getState().nightNumber} started`);
        showNextNightPlayer();
    };

    const showNextNightPlayer = () => {
        if (currentPlayerIndex >= shuffledPlayers.length) {
            resolveNight();
            return;
        }
        const player = shuffledPlayers[currentPlayerIndex];
        UIRenderer.hideAllScreens();
        UIRenderer.showNightIdentityScreen(player);
    };

    const processNightAction = (player) => {
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

        const deathId = GameState.resolveNightAttack();
        let resultText = deathId !== null && deathId !== undefined
            ? `⚰️ لقد مات: ${GameState.getPlayer(deathId).name}`
            : `✨ لا أحد مات هذه الليلة!`;

        const resolutionText = document.getElementById('resolution-text');
        if (resolutionText) resolutionText.textContent = resultText;

        GameState.logAction(`Night ${GameState.getState().nightNumber} resolved`);

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

    return { startNight, showNextNightPlayer, processNightAction, proceedToNextNightPlayer, resolveNight, startDay };
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
        if (timerDisplay) timerDisplay.textContent = discussionTimeRemaining;
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
        shuffledVoters = GameState.getShuffledAlivePlayers();
        currentVoterIndex = 0;
        GameState.logAction('Day voting started');
        showNextDayVoter();
    };

    const showNextDayVoter = () => {
        if (currentVoterIndex >= shuffledVoters.length) {
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
        UIRenderer.hideAllScreens();
        UIRenderer.showExecutionScreen(executed);

        GameState.logAction(`Day ${GameState.getState().dayNumber}: ${executed.name} executed`);

        setTimeout(() => {
            checkWinCondition();
        }, 3000);
    };

    const checkWinCondition = () => {
        PhaseController.transitionTo(PHASES.CHECK_WIN);
        const result = WinChecker.checkWin();

        if (result) {
            GameState.setWinner(result.team, result.reason);
            PhaseController.transitionTo(PHASES.GAME_OVER);
            UIRenderer.showWinScreen(result);
            AudioManager.playSound('win');
        } else {
            GameState.incrementDay();
            PhaseController.transitionTo(PHASES.NIGHT);
            setTimeout(() => {
                NightPhaseEngine.startNight();
            }, 2000);
        }
    };

    return { startDayDiscussion, skipDiscussion, proceedToVoting, showNextDayVoter, processDayVote, proceedToNextVoter, checkWinCondition };
})();

/* ===============================================
   MODULE: WinChecker
   =============================================== */

const WinChecker = (() => {
    const checkWin = () => {
        const alivePlayers = GameState.getState().alivePlayers;
        const wolves = alivePlayers.filter(p => p.role === ROLES.WOLF);
        const villagers = alivePlayers.filter(p => p.role !== ROLES.WOLF);

        if (wolves.length === 0) {
            return { team: 'VILLAGERS', reason: 'تم القضاء على جميع الذئاب!', icon: '👨‍🌾' };
        }

        if (wolves.length >= villagers.length) {
            return { team: 'WOLVES', reason: 'سيطر الذئاب على القرية!', icon: '🐺' };
        }

        return null;
    };

    return { checkWin };
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
        }
    };

    const submitWolfVote = (voter, targetId) => {
        if (!GameState.recordWolfVote(voter.id, targetId)) return false;
        const counts = GameState.getWolfVoteCounts();
        UIRenderer.updateWolfVoteCounter(counts);
        return true;
    };

    const submitDoctorProtection = (doctor, targetId) => {
        return GameState.recordDoctorProtection(doctor.id, targetId);
    };

    const submitSeerReveal = (seer, targetId) => {
        if (!GameState.recordSeerReveal(seer.id, targetId)) return false;
        return GameState.getSeerRevealResult();
    };

    return { processRoleAction, submitWolfVote, submitDoctorProtection, submitSeerReveal };
})();

/* ===============================================
   HELPER: SVG Progress Update
   =============================================== */

const updateSVGProgress = (circleId, progress) => {
    const circle = document.getElementById(circleId);
    if (!circle) return;
    const circumference = 283;
    const offset = circumference - progress * circumference;
    circle.style.strokeDashoffset = offset;
};

/* ===============================================
   MODULE: AudioManager
   =============================================== */

const AudioManager = (() => {
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

    let currentBgMusic = null;
    let soundEnabled = true;
    let musicEnabled = true;

    const initAudio = () => {
        // Silent placeholder audio
        const silentWav = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';
        audio.nightBg.src = silentWav;
        audio.dayBg.src = silentWav;
    };

    const playNightMusic = () => {
        if (!musicEnabled) return;
        fadeOutMusic();
        setTimeout(() => {
            if (audio.nightBg) {
                audio.nightBg.loop = true;
                audio.nightBg.volume = 0.7;
                audio.nightBg.play().catch(() => {});
                currentBgMusic = audio.nightBg;
            }
        }, 500);
    };

    const playDayMusic = () => {
        if (!musicEnabled) return;
        fadeOutMusic();
        setTimeout(() => {
            if (audio.dayBg) {
                audio.dayBg.loop = true;
                audio.dayBg.volume = 0.7;
                audio.dayBg.play().catch(() => {});
                currentBgMusic = audio.dayBg;
            }
        }, 500);
    };

    const fadeOutMusic = () => {
        if (currentBgMusic) {
            currentBgMusic.volume = 0;
            currentBgMusic.pause();
            currentBgMusic = null;
        }
    };

    const playSound = (soundName) => {
        if (!soundEnabled) return;
        const audioElement = audio[soundName];
        if (!audioElement) return;
        audioElement.currentTime = 0;
        audioElement.volume = 0.5;
        audioElement.play().catch(() => {});
    };

    const setSoundEnabled = (enabled) => { soundEnabled = enabled; };
    const setMusicEnabled = (enabled) => { musicEnabled = enabled; if (!enabled) fadeOutMusic(); };
    const isSoundEnabled = () => soundEnabled;
    const isMusicEnabled = () => musicEnabled;

    return { initAudio, playNightMusic, playDayMusic, playSound, setSoundEnabled, setMusicEnabled, isSoundEnabled, isMusicEnabled };
})();

/* ===============================================
   MODULE: UIRenderer (Comprehensive)
   =============================================== */

const UIRenderer = (() => {
    const hideAllScreens = () => {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('screen-active');
        });
    };

    const showScreen = (screenId) => {
        hideAllScreens();
        const screen = document.getElementById(screenId);
        if (screen) screen.classList.add('screen-active');
    };

    const showNightIdentityScreen = (player) => {
        showScreen('night-identity-screen');
        const nameDisplay = document.getElementById('night-player-name');
        nameDisplay.textContent = player.name;
        const revealButton = document.getElementById('btn-reveal-role');
        revealButton.onclick = () => startRevealAnimation(player);
    };

    const startRevealAnimation = (player) => {
        AntiCheat.enableRevealMode();
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
        const badge = document.createElement('div');
        badge.className = 'role-badge';
        badge.innerHTML = `${ROLE_ICONS[player.role]}<br>${ROLE_NAMES[player.role]}`;
        roleContent.appendChild(badge);
        const desc = document.createElement('p');
        desc.className = 'role-description';
        desc.textContent = ROLE_DESCRIPTIONS[player.role];
        roleContent.appendChild(desc);
        const actionDiv = document.createElement('div');
        actionDiv.id = 'role-actions';
        actionDiv.style.marginTop = '1.5rem';
        roleContent.appendChild(actionDiv);
        RoleActionProcessor.processRoleAction(player);
    };

    const startRevealTimer = (seconds, player) => {
        let remaining = seconds;
        const timerDisplay = document.getElementById('timer-display');
        const interval = setInterval(() => {
            remaining--;
            if (timerDisplay) timerDisplay.textContent = remaining;
            const progress = 1 - (remaining / seconds);
            updateSVGProgress('timer-progress', progress);
            if (remaining <= 0) {
                clearInterval(interval);
                autoHideRole(player);
            }
        }, 1000);
    };

    const autoHideRole = (player) => {
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

    const showNightPassDeviceScreen = (player = null) => {
        showScreen('night-pass-device-screen');
        const nextButton = document.getElementById('btn-next-night-player');
        nextButton.onclick = () => {
            NightPhaseEngine.proceedToNextNightPlayer();
        };
    };

    const showWolfVotingScreen = (wolf) => {
        showScreen('wolf-voting-screen');
        const targetsList = document.getElementById('wolf-targets-list');
        targetsList.innerHTML = '';
        const targets = GameState.getState().alivePlayers.filter(p => p.id !== wolf.id && p.role !== ROLES.WOLF);
        targets.forEach(target => {
            const button = document.createElement('button');
            button.className = 'target-button';
            button.innerHTML = `<span>${target.name}</span><span class="target-icon">🎯</span>`;
            button.addEventListener('click', () => {
                selectWolfTarget(wolf, target, button);
            });
            targetsList.appendChild(button);
        });
        updateWolfVoteCounter(GameState.getWolfVoteCounts());
    };

    const selectWolfTarget = (wolf, target, buttonElement) => {
        RoleActionProcessor.submitWolfVote(wolf, target.id);
        document.querySelectorAll('#wolf-targets-list .target-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        buttonElement.classList.add('selected');
        const counts = GameState.getWolfVoteCounts();
        updateWolfVoteCounter(counts);
        const statusName = document.getElementById('selected-target-name');
        const statusVotes = document.getElementById('selected-target-votes');
        statusName.textContent = target.name;
        statusVotes.textContent = counts[target.id];
        AudioManager.playSound('wolf-vote');
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
            item.innerHTML = `<span>${target.name}</span><span class="vote-count">${count}</span>`;
            counter.appendChild(item);
        });
    };

    const showDoctorScreen = (doctor) => {
        showScreen('doctor-screen');
        const targetsList = document.getElementById('doctor-targets-list');
        targetsList.innerHTML = '';
        const targets = GameState.getState().alivePlayers.filter(p => p.id !== doctor.id);
        targets.forEach(target => {
            const button = document.createElement('button');
            button.className = 'target-button';
            const isLastProtected = GameState.getState().lastProtectedPlayer === target.id;
            if (isLastProtected) button.classList.add('disabled');
            button.innerHTML = `<span>${target.name}</span><span class="target-icon">${isLastProtected ? '❌' : '💉'}</span>`;
            button.addEventListener('click', () => {
                if (!isLastProtected) selectDoctorTarget(doctor, target, button);
            });
            targetsList.appendChild(button);
        });
    };

    const selectDoctorTarget = (doctor, target, buttonElement) => {
        RoleActionProcessor.submitDoctorProtection(doctor, target.id);
        document.querySelectorAll('#doctor-targets-list .target-button').forEach(btn => {
            if (!btn.classList.contains('disabled')) btn.classList.remove('selected');
        });
        buttonElement.classList.add('selected');
        const statusName = document.getElementById('protected-player-name');
        statusName.textContent = target.name;
        AudioManager.playSound('protect');
        setTimeout(() => {
            NightPhaseEngine.processNightAction(doctor);
        }, 1000);
    };

    const showSeerScreen = (seer) => {
        showScreen('seer-screen');
        const targetsList = document.getElementById('seer-targets-list');
        targetsList.innerHTML = '';
        const targets = GameState.getState().alivePlayers.filter(p => p.id !== seer.id);
        targets.forEach(target => {
            const button = document.createElement('button');
            button.className = 'target-button';
            button.innerHTML = `<span>${target.name}</span><span class="target-icon">🔮</span>`;
            button.addEventListener('click', () => {
                selectSeerTarget(seer, target);
            });
            targetsList.appendChild(button);
        });
        const resultDiv = document.getElementById('seer-result');
        resultDiv.classList.add('hidden');
    };

    const selectSeerTarget = (seer, target) => {
        const isWolf = RoleActionProcessor.submitSeerReveal(seer, target.id);
        const resultDiv = document.getElementById('seer-result');
        const resultText = document.getElementById('seer-result-text');
        resultText.textContent = isWolf ? '🐺 ذئب!' : '👨‍🌾 ليس ذئب';
        resultText.style.color = isWolf ? '#ff6b6b' : '#00ff00';
        resultDiv.classList.remove('hidden');
        AudioManager.playSound('reveal');
        setTimeout(() => {
            NightPhaseEngine.processNightAction(seer);
        }, 3000);
    };

    const showVillagerScreen = (villager) => {
        showScreen('villager-screen');
        let remaining = CONFIG.NIGHT_REVEAL_TIMER;
        const timerDisplay = document.getElementById('villager-timer');
        const interval = setInterval(() => {
            remaining--;
            if (timerDisplay) timerDisplay.textContent = remaining;
            if (remaining <= 0) {
                clearInterval(interval);
                NightPhaseEngine.processNightAction(villager);
            }
        }, 1000);
    };

    const showDayInfoScreen = () => {
        showScreen('day-info-screen');
        const state = GameState.getState();
        const lastDeath = state.deaths[state.deaths.length - 1];
        const deathReport = document.getElementById('death-report');
        const noDeathReport = document.getElementById('no-death-report');

        if (lastDeath && lastDeath.nightNumber === state.nightNumber - 1) {
            deathReport.classList.remove('hidden');
            noDeathReport.classList.add('hidden');
            const dead = GameState.getPlayer(lastDeath.playerId);
            document.getElementById('death-player-name').textContent = dead.name;
            document.getElementById('death-player-role').textContent = `${ROLE_ICONS[dead.role]} ${ROLE_NAMES[dead.role]}`;
        } else {
            deathReport.classList.add('hidden');
            noDeathReport.classList.remove('hidden');
        }

        DayPhaseEngine.startDayDiscussion();
        const skipButton = document.getElementById('btn-skip-discussion');
        skipButton.onclick = () => DayPhaseEngine.skipDiscussion();
    };

    const showDayVoteIdentityScreen = (voter) => {
        showScreen('day-vote-identity-screen');
        const nameDisplay = document.getElementById('day-vote-player-name');
        nameDisplay.textContent = voter.name;
        const enterButton = document.getElementById('btn-enter-voting-booth');
        enterButton.onclick = () => {
            AntiCheat.enableRevealMode();
            showVotingBooth(voter);
        };
    };

    const showVotingBooth = (voter) => {
        showScreen('day-voting-booth-screen');
        const targetsList = document.getElementById('day-targets-list');
        targetsList.innerHTML = '';
        const targets = GameState.getState().alivePlayers.filter(p => p.id !== voter.id);
        targets.forEach(target => {
            const button = document.createElement('button');
            button.className = 'target-button';
            button.innerHTML = `<span>${target.name}</span><span class="target-icon">🗳️</span>`;
            button.addEventListener('click', () => {
                selectVotingTarget(voter, target, button);
            });
            targetsList.appendChild(button);
        });
    };

    const selectVotingTarget = (voter, target, buttonElement) => {
        GameState.recordDayVote(voter.id, target.id);
        document.querySelectorAll('#day-targets-list .target-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        buttonElement.classList.add('selected');
        const statusName = document.getElementById('day-voted-player-name');
        statusName.textContent = target.name;
        setTimeout(() => {
            AntiCheat.disableRevealMode();
            showNightPassDeviceScreen();
            setTimeout(() => {
                DayPhaseEngine.proceedToNextVoter();
            }, 2000);
        }, 1000);
    };

    const showExecutionScreen = (executed) => {
        showScreen('execution-screen');
        document.getElementById('executed-player-name').textContent = executed.name;
        document.getElementById('executed-player-role').textContent = `${ROLE_ICONS[executed.role]} ${ROLE_NAMES[executed.role]}`;
    };

    const showWinScreen = (result) => {
        showScreen('win-screen');
        const winTitle = document.getElementById('win-title');
        const winReason = document.getElementById('win-reason');
        const winnerStats = document.getElementById('winner-stats');
        const isVillagers = result.team === 'VILLAGERS';
        winTitle.textContent = `${result.icon} فاز الفريق!`;
        winTitle.style.color = isVillagers ? '#00ff00' : '#ff6b6b';
        winReason.textContent = result.reason;
        winnerStats.innerHTML = '';
        const winners = isVillagers ? GameState.getAliveVillagers() : GameState.getAliveWolves();
        const heading = document.createElement('h3');
        heading.textContent = 'الفائزون:';
        winnerStats.appendChild(heading);
        winners.forEach(player => {
            const p = document.createElement('p');
            p.textContent = `✓ ${player.name}`;
            winnerStats.appendChild(p);
        });
        const replayButton = document.getElementById('btn-play-again');
        replayButton.onclick = () => {
            resetGameInstance();
        };
    };

    return {
        hideAllScreens, showScreen, showNightIdentityScreen, startRevealAnimation, showRoleScreen,
        startRevealTimer, autoHideRole, showNightPassDeviceScreen, showWolfVotingScreen, selectWolfTarget,
        updateWolfVoteCounter, showDoctorScreen, selectDoctorTarget, showSeerScreen, selectSeerTarget,
        showVillagerScreen, showDayInfoScreen, showDayVoteIdentityScreen, showVotingBooth, selectVotingTarget,
        showExecutionScreen, showWinScreen,
    };
})();

/* ===============================================
   GLOBAL RESET FUNCTION
   =============================================== */

const resetGameInstance = () => {
    GameState.reset();
    AudioManager.fadeOutMusic = () => {};
    AudioManager.initAudio = () => {};
    
    setTimeout(() => {
        GameMaster.initialize();
    }, 500);
};

/* ===============================================
   HELPER: Start First Night
   =============================================== */

const startFirstNight = () => {
    GameState.incrementDay();
    NightPhaseEngine.startNight();
};

/* ===============================================
   MODULE: Game Master (Main Controller)
   =============================================== */

const GameMaster = (() => {
    const initialize = () => {
        GameState.reset();
        setupUIEventListeners();
        SetupEngine.initializeSetup();
        AudioManager.initAudio();
        UIRenderer.showScreen('setup-screen');
        GameState.logAction('Game initialized');
    };

    return { initialize };
})();

/* ===============================================
   EVENT LISTENERS - GLOBAL SETUP
   =============================================== */

const setupUIEventListeners = () => {
    document.addEventListener('contextmenu', (e) => {
        if (GameState.getPhase() !== PHASES.SETUP) {
            e.preventDefault();
        }
    });

    document.addEventListener('selectstart', (e) => {
        if (GameState.getPhase() !== PHASES.SETUP) {
            e.preventDefault();
        }
    });

    document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
    });
};

/* ===============================================
   PAGE LOAD & INITIALIZATION
   =============================================== */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Werewolf Game Loading...');
    
    document.body.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    GameMaster.initialize();
    
    console.log('✅ Game Ready! Click "ابدأ اللعبة" to start');
});

window.addEventListener('beforeunload', () => {
    const nightBg = document.getElementById('audio-night-bg');
    const dayBg = document.getElementById('audio-day-bg');
    if (nightBg) { nightBg.volume = 0; nightBg.pause(); }
    if (dayBg) { dayBg.volume = 0; dayBg.pause(); }
});

console.log('✅ WEREWOLF GAME SCRIPT FULLY LOADED');
