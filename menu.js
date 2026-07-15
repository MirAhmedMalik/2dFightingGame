import { initAudio, playUiSelect } from './sound.js';

// Builds an HTML overlay menu on top of the canvas. Calls `onStart(mode, difficulty)`
// when the player chooses a mode. `mode` is 'ai' or 'local'; `difficulty` is one of
// 'easy' / 'medium' / 'hard' (only relevant for 'ai').

let overlayEl = null;

function clearOverlay() {
    if (overlayEl && overlayEl.parentNode) {
        overlayEl.parentNode.removeChild(overlayEl);
    }
    overlayEl = null;
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function makeButton(label, onClick) {
    const btn = el('button', 'menu-btn', label);
    btn.addEventListener('click', () => {
        playUiSelect();
        onClick();
    });
    return btn;
}

export function showMenu(onStart) {
    clearOverlay();

    overlayEl = el('div', 'menu-overlay');
    const panel = el('div', 'menu-panel');

    panel.appendChild(el('h1', 'menu-title', '2D FIGHTING GAME'));
    panel.appendChild(el('p', 'menu-subtitle', 'Choose a mode'));

    // --- Main menu buttons ---
    const mainButtons = el('div', 'menu-buttons');
    mainButtons.appendChild(makeButton('1 PLAYER vs AI', () => startAi(onStart, 'easy')));
    mainButtons.appendChild(makeButton('2 PLAYER LOCAL', () => {
        initAudio();
        clearOverlay();
        onStart('local', 'medium');
    }));
    mainButtons.appendChild(makeButton('HOW TO PLAY', () => showHowTo(onStart)));
    panel.appendChild(mainButtons);

    overlayEl.appendChild(panel);
    document.body.appendChild(overlayEl);
}

// Difficulty selection is handled automatically by the progressive levels system now!
// function showDifficulty(onStart) ...

function startAi(onStart, difficulty) {
    initAudio();
    clearOverlay();
    onStart('ai', difficulty);
}

function showHowTo(onStart) {
    clearOverlay();
    overlayEl = el('div', 'menu-overlay');
    const panel = el('div', 'menu-panel menu-howto');

    panel.appendChild(el('h2', 'menu-title', 'HOW TO PLAY'));

    const cols = el('div', 'howto-cols');

    // Player 1 controls
    const p1 = el('div', 'howto-col');
    p1.appendChild(el('h3', null, 'PLAYER 1'));
    p1.appendChild(el('p', null, 'Move: Arrow Keys'));
    p1.appendChild(el('p', null, 'Up = Jump, Down = Crouch'));
    p1.appendChild(el('p', null, 'Z = Punch  X = Kick'));
    p1.appendChild(el('p', null, 'C = Block'));
    p1.appendChild(el('p', null, 'V = Super (needs full meter)'));
    cols.appendChild(p1);

    // Player 2 controls
    const p2 = el('div', 'howto-col');
    p2.appendChild(el('h3', null, 'PLAYER 2'));
    p2.appendChild(el('p', null, 'Move: W A S D'));
    p2.appendChild(el('p', null, 'W = Jump, S = Crouch'));
    p2.appendChild(el('p', null, 'J = Punch  K = Kick'));
    p2.appendChild(el('p', null, 'L = Block'));
    p2.appendChild(el('p', null, 'U = Super (needs full meter)'));
    cols.appendChild(p2);

    panel.appendChild(cols);

    // Move list
    const moves = el('div', 'howto-moves');
    moves.appendChild(el('h3', null, 'SPECIAL MOVES (both players)'));
    moves.appendChild(el('p', null, 'Fireball: ↓ ↘ → + Punch'));
    moves.appendChild(el('p', null, 'Uppercut: ↓ ↙ ← + Kick'));
    moves.appendChild(el('p', null, 'Super: full meter + Super button'));
    moves.appendChild(el('p', null, 'Best of 3 rounds. First to 2 round wins takes the match!'));
    panel.appendChild(moves);

    panel.appendChild(makeButton('BACK', () => showMenu(onStart)));

    overlayEl.appendChild(panel);
    document.body.appendChild(overlayEl);
}
