// Per-player control bindings

export const PLAYER1_KEYS = {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    up: 'ArrowUp',
    down: 'ArrowDown',
    punch: 'z',
    kick: 'x',
    block: 'c',
    super: 'v'
};

export const PLAYER2_KEYS = {
    left: 'a',
    right: 'd',
    up: 'w',
    down: 's',
    punch: 'j',
    kick: 'k',
    block: 'l',
    super: 'u'
};

export function getKeyMap(isPlayer1) {
    return isPlayer1 ? PLAYER1_KEYS : PLAYER2_KEYS;
}

export function allGameKeys(isPlayer1) {
    const km = getKeyMap(isPlayer1);
    return Object.values(km);
}
