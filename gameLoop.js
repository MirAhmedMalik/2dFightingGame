import { rectsOverlap } from './collision.js';
import { player1Keys, player2Keys } from './input.js';
import Character from './Character.js';
import HealthBar from './healthBar.js';
import AIController from './AIController.js';
import { showMenu } from './menu.js';
import { playHit, playBlock, playSpecial, playSuper, playAnnouncer } from './sound.js';

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

// ---- Constants ----
const GROUND_Y = 270;
const START_Y = GROUND_Y - 50;     // resting y (on the ground)
const P1_START_X = 100;
const P2_START_X = 800;
const ROUND_TIME = 99;             // seconds per round
const COUNTDOWN_TIME = 3;          // "3, 2, 1" seconds
const FIGHT_FLASH = 0.6;           // "FIGHT!" display time
const ROUND_OVER_TIME = 2.0;       // pause before next round / match screen
const WINS_NEEDED = 2;             // best-of-3

// ---- Game state ----
const game = {
    state: 'menu',                 // menu | countdown | fighting | roundOver | matchOver
    mode: 'ai',                    // 'ai' | 'local'
    difficulty: 'easy',
    level: 1,
    round: 1,
    monsterAwakensTimer: 0,
    p1Wins: 0,
    p2Wins: 0,
    roundTimer: ROUND_TIME,
    countdownTimer: 0,
    fightTimer: 0,
    roundOverTimer: 0,
    roundWinnerText: '',
    matchWinner: '',
    player1: null,
    player2: null,
    healthBar1: null,
    healthBar2: null,
    ai: null,
    // juice
    shakeTimer: 0,
    shakeMag: 0,
    hitPause: 0,                   // frames to freeze on impactful hits
    lastTime: 0
};

// ---- Match / round management ----

function startMatch(mode, difficulty, level = 1) {
    game.mode = mode;
    game.difficulty = difficulty;
    game.level = level;
    game.round = 1;
    game.p1Wins = 0;
    game.p2Wins = 0;
    game.matchWinner = '';
    game.healthBar1 = new HealthBar(20, 28, 380, 26, 'blue', true);
    game.healthBar2 = new HealthBar(560, 28, 380, 26, 'red', false);
    startRound();
}

function startRound() {
    game.player1 = new Character(P1_START_X, START_Y, 50, 50, 'blue', true);
    game.player2 = new Character(P2_START_X, START_Y, 50, 50, 'red', false);
    if (game.mode === 'ai') {
        game.ai = new AIController(game.player2, game.player1, game.difficulty);
    } else {
        game.ai = null;
    }
    game.roundTimer = ROUND_TIME;
    game.countdownTimer = COUNTDOWN_TIME;
    game.fightTimer = 0;
    // Apply monster transformation based on round number
    if (game.player2 && game.mode === 'ai') {
        if (game.round === 2) {
            game.player2.monsterLevel = 1;
            game.monsterAwakensTimer = 2.5; // Show transform message 2.5s
        } else if (game.round >= 3) {
            game.player2.monsterLevel = 2;
            game.monsterAwakensTimer = 2.5;
        } else {
            game.player2.monsterLevel = 0;
            game.monsterAwakensTimer = 0;
        }
    }
    game.shakeTimer = 0;
    game.hitPause = 0;
    game.state = 'countdown';

    playAnnouncer('Round ' + game.round);
    setTimeout(() => {
        if (game.state === 'countdown' || game.state === 'fighting') {
            playAnnouncer('Fight!');
        }
    }, 1500);
}

function endRound(winner) {
    if (winner === 'p1') {
        game.p1Wins++;
        game.roundWinnerText = 'PLAYER 1 WINS';
    } else if (winner === 'p2') {
        game.p2Wins++;
        game.roundWinnerText = (game.mode === 'ai' ? 'CPU' : 'PLAYER 2') + ' WINS';
    } else {
        game.roundWinnerText = 'DRAW - NO CONTEST';
    }
    game.state = 'roundOver';
    game.roundOverTimer = ROUND_OVER_TIME;

    playAnnouncer(winner !== 'draw' ? game.roundWinnerText : 'Draw');
}

function checkKO() {
    const p1Dead = game.player1.health <= 0;
    const p2Dead = game.player2.health <= 0;
    if (p1Dead && p2Dead) endRound('draw');
    else if (p2Dead) endRound('p1');
    else if (p1Dead) endRound('p2');
}

function endRoundByTimeout() {
    if (game.player1.health > game.player2.health) endRound('p1');
    else if (game.player2.health > game.player1.health) endRound('p2');
    else endRound('draw');
}

function returnToMenu() {
    game.state = 'menu';
    game.player1 = null;
    game.player2 = null;
    showMenu(startMatch);
}

// ---- Combat resolution ----

function totalFrames(c) {
    return c.attackData.startup + c.attackData.active + c.attackData.recovery;
}

function triggerShake(mag, time) {
    game.shakeMag = Math.max(game.shakeMag, mag);
    game.shakeTimer = Math.max(game.shakeTimer, time);
}

function resolveHit(attacker, defender) {
    if (!attacker.hitbox || attacker.hasHitThisAttack) return;
    if (!rectsOverlap(attacker.hitbox, defender.getHurtbox())) return;

    const willBlock = defender.blocking && defender.fsm.currentState === 'blocking';
    const isHeavy = attacker.attackState === 'heavy' || attacker.attackState === 'special';

    defender.takeHit(
        attacker.attackData.damage,
        attacker.facing === 'right' ? 1 : -1,
        attacker,
        isHeavy
    );
    attacker.hasHitThisAttack = true;
    attacker.superMeter = Math.min(100, attacker.superMeter + 5);

    if (willBlock) {
        playBlock();
    } else if (attacker.isSuperMove) {
        attacker.flashText = 'SUPER!';
        attacker.flashTimer = 1.2;
        playSuper();
        triggerShake(20, 0.5);
        game.hitPause = 8;
    } else if (attacker.attackState === 'special') {
        attacker.flashText = 'SPECIAL!';
        attacker.flashTimer = 1.0;
        playSpecial();
        triggerShake(12, 0.35);
        game.hitPause = 6;
    } else if (isHeavy) {
        playHit(true);
        triggerShake(10, 0.25);
        game.hitPause = 5;
    } else {
        playHit(false);
        triggerShake(4, 0.1);
        game.hitPause = 2;
    }
}

function resolveHits() {
    resolveHit(game.player1, game.player2);
    resolveHit(game.player2, game.player1);

    // Reset hit flags once an attack's full animation has elapsed.
    if (game.player1.attackState && game.player1.attackFrame >= totalFrames(game.player1)) {
        game.player1.hasHitThisAttack = false;
    }
    if (game.player2.attackState && game.player2.attackFrame >= totalFrames(game.player2)) {
        game.player2.hasHitThisAttack = false;
    }
}

// ---- Update ----

function update(dt) {
    if (game.state === 'countdown') {
        game.countdownTimer -= dt;
        game.monsterAwakensTimer -= dt;
        if (game.countdownTimer <= 0) {
            game.state = 'fighting';
            game.fightTimer = FIGHT_FLASH;
        }
        return;
    }

    if (game.state === 'fighting') {
        if (game.fightTimer > 0) game.fightTimer -= dt;
        if (game.monsterAwakensTimer > 0) game.monsterAwakensTimer -= dt;

        // Hit-pause: freeze both fighters briefly for impact "juice".
        if (game.hitPause > 0) {
            game.hitPause--;
            return;
        }

        // Round timer.
        game.roundTimer -= dt;
        if (game.roundTimer <= 0) {
            game.roundTimer = 0;
            endRoundByTimeout();
            return;
        }

        // Input: AI drives Player 2 in single-player mode.
        let p2keys = player2Keys;
        if (game.mode === 'ai') p2keys = game.ai.update(dt);

        // Tekken-style: Characters ALWAYS face each other - must run BEFORE update()
        // so spawnHitbox() uses the correct facing when attacks are active.
        if (game.player1 && game.player2) {
            if (game.player1.x + game.player1.width / 2 < game.player2.x + game.player2.width / 2) {
                game.player1.facing = 'right';
                game.player2.facing = 'left';
            } else {
                game.player1.facing = 'left';
                game.player2.facing = 'right';
            }
        }

        game.player1.update(dt, player1Keys);
        game.player2.update(dt, p2keys);

        resolveHits();

        game.player1.updateProjectiles(dt, game.player2);
        game.player2.updateProjectiles(dt, game.player1);

        checkKO();
        return;
    }

    if (game.state === 'roundOver') {
        game.roundOverTimer -= dt;
        if (game.roundOverTimer <= 0) {
            if (game.p1Wins >= WINS_NEEDED || game.p2Wins >= WINS_NEEDED) {
                if (game.mode === 'ai' && game.p1Wins >= WINS_NEEDED) {
                    if (game.level < 3) {
                        game.level++;
                        const nextDifficulty = game.level === 2 ? 'medium' : 'hard';
                        startMatch('ai', nextDifficulty, game.level);
                        return;
                    } else {
                        game.state = 'matchOver';
                        game.matchWinner = 'YOU WIN THE GAME!';
                        playAnnouncer('You win the game!');
                        return;
                    }
                }

                game.state = 'matchOver';
                game.matchWinner = game.p1Wins >= WINS_NEEDED
                    ? 'PLAYER 1'
                    : (game.mode === 'ai' ? 'CPU' : 'PLAYER 2');
                playAnnouncer(game.matchWinner + ' Wins.');
            } else {
                game.round++;
                startRound();
            }
        }
        return;
    }

    // 'menu' and 'matchOver' require no simulation.
}

// ---- Rendering ----

function renderMeter(meter, x, y, width, height, isPlayer1) {
    context.fillStyle = '#222';
    context.fillRect(x, y, width, height);

    const pct = Math.min(100, Math.max(0, meter)) / 100;
    const fillW = width * pct;

    if (meter >= 100) {
        context.fillStyle = (Math.floor(performance.now() / 120) % 2 === 0) ? 'cyan' : 'white';
    } else {
        context.fillStyle = '#ffcc00';
    }

    if (isPlayer1) {
        context.fillRect(x, y, fillW, height);
    } else {
        context.fillRect(x + width - fillW, y, fillW, height);
    }

    context.strokeStyle = '#fff';
    context.strokeRect(x, y, width, height);
}

function drawPips(x, y, wins, isLeft) {
    const r = 6;
    const gap = 18;
    for (let i = 0; i < WINS_NEEDED; i++) {
        const px = isLeft ? x + i * gap : x - i * gap;
        context.beginPath();
        context.arc(px, y, r, 0, Math.PI * 2);
        if (i < wins) {
            context.fillStyle = '#ffcc00';
            context.fill();
        } else {
            context.strokeStyle = '#fff';
            context.lineWidth = 2;
            context.stroke();
            context.lineWidth = 1;
        }
    }
}

function renderHUD() {
    // Character names
    context.fillStyle = '#fff';
    context.font = 'bold 16px Arial';
    context.textAlign = 'left';
    context.fillText(game.mode === 'ai' ? 'PLAYER 1' : 'PLAYER 1', 20, 20);
    context.textAlign = 'right';
    context.fillText(game.mode === 'ai' ? `CPU (Level ${game.level})` : 'PLAYER 2', 940, 20);

    // Health bars
    game.healthBar1.render(context, game.player1.health, game.player1.maxHealth);
    game.healthBar2.render(context, game.player2.health, game.player2.maxHealth);

    // Super meters
    renderMeter(game.player1.superMeter, 20, 58, 380, 10, true);
    renderMeter(game.player2.superMeter, 560, 58, 380, 10, false);

    // Round-win pips
    drawPips(20, 78, game.p1Wins, true);
    drawPips(940, 78, game.p2Wins, false);

    // Round timer
    context.textAlign = 'center';
    context.font = 'bold 38px Arial';
    context.fillStyle = game.roundTimer <= 10 ? '#ff4444' : '#fff';
    context.fillText(String(Math.ceil(game.roundTimer)), 480, 52);
}

function renderAnnouncements() {
    context.textAlign = 'center';

    if (game.state === 'countdown') {
        context.fillStyle = '#fff';
        context.font = 'bold 40px Arial';
        context.fillText(`ROUND ${game.round}`, 480, 200);
        const n = Math.ceil(game.countdownTimer);
        context.fillStyle = '#ffcc00';
        context.font = 'bold 90px Arial';
        context.fillText(n > 0 ? String(n) : '', 480, 300);
    } else if (game.state === 'fighting' && game.fightTimer > 0) {
        context.fillStyle = '#ffcc00';
        context.font = 'bold 70px Orbitron, Arial';
        context.fillText('FIGHT!', 480, 280);

    // Monster awakens overlay (during countdown of monster rounds)
    } else if (game.monsterAwakensTimer > 0 && (game.state === 'countdown' || game.state === 'fighting')) {
        const ml = game.player2 ? (game.player2.monsterLevel || 0) : 0;
        if (ml > 0) {
            const alpha = Math.min(1, game.monsterAwakensTimer);
            context.save();
            context.globalAlpha = alpha;
            const grad = context.createLinearGradient(0, 200, 960, 350);
            if (ml === 2) {
                grad.addColorStop(0, 'rgba(80,0,0,0.7)');
                grad.addColorStop(0.5, 'rgba(180,0,0,0.8)');
                grad.addColorStop(1, 'rgba(80,0,0,0.7)');
            } else {
                grad.addColorStop(0, 'rgba(0,40,0,0.7)');
                grad.addColorStop(0.5, 'rgba(0,120,0,0.8)');
                grad.addColorStop(1, 'rgba(0,40,0,0.7)');
            }
            context.fillStyle = grad;
            context.fillRect(0, 220, 960, 120);

            context.textAlign = 'center';
            context.font = 'bold 54px Orbitron, Arial';
            context.shadowBlur = 30;
            context.strokeStyle = 'black';
            context.lineWidth = 6;
            if (ml === 2) {
                context.fillStyle = '#ff2200';
                context.shadowColor = '#ff0000';
                context.strokeText('⚠ DEMON AWAKENS ⚠', 480, 290);
                context.fillText('⚠ DEMON AWAKENS ⚠', 480, 290);
            } else {
                context.fillStyle = '#44ff00';
                context.shadowColor = '#00ff00';
                context.strokeText('☠ MONSTER AWAKENS ☠', 480, 290);
                context.fillText('☠ MONSTER AWAKENS ☠', 480, 290);
            }
            context.shadowBlur = 0;
            context.restore();
        }
    } else if (game.state === 'roundOver') {
        context.fillStyle = '#fff';
        context.font = 'bold 46px Arial';
        context.fillText(`ROUND ${game.round}`, 480, 200);
        context.fillStyle = '#ffcc00';
        context.font = 'bold 50px Arial';
        context.fillText(game.roundWinnerText, 480, 260);
    } else if (game.state === 'matchOver') {
        context.fillStyle = '#ffcc00';
        context.font = 'bold 60px Arial';
        context.fillText('MATCH WINNER', 480, 220);
        context.fillStyle = '#fff';
        context.font = 'bold 46px Arial';
        context.fillText(game.matchWinner, 480, 285);
        context.fillStyle = '#aaa';
        context.font = '20px Arial';
        context.fillText('Press ENTER for Main Menu', 480, 350);
    }
}

function render(dt) {
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (game.state === 'menu' || !game.player1) {
        return; // menu overlay handles visuals
    }

    context.save();

    // Screen shake (brief canvas translate offset).
    if (game.shakeTimer > 0) {
        const dx = (Math.random() * 2 - 1) * game.shakeMag;
        const dy = (Math.random() * 2 - 1) * game.shakeMag;
        context.translate(dx, dy);
        game.shakeTimer -= dt;
        if (game.shakeTimer < 0) game.shakeTimer = 0;
    }

    // Ground line
    context.fillStyle = '#4a4a4a';
    context.fillRect(0, GROUND_Y, canvas.width, 2);

    // HUD
    renderHUD();

    // Fighters
    game.player1.render(context);
    game.player2.render(context);

    // Super-move screen flash
    const superFlash = Math.max(game.player1.superFlashTimer, game.player2.superFlashTimer);
    if (superFlash > 0) {
        context.fillStyle = `rgba(255, 255, 255, ${Math.min(0.7, superFlash * 1.8)})`;
        context.fillRect(-30, -30, canvas.width + 60, canvas.height + 60);
    }

    // "SPECIAL!" / "SUPER!" callout
    const flashing = game.player1.flashTimer > 0 ? game.player1
        : (game.player2.flashTimer > 0 ? game.player2 : null);
    if (flashing) {
        context.save();
        context.textAlign = 'center';
        context.font = 'bold 52px Arial';
        context.fillStyle = flashing.isSuperMove ? 'cyan' : '#ffcc00';
        context.strokeStyle = 'black';
        context.lineWidth = 4;
        context.strokeText(flashing.flashText, 480, 180);
        context.fillText(flashing.flashText, 480, 180);
        context.restore();
    }

    context.restore();

    // Announcements drawn on top (not shaken).
    renderAnnouncements();
}

// ---- Main loop ----

function gameLoop(timestamp) {
    const currentTime = timestamp || performance.now();
    let dt = (currentTime - game.lastTime) / 1000;
    game.lastTime = currentTime;
    if (dt > 0.05) dt = 0.05; // clamp big gaps (tab switches, etc.)

    update(dt);
    render(dt);

    requestAnimationFrame(gameLoop);
}

// Return to the menu from the match-over screen.
document.addEventListener('keydown', (e) => {
    if (game.state === 'matchOver' && e.key === 'Enter') {
        returnToMenu();
    }
});

// Boot: show the main menu, then start the loop.
showMenu(startMatch);
requestAnimationFrame(gameLoop);
