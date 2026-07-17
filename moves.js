// Tekken-style move list — punches, kicks, specials with limb-based hitboxes

const makeMelee = (id, name, limb, opts) => ({
    id,
    name,
    type: 'melee',
    limb,
    startup: opts.startup,
    active: opts.active,
    recovery: opts.recovery,
    damage: opts.damage,
    hitboxOffset: opts.hitboxOffset,
    hitboxSize: opts.hitboxSize,
    knockback: opts.knockback ?? 1,
    invulnerableStartup: opts.invulnerableStartup ?? false,
    invulnFrames: opts.invulnFrames ?? 0
});

// ---- Standing punches ----
const jab = makeMelee('jab', 'Jab', 'hand', {
    startup: 4, active: 3, recovery: 6, damage: 5,
    hitboxOffset: { x: 42, y: -58 }, hitboxSize: { width: 22, height: 14 }
});

const cross = makeMelee('cross', 'Cross', 'hand', {
    startup: 7, active: 4, recovery: 12, damage: 10,
    hitboxOffset: { x: 48, y: -55 }, hitboxSize: { width: 28, height: 18 }
});

const hook = makeMelee('hook', 'Hook', 'hand', {
    startup: 8, active: 4, recovery: 14, damage: 12,
    hitboxOffset: { x: 38, y: -52 }, hitboxSize: { width: 30, height: 22 }
});

// ---- Kicks ----
const highKick = makeMelee('highKick', 'High Kick', 'foot', {
    startup: 9, active: 5, recovery: 16, damage: 14,
    hitboxOffset: { x: 50, y: -38 }, hitboxSize: { width: 36, height: 20 }
});

const lowKick = makeMelee('lowKick', 'Low Kick', 'foot', {
    startup: 6, active: 4, recovery: 12, damage: 8,
    hitboxOffset: { x: 44, y: -18 }, hitboxSize: { width: 32, height: 14 }
});

const jumpKick = makeMelee('jumpKick', 'Jump Kick', 'foot', {
    startup: 5, active: 6, recovery: 14, damage: 12,
    hitboxOffset: { x: 46, y: -42 }, hitboxSize: { width: 34, height: 18 }
});

const crouchPunch = makeMelee('crouchPunch', 'Body Blow', 'hand', {
    startup: 6, active: 4, recovery: 12, damage: 9,
    hitboxOffset: { x: 40, y: -42 }, hitboxSize: { width: 26, height: 16 }
});

// Legacy aliases for internal usage
const punchAttack = jab;
const kickAttack = highKick;

// ---------------------------------------------------------------
// Combo String — Punch → Punch → Kick  (Tekken 3-hit natural combo)
// Each hit has a unique ID so FighterRenderer can pose it differently.
// ---------------------------------------------------------------

// Hit 1: quick straight jab
const comboJab = makeMelee('comboJab', 'Combo Jab', 'hand', {
    startup: 4, active: 3, recovery: 10, damage: 6,
    hitboxOffset: { x: 44, y: -58 }, hitboxSize: { width: 24, height: 14 }
});

// Hit 2: body cross — slightly slower, body-level
const comboCross = makeMelee('comboCross', 'Combo Cross', 'hand', {
    startup: 6, active: 4, recovery: 12, damage: 10,
    hitboxOffset: { x: 48, y: -50 }, hitboxSize: { width: 30, height: 18 }
});

// Hit 3 (FINISHER): rising kick — bigger hitbox, launcher knockback
const comboKick = makeMelee('comboKick', 'Combo Kick', 'foot', {
    startup: 10, active: 6, recovery: 18, damage: 16,
    hitboxOffset: { x: 44, y: -62 }, hitboxSize: { width: 38, height: 26 },
    knockback: 1.3
});

// How long (seconds) after a combo hit fires that the next press is still valid
export const COMBO_LINK_WINDOW = 0.45;

/**
 * Returns the move for the given step in the 3-hit natural combo string.
 *   step 0 → comboJab   (first Punch)
 *   step 1 → comboCross (second Punch)
 *   step 2 → comboKick  (Kick finisher)
 */
export function pickComboMove(step) {
    if (step === 1) return comboCross;
    if (step === 2) return comboKick;
    return comboJab;
}

// ---- Special moves ----
const fireball = {
    id: 'fireball',
    name: 'Fireball',
    pattern: ['down', 'down-forward', 'forward', 'punch'],
    type: 'projectile',
    limb: 'hand',
    startup: 10,
    active: 6,
    recovery: 22,
    damage: 12,
    projectile: {
        speed: 540,
        size: { width: 26, height: 26 },
        offset: { x: 38, y: -52 },
        damage: 12,
        life: 2.2
    },
    invulnerableStartup: false
};

const uppercut = {
    id: 'uppercut',
    name: 'Dragon Uppercut',
    pattern: ['down', 'down-back', 'back', 'kick'],
    type: 'melee',
    limb: 'hand',
    startup: 7,
    active: 7,
    recovery: 26,
    damage: 20,
    hitboxOffset: { x: 20, y: -72 },
    hitboxSize: { width: 38, height: 58 },
    invulnerableStartup: true,
    invulnFrames: 8,
    knockback: 1.4
};

const spinningKick = {
    id: 'spinKick',
    name: 'Spinning Kick',
    pattern: ['forward', 'down', 'down-forward', 'kick'],
    type: 'melee',
    limb: 'foot',
    startup: 12,
    active: 8,
    recovery: 24,
    damage: 22,
    hitboxOffset: { x: 35, y: -48 },
    hitboxSize: { width: 55, height: 40 },
    invulnerableStartup: false
};

const bladeDash = {
    id: 'bladeDash',
    name: 'Blade Dash',
    pattern: ['down', 'down-back', 'back', 'punch'], // Quarter-circle back + punch
    type: 'melee',
    limb: 'hand',
    startup: 8,
    active: 14,
    recovery: 30,
    damage: 18,
    hitboxOffset: { x: 30, y: -55 },
    hitboxSize: { width: 60, height: 20 }, // horizontal piercing hitbox
    invulnerableStartup: false,
    dashForce: 600 // We can handle this velocity in Character.js or it just hits far
};

const flyingKnee = {
    id: 'flyingKnee',
    name: 'Flying Knee',
    pattern: ['down', 'down-forward', 'forward', 'kick'], // Quarter-circle forward + kick
    type: 'melee',
    limb: 'foot',
    startup: 6,
    active: 12,
    recovery: 22,
    damage: 16,
    hitboxOffset: { x: 25, y: -70 },
    hitboxSize: { width: 35, height: 50 },
    invulnerableStartup: true, // Beats attacks cleanly
    invulnFrames: 6
};

const superMove = {
    id: 'super',
    name: 'Rage Drive',
    type: 'melee',
    limb: 'both',
    startup: 12,
    active: 10,
    recovery: 32,
    damage: 38,
    hitboxOffset: { x: 30, y: -50 },
    hitboxSize: { width: 75, height: 55 },
    invulnerableStartup: true,
    invulnFrames: 12,
    knockback: 1.8
};

const earthquakeSmash = {
    id: 'earthquakeSmash',
    name: 'Earthquake Smash',
    pattern: ['down', 'down-back', 'back', 'punch'],
    type: 'melee',
    limb: 'hand',
    startup: 16, // Slow startup
    active: 8,
    recovery: 28,
    damage: 28,
    hitboxOffset: { x: 35, y: -20 },
    hitboxSize: { width: 45, height: 45 },
    invulnerableStartup: false,
    knockback: 1.6
};

const specialMoves = [fireball, uppercut, spinningKick, bladeDash, flyingKnee, earthquakeSmash];

// Context-based normal move selection
export function pickNormalMove(context) {
    const { onGround, crouching, button } = context;

    if (!onGround) {
        return button === 'punch' ? jumpKick : highKick;
    }
    if (crouching) {
        return button === 'punch' ? lowKick : crouchPunch;
    }
    if (button === 'punch') return jab;
    return highKick;
}

export {
    jab, cross, hook, highKick, lowKick, jumpKick, crouchPunch,
    comboJab, comboCross, comboKick,
    punchAttack, kickAttack, fireball, uppercut, spinningKick, bladeDash, flyingKnee, earthquakeSmash,
    superMove, specialMoves
};

export default {
    jab, cross, hook, highKick, lowKick, jumpKick, crouchPunch,
    comboJab, comboCross, comboKick,
    fireball, uppercut, spinningKick, bladeDash, flyingKnee, earthquakeSmash, superMove
};
