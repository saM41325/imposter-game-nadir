console.log('🎮 Script loading...');

// ========== CONFIG ==========
const CONFIG = {
    NIGHT_REVEAL_TIMER: 10,
    NIGHT_REVEAL_RANDOM_DELAY: 2000,
    DAY_DISCUSSION_TIMER: 180,
};

// ========== ROLES ==========
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

// ========== PHASES ==========
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

// ========== GAME STATE ==========
const GameState = (() => {
    let state = {
        players: [],
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
        deaths: [],
        lastProtectedPlayer: null,
    };

    return {
        getState: () => ({ ...state }),
        getPhase: () => state.phase,
        setPhase: (phase) => { state.phase = phase; console.log(`📍 Phase: ${phase}`); },
        getPlayers: () => state.players,
        addPlayer: (name) => {
            const player = {
                id: state.players.length,
                name: name.trim(),
                role: null,
                alive: true,
            };
            state.players.push(player);
            return player;
        },
        assignRole: (playerId, role) => {
            if (playerId >= 0 && playerId < state.players.length) {
                state.players[playerId].role = role;
                return true;
            }
            return false;
        },
        setAlive: (playerId, alive) => {
            if (playerId >= 0 && playerId < state.players.length) {
                state.players[playerId].alive = alive;
                state.alivePlayers = state.players.filter(p => p.alive);
                state.deadPlayers = state.players.filter(p => !p.alive);
                return true;
            }
            return false;
        },
        getPlayer: (id) => state.players[id],
        getAliveCount: () => state.alivePlayers.length,
        getAliveWolves: () => state.alivePlayers.filter(p => p.role === ROLES.WOLF),
        getAliveVillagers: () => state.alivePlayers.filter(p => p.role !== ROLES.WOLF),
        incrementNight: () => { state.nightNumber++; },
        incrementDay: () => { state.dayNumber++; },
        getShuffledAlive: () => [...state.alivePlayers].sort(() => Math.random() - 0.5),
        recordWolfVote: (voterId, targetId) => {
            state.nightActions.wolfVotes[voterId] = targetId;
            console.log(`🐺 Wolf ${voterId} voted ${targetId}`);
        },
        recordDayVote: (voterId, targetId) => {
            state.dayVotes[voterId] = targetId;
            console.log(`🗳️ Player ${voterId} voted ${targetId}`);
        },
        recordDoctorProtection: (targetId) => {
            if (state.lastProtectedPlayer === targetId) return false;
            state.nightActions.protectedPlayer = targetId;
            state.lastProtectedPlayer = targetId;
            return true;
        },
        recordSeerReveal: (targetId) => {
            const isWolf = state.players[targetId].role === ROLES.WOLF;
            state.nightActions.seerReveal = { targetId, isWolf };
            state.nightActions.seerRevealed = true;
            return isWolf;
        },
        getSeerRevealResult: () => state.nightActions.seerRevealed ? state.nightActions.seerReveal.isWolf : null,
        getAttackTarget: () => {
            const votes = state.nightActions.wolfVotes;
            if (Object.keys(votes).length === 0) return null;
            const counts = {};
            Object.values(votes).forEach(id => {
                counts[id] = (counts[id] || 0) + 1;
            });
            const max = Math.max(...Object.values(counts));
            const targets = Object.keys(counts).filter(id => counts[id] === max).map(Number);
            return targets[Math.floor(Math.random() * targets.length)];
        },
        getExecutionTarget: () => {
            const votes = state.dayVotes;
            if (Object.keys(votes).length === 0) return null;
            const counts = {};
            Object.values(votes).forEach(id => {
                counts[id] = (counts[id] || 0) + 1;
            });
            const max = Math.max(...Object.values(counts));
            const targets = Object.keys(counts).filter(id => counts[id] === max).map(Number);
            return targets[Math.floor(Math.random() * targets.length)];
        },
        resolveNightAttack: () => {
            const attackedId = GameState.getAttackTarget();
            if (attackedId === null || attackedId === undefined) return null;
            const protectedId = state.nightActions.protectedPlayer;
            if (attackedId === protectedId) {
                console.log(`💉 Player ${attackedId} was protected!`);
                return null;
            }
            state.setAlive(attackedId, false);
            return attackedId;
        },
        clearNightActions: () => {
            state.nightActions = { wolfVotes: {}, protectedPlayer: null, seerReveal: null, seerRevealed: false };
        },
        clearDayVotes: () => {
            state.dayVotes = {};
        },
        reset: () => {
            state = {
                players: [],
                phase: PHASES.SETUP,
                nightNumber: 0,
                dayNumber: 0,
                alivePlayers: [],
                deadPlayers: [],
                nightActions: { wolfVotes: {}, protectedPlayer: null, seerReveal: null, seerRevealed: false },
                dayVotes: {},
                deaths: [],
                lastProtectedPlayer: null,
            };
        },
    };
})();

// ========== UI RENDERER ==========
const UIRenderer = (() => {
    const hideAll = () => {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('screen-active'));
    };

    const show = (id) => {
        hideAll();
        const elem = document.getElementById(id);
        if (elem) elem.classList.add('screen-active');
    };

    return { hideAll, show };
})();

// ========== SETUP ENGINE ==========
const SetupEngine = (() => {
    let roleCounts = { wolf: 2, doctor: 1, seer: 1, villager: 0 };

    const init = () => {
        console.log('✅ Setup Engine Initializing...');

        const playerCountInput = document.getElementById('player-count');
        const btnDecrease = document.getElementById('btn-decrease-players');
        const btnIncrease = document.getElementById('btn-increase-players');
        const roleDistDiv = document.getElementById('role-distribution');
        const btnStart = document.getElementById('btn-start-game');

        // Decrease players
        if (btnDecrease) {
            btnDecrease.addEventListener('click', (e) => {
                e.preventDefault();
                const count = Math.max(4, parseInt(playerCountInput.value) - 1);
                playerCountInput.value = count;
                updatePlayerInputs(count);
                renderRoles(roleDistDiv, count);
                console.log(`⬇️ Players: ${count}`);
            });
        }

        // Increase players
        if (btnIncrease) {
            btnIncrease.addEventListener('click', (e) => {
                e.preventDefault();
                const count = Math.min(20, parseInt(playerCountInput.value) + 1);
                playerCountInput.value = count;
                updatePlayerInputs(count);
                renderRoles(roleDistDiv, count);
                console.log(`⬆️ Players: ${count}`);
            });
        }

        // Initial render
        const initial = parseInt(playerCountInput.value);
        renderRoles(roleDistDiv, initial);
        updatePlayerInputs(initial);

        // Start game
        if (btnStart) {
            btnStart.addEventListener('click', (e) => {
                e.preventDefault();
                startGame();
            });
        }

        console.log('✅ Setup Engine Ready');
    };

    const updatePlayerInputs = (count) => {
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

    const renderRoles = (container, playerCount) => {
        playerCount = parseInt(playerCount);
        const suggested = {
            wolf: Math.ceil(playerCount / 4),
            doctor: Math.ceil(playerCount / 6),
            seer: 1,
            villager: 0,
        };

        const total = suggested.wolf + suggested.doctor + suggested.seer;
        suggested.villager = Math.max(0, playerCount - total);
        roleCounts = suggested;

        container.innerHTML = '';

        Object.entries(suggested).forEach(([role, count]) => {
            if (role === ROLES.VILLAGER) return;

            const div = document.createElement('div');
            div.className = 'role-control';
            div.innerHTML = `
                <span class="role-control-label">${ROLE_ICONS[role]} ${ROLE_NAMES[role]}</span>
                <input type="number" class="role-control-input" value="${count}" readonly>
            `;
            container.appendChild(div);
        });

        const villDiv = document.createElement('div');
        villDiv.className = 'role-control';
        villDiv.style.opacity = '0.7';
        villDiv.innerHTML = `
            <span class="role-control-label">${ROLE_ICONS.villager} ${ROLE_NAMES.villager}</span>
            <input type="number" class="role-control-input" value="${suggested.villager}" readonly>
        `;
        container.appendChild(villDiv);
    };

    const startGame = () => {
        const inputs = document.querySelectorAll('.player-name-input');
        const names = Array.from(inputs)
            .map(i => i.value.trim())
            .filter(n => n.length > 0);

        if (names.length < 4) {
            alert('أدخل أسماء لـ 4 لاعبين على الأقل');
            return;
        }

        console.log(`🎮 Starting game with ${names.length} players:`, names);

        // Add players
        names.forEach(name => GameState.addPlayer(name));

        // Distribute roles
        const rolePool = [];
        Object.entries(roleCounts).forEach(([role, count]) => {
            if (role !== ROLES.VILLAGER) {
                for (let i = 0; i < count; i++) rolePool.push(role);
            }
        });
        const remaining = names.length - rolePool.length;
        for (let i = 0; i < remaining; i++) rolePool.push(ROLES.VILLAGER);
        rolePool.sort(() => Math.random() - 0.5);

        GameState.getPlayers().forEach((p, i) => {
            GameState.assignRole(p.id, rolePool[i]);
            GameState.setAlive(p.id, true);
        });

        console.log('✅ Roles distributed, game starting!');

        GameState.setPhase(PHASES.ROLE_DISTRIBUTION);
        UIRenderer.show('role-distribution-screen');

        setTimeout(() => {
            GameState.incrementDay();
            startFirstNight();
        }, 2000);
    };

    return { init };
})();

// ========== NIGHT ENGINE ==========
const NightPhaseEngine = (() => {
    let playerIndex = 0;
    let players = [];

    const start = () => {
        console.log(`🌙 Night ${GameState.getState().nightNumber + 1} starting...`);
        GameState.incrementNight();
        GameState.clearNightActions();
        GameState.clearDayVotes();

        players = GameState.getShuffledAlive();
        playerIndex = 0;

        GameState.setPhase(PHASES.NIGHT);
        showNextPlayer();
    };

    const showNextPlayer = () => {
        if (playerIndex >= players.length) {
            resolve();
            return;
        }

        const player = players[playerIndex];
        UIRenderer.show('night-identity-screen');
        document.getElementById('night-player-name').textContent = player.name;

        const btn = document.getElementById('btn-reveal-role');
        btn.onclick = () => revealRole(player);
    };

    const revealRole = (player) => {
        UIRenderer.show('night-role-screen');

        const content = document.getElementById('role-content');
        content.innerHTML = `
            <div class="role-badge">${ROLE_ICONS[player.role]}<br>${ROLE_NAMES[player.role]}</div>
            <p class="role-description">${ROLE_DESCRIPTIONS[player.role]}</p>
        `;

        let remaining = CONFIG.NIGHT_REVEAL_TIMER;
        const display = document.getElementById('timer-display');
        
        const interval = setInterval(() => {
            remaining--;
            display.textContent = remaining;
            if (remaining <= 0) {
                clearInterval(interval);
                showPassDevice();
            }
        }, 1000);

        // Show role actions after a delay
        setTimeout(() => {
            processRoleAction(player);
        }, 500);
    };

    const processRoleAction = (player) => {
        const actions = document.getElementById('role-content');
        const role = player.role;

        if (role === ROLES.WOLF) {
            const targets = GameState.getState().alivePlayers.filter(p => p.id !== player.id && p.role !== ROLES.WOLF);
            actions.innerHTML += '<p style="margin-top: 1rem; color: #ffd700; font-size: 0.9rem;">اختر هدفك من قائمة اللاعبين عند الانتقال</p>';
        } else if (role === ROLES.DOCTOR) {
            actions.innerHTML += '<p style="margin-top: 1rem; color: #ffd700; font-size: 0.9rem;">سيتم توجيهك لاختيار من ستحمي</p>';
        } else if (role === ROLES.SEER) {
            actions.innerHTML += '<p style="margin-top: 1rem; color: #ffd700; font-size: 0.9rem;">سيتم توجيهك لاختيار من ستكتشف</p>';
        }
    };

    const showPassDevice = () => {
        UIRenderer.show('night-pass-device-screen');
        const btn = document.getElementById('btn-next-night-player');
        btn.onclick = () => {
            playerIndex++;
            showNextPlayer();
        };
    };

    const resolve = () => {
        console.log('🌙 Night resolving...');
        GameState.setPhase(PHASES.NIGHT_RESOLUTION);
        UIRenderer.show('night-resolution-screen');

        const attackedId = GameState.getAttackTarget();
        let text = '✨ لا أحد مات هذه الليلة!';
        if (attackedId !== null && attackedId !== undefined) {
            const attacked = GameState.getPlayer(attackedId);
            const protected = GameState.getState().nightActions.protectedPlayer;
            if (attackedId !== protected) {
                GameState.setAlive(attackedId, false);
                text = `⚰️ لقد مات: ${attacked.name}`;
                console.log(`💀 ${attacked.name} killed!`);
            }
        }

        document.getElementById('resolution-text').textContent = text;

        setTimeout(() => {
            GameState.setPhase(PHASES.DAY);
            startDay();
        }, 3000);
    };

    const startDay = () => {
        console.log('☀️ Day starting...');
        UIRenderer.show('day-info-screen');

        const state = GameState.getState();
        const deaths = state.deaths;
        const deathReport = document.getElementById('death-report');
        const noDeathReport = document.getElementById('no-death-report');

        if (deaths.length > 0 && deaths[deaths.length - 1].nightNumber === state.nightNumber) {
            deathReport.classList.remove('hidden');
            noDeathReport.classList.add('hidden');
        } else {
            deathReport.classList.add('hidden');
            noDeathReport.classList.remove('hidden');
        }

        let timeRemaining = CONFIG.DAY_DISCUSSION_TIMER;
        const timerDisplay = document.getElementById('day-timer-display');

        const interval = setInterval(() => {
            timeRemaining--;
            timerDisplay.textContent = timeRemaining;
            if (timeRemaining <= 0) {
                clearInterval(interval);
                startVoting();
            }
        }, 1000);

        const skipBtn = document.getElementById('btn-skip-discussion');
        skipBtn.onclick = () => {
            clearInterval(interval);
            startVoting();
        };
    };

    const startVoting = () => {
        console.log('🗳️ Voting starting...');
        GameState.setPhase(PHASES.DAY_VOTING);

        const voters = GameState.getShuffledAlive();
        let voterIndex = 0;

        const showVoter = () => {
            if (voterIndex >= voters.length) {
                executeVerdictResolve();
                return;
            }

            const voter = voters[voterIndex];
            UIRenderer.show('day-vote-identity-screen');
            document.getElementById('day-vote-player-name').textContent = voter.name;

            const btn = document.getElementById('btn-enter-voting-booth');
            btn.onclick = () => {
                showBooth(voter, () => {
                    voterIndex++;
                    showVoter();
                });
            };
        };

        const showBooth = (voter, onDone) => {
            UIRenderer.show('day-voting-booth-screen');
            const targetsList = document.getElementById('day-targets-list');
            targetsList.innerHTML = '';

            const targets = GameState.getState().alivePlayers.filter(p => p.id !== voter.id);

            targets.forEach(target => {
                const btn = document.createElement('button');
                btn.className = 'target-button';
                btn.innerHTML = `<span>${target.name}</span><span>🗳️</span>`;
                btn.type = 'button';
                btn.addEventListener('click', () => {
                    GameState.recordDayVote(voter.id, target.id);
                    document.getElementById('day-voted-player-name').textContent = target.name;

                    setTimeout(() => {
                        UIRenderer.show('night-pass-device-screen');
                        const passBtn = document.getElementById('btn-next-night-player');
                        passBtn.textContent = 'تم ✓';
                        passBtn.onclick = () => onDone();
                    }, 500);
                });
                targetsList.appendChild(btn);
            });
        };

        const executeVerdictResolve = () => {
            console.log('⚖️ Executing verdict...');
            GameState.setPhase(PHASES.EXECUTION);

            const executedId = GameState.getExecutionTarget();
            if (executedId === null) {
                checkWin();
                return;
            }

            const executed = GameState.getPlayer(executedId);
            GameState.setAlive(executedId, false);

            UIRenderer.show('execution-screen');
            document.getElementById('executed-player-name').textContent = executed.name;
            document.getElementById('executed-player-role').textContent = `${ROLE_ICONS[executed.role]} ${ROLE_NAMES[executed.role]}`;

            setTimeout(() => checkWin(), 3000);
        };

        const checkWin = () => {
            GameState.setPhase(PHASES.CHECK_WIN);

            const wolves = GameState.getAliveWolves();
            const villagers = GameState.getAliveVillagers();

            let result = null;
            if (wolves.length === 0) {
                result = { team: 'VILLAGERS', reason: 'تم القضاء على جميع الذئاب!', icon: '👨‍🌾' };
            } else if (wolves.length >= villagers.length) {
                result = { team: 'WOLVES', reason: 'سيطر الذئاب على القرية!', icon: '🐺' };
            }

            if (result) {
                GameState.setPhase(PHASES.GAME_OVER);
                showWinScreen(result);
            } else {
                GameState.incrementDay();
                GameState.setPhase(PHASES.NIGHT);
                setTimeout(() => start(), 2000);
            }
        };

        const showWinScreen = (result) => {
            UIRenderer.show('win-screen');
            const title = document.getElementById('win-title');
            title.textContent = `${result.icon} فاز الفريق!`;
            title.style.color = result.team === 'VILLAGERS' ? '#00ff00' : '#ff6b6b';
            document.getElementById('win-reason').textContent = result.reason;

            const stats = document.getElementById('winner-stats');
            stats.innerHTML = '<h3>الفائزون:</h3>';
            const winners = result.team === 'VILLAGERS' ? GameState.getAliveVillagers() : GameState.getAliveWolves();
            winners.forEach(p => {
                stats.innerHTML += `<p>✓ ${p.name}</p>`;
            });

            const replayBtn = document.getElementById('btn-play-again');
            replayBtn.onclick = () => {
                GameState.reset();
                UIRenderer.show('setup-screen');
            };
        };

        showVoter();
    };

    return { start };
})();

// ========== INIT ==========
const startFirstNight = () => {
    NightPhaseEngine.start();
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Ready, initializing setup...');
    SetupEngine.init();
});

console.log('✅ Game Script Loaded');
