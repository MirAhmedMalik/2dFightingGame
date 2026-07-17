import { initAudio, playUiSelect } from './sound.js';
import { CHARACTERS } from './characters.js';
import { renderFighter } from './FighterRenderer.js';
import Character from './Character.js';

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
    if (text) node.textContent = text;
    return node;
}

function makeButton(text, onClick) {
    const btn = el('button', 'menu-btn', text);
    btn.onclick = () => {
        playUiSelect();
        onClick();
    };
    return btn;
}

export function showMenu(onStart) {
    clearOverlay();

    overlayEl = el('div', 'menu-overlay');
    const panel = el('div', 'menu-panel');

    panel.appendChild(el('h1', 'menu-title', '2D FIGHTING GAME'));
    panel.appendChild(el('p', 'menu-subtitle', 'Choose a mode'));

    const mainButtons = el('div', 'menu-buttons');
    mainButtons.appendChild(makeButton('1 PLAYER vs AI', () => {
        initAudio();
        showCharacterSelect(1, (p1Def, p1Name) => {
            clearOverlay();
            onStart({
                mode: 'ai',
                difficulty: 'easy',
                p1Def, p1Name,
                p2Def: CHARACTERS[2], // GOLEM
                p2Name: 'BOSS'
            });
        });
    }));
    
    mainButtons.appendChild(makeButton('2 PLAYER LOCAL', () => {
        initAudio();
        showCharacterSelect(1, (p1Def, p1Name) => {
            showCharacterSelect(2, (p2Def, p2Name) => {
                clearOverlay();
                onStart({
                    mode: 'local',
                    difficulty: 'medium',
                    p1Def, p1Name,
                    p2Def, p2Name
                });
            });
        });
    }));
    
    mainButtons.appendChild(makeButton('HOW TO PLAY', () => showHowTo(onStart)));
    panel.appendChild(mainButtons);

    overlayEl.appendChild(panel);
    document.body.appendChild(overlayEl);
}

function showHowTo(onStart) {
    clearOverlay();
    overlayEl = el('div', 'menu-overlay');
    const panel = el('div', 'menu-panel menu-howto');

    panel.appendChild(el('h2', 'menu-title', 'HOW TO PLAY'));

    const cols = el('div', 'howto-cols');

    const p1 = el('div', 'howto-col');
    p1.appendChild(el('h3', 'howto-subtitle', 'PLAYER 1 (Left)'));
    p1.appendChild(el('p', null, 'W A S D to Move/Jump/Crouch'));
    p1.appendChild(el('p', null, 'T = Punch'));
    p1.appendChild(el('p', null, 'Y = Kick'));
    p1.appendChild(el('p', null, 'U = Block'));
    p1.appendChild(el('p', null, 'Space = Super'));
    cols.appendChild(p1);

    const p2 = el('div', 'howto-col');
    p2.appendChild(el('h3', 'howto-subtitle', 'PLAYER 2 (Right)'));
    p2.appendChild(el('p', null, 'Arrows to Move/Jump/Crouch'));
    p2.appendChild(el('p', null, 'NumPad 4 = Punch'));
    p2.appendChild(el('p', null, 'NumPad 5 = Kick'));
    p2.appendChild(el('p', null, 'NumPad 6 = Block'));
    p2.appendChild(el('p', null, 'NumPad 0 = Super'));
    cols.appendChild(p2);

    panel.appendChild(cols);

    const moves = el('div', 'howto-moves');
    moves.appendChild(el('h3', null, 'SPECIAL MOVES (both players)'));
    moves.appendChild(el('p', null, 'Signature Move inputs depend on your Fighter (e.g. ↓ ↘ → + Punch)'));
    moves.appendChild(el('p', null, 'Try linking Punch, Punch, Kick for a 3-hit combo!'));
    moves.appendChild(el('p', null, 'Super: full meter + Super button'));
    moves.appendChild(el('p', null, 'Best of 3 rounds. First to 2 round wins takes the match!'));
    panel.appendChild(moves);

    panel.appendChild(makeButton('BACK', () => showMenu(onStart)));

    overlayEl.appendChild(panel);
    document.body.appendChild(overlayEl);
}

// ---- Character Select UI ----
export function showCharacterSelect(playerNumber, onSelect) {
    clearOverlay();

    overlayEl = el('div', 'menu-overlay');
    const panel = el('div', 'menu-panel');
    panel.style.minWidth = '660px'; 

    const titlePrefix = playerNumber === 1 ? 'PLAYER 1' : 'PLAYER 2';
    panel.appendChild(el('h1', 'menu-title char-select-title', `${titlePrefix} SELECT`));
    
    // Player name input
    const input = el('input', null);
    input.id = 'player-name-input';
    input.placeholder = `ENTER NAME (e.g. ${titlePrefix})`;
    input.maxLength = 12;
    panel.appendChild(input);

    const grid = el('div', 'char-select-grid');
    
    let selectedIndex = 0;
    const cards = [];

    CHARACTERS.forEach((def, index) => {
        const card = el('div', 'char-card');
        if (index === selectedIndex) card.classList.add('selected');

        // Render portrait pseudo-character
        const canvas = el('canvas', 'char-portrait');
        canvas.width = 140;
        canvas.height = 140;
        const ctx = canvas.getContext('2d');
        
        // Mock fighter positioned in center of tiny portrait canvas
        const mockFighter = new Character(45, 90, 50, 90, '#fff', true);
        mockFighter.applyFighterDef(def);
        mockFighter.fsm.currentState = 'idle'; // force idle pose
        renderFighter(ctx, mockFighter);

        card.appendChild(canvas);
        card.appendChild(el('div', 'char-name', def.name));
        card.appendChild(el('div', 'char-tag', def.tagline));

        // Stats UI bars
        function stat(label, value, max) {
            const row = el('div', 'char-stat');
            row.appendChild(el('span', null, label));
            const bg = el('div', 'stat-bar-bg');
            const fill = el('div', 'stat-bar-fill');
            fill.style.width = `${(value / max) * 100}%`;
            bg.appendChild(fill);
            row.appendChild(bg);
            return row;
        }

        card.appendChild(stat('HEALTH', def.stats.maxHealth, 130));
        card.appendChild(stat('SPEED', def.stats.speed, 380));
        card.appendChild(stat('METER', def.stats.meterGain, 1.2));
        
        card.onclick = () => {
            if (selectedIndex === index) {
                // Confirm if clicked a second time, or just let them confirm via Enter.
                // Actually, let's just confirm on click.
                document.removeEventListener('keydown', handleKey);
                const chosenName = input.value.trim().toUpperCase() || titlePrefix;
                onSelect(CHARACTERS[index], chosenName);
            } else {
                selectedIndex = index;
                cards.forEach((c, i) => c.classList.toggle('selected', i === index));
                playUiSelect();
            }
        };

        cards.push(card);
        grid.appendChild(card);
    });

    panel.appendChild(grid);
    panel.appendChild(el('p', 'menu-subtitle', 'Press ENTER or Click character to confirm'));

    overlayEl.appendChild(panel);
    document.body.appendChild(overlayEl);

    // Keyboard navigation
    function handleKey(e) {
        if (e.repeat) return;
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            selectedIndex = (selectedIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
            cards.forEach((c, i) => c.classList.toggle('selected', i === selectedIndex));
            playUiSelect();
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
            selectedIndex = (selectedIndex + 1) % CHARACTERS.length;
            cards.forEach((c, i) => c.classList.toggle('selected', i === selectedIndex));
            playUiSelect();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            document.removeEventListener('keydown', handleKey);
            const chosenName = input.value.trim().toUpperCase() || titlePrefix;
            onSelect(CHARACTERS[selectedIndex], chosenName);
        }
    }
    
    document.addEventListener('keydown', handleKey);
    setTimeout(() => {
        if (input) input.focus();
    }, 10);
}
