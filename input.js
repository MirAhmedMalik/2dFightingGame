import { PLAYER1_KEYS, PLAYER2_KEYS } from './playerKeys.js';

const player1Keys = new Set();
const player2Keys = new Set();
const prevPlayer1Keys = new Set();
const prevPlayer2Keys = new Set();

const p1Vals = Object.values(PLAYER1_KEYS);
const p2Vals = Object.values(PLAYER2_KEYS);

// Keydown handler
document.addEventListener('keydown', (e) => {
    // Standardize input for letter keys
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    let handled = false;
    if (p1Vals.includes(key)) {
        player1Keys.add(key);
        handled = true;
    } else if (p2Vals.includes(key)) {
        player2Keys.add(key);
        handled = true;
    }
    
    // Prevent scrolling for game controls (like Arrows, Spacebar, etc)
    if (handled && (e.key.startsWith('Arrow') || e.key === ' ')) {
        e.preventDefault();
    }
});

// Keyup handler
document.addEventListener('keyup', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    
    if (p1Vals.includes(key)) {
        player1Keys.delete(key);
    } else if (p2Vals.includes(key)) {
        player2Keys.delete(key);
    }
});

// ---- Input buffering for special move detection ----

export const MAX_BUFFER_SIZE = 20; // rolling window of the last 20 frames
export const MATCH_WINDOW = 15;    // pattern must complete within ~15 frames

// Per-player rolling input buffers (one token per frame, oldest dropped)
export const player1Buffer = [];
export const player2Buffer = [];

// Map currently held keys to a facing-relative directional token.
// "forward"/"back" are computed relative to the character's current facing,
// so the same pattern works regardless of which way the character faces.
function getDirectionalToken(keys, isPlayer1, facing) {
    const bindings = isPlayer1 ? PLAYER1_KEYS : PLAYER2_KEYS;

    const pressLeft = keys.has(bindings.left);
    const pressRight = keys.has(bindings.right);
    const pressUp = keys.has(bindings.up);
    const pressDown = keys.has(bindings.down);

    // forward/back are relative to facing
    const forward = facing === 'right' ? pressRight : pressLeft;
    const back = facing === 'right' ? pressLeft : pressRight;

    let h = 0; // -1 back, +1 forward
    if (forward) h = 1;
    else if (back) h = -1;

    let v = 0; // -1 up, +1 down
    if (pressDown) v = 1;
    else if (pressUp) v = -1;

    if (h === 0 && v === 0) return null;

    const hName = h === 1 ? 'forward' : (h === -1 ? 'back' : '');
    const vName = v === 1 ? 'down' : (v === -1 ? 'up' : '');

    if (h !== 0 && v !== 0) return `${vName}-${hName}`; // e.g. down-forward
    if (h !== 0) return hName;                          // forward / back
    return vName;                                       // up / down
}

// Detect a freshly pressed attack button (edge detection) so the buffer
// records the button only on the frame it is first pressed.
function getButtonToken(keys, isPlayer1, prevKeys) {
    const bindings = isPlayer1 ? PLAYER1_KEYS : PLAYER2_KEYS;
    if (keys.has(bindings.punch) && !prevKeys.has(bindings.punch)) return 'punch';
    if (keys.has(bindings.kick) && !prevKeys.has(bindings.kick)) return 'kick';
    return null;
}

// Sample the current input for one player and push a single token into the
// rolling buffer. Called once per frame from Character.update().
export function updateBuffer(playerNum, keys, facing) {
    const isP1 = playerNum === 1;
    const prevKeys = isP1 ? prevPlayer1Keys : prevPlayer2Keys;
    const buffer = isP1 ? player1Buffer : player2Buffer;

    const btn = getButtonToken(keys, isP1, prevKeys);
    const token = btn || getDirectionalToken(keys, isP1, facing) || '';

    buffer.push(token);
    if (buffer.length > MAX_BUFFER_SIZE) buffer.shift();

    // Snapshot current keys for next-frame edge detection
    prevKeys.clear();
    keys.forEach((k) => prevKeys.add(k));
}

// Check whether `pattern` appears as an ordered subsequence inside `buffer`
// (empty tokens are ignored), and that the whole match completes within
// `window` frames of the first matched token.
export function matchSpecialMove(buffer, pattern, window = MATCH_WINDOW) {
    let pIndex = 0;
    let firstMatch = -1;
    let lastMatch = -1;

    for (let i = 0; i < buffer.length && pIndex < pattern.length; i++) {
        const token = buffer[i];
        if (token === '' || token === null) continue;
        if (token === pattern[pIndex]) {
            if (firstMatch === -1) firstMatch = i;
            lastMatch = i;
            pIndex++;
        }
    }

    if (pIndex < pattern.length) return false;
    return (lastMatch - firstMatch) <= window;
}

export { player1Keys, player2Keys };
