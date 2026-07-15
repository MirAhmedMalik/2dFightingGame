import FiniteStateMachine from './stateMachine.js';
import { rectsOverlap } from './collision.js';
import { punchAttack, kickAttack, specialMoves, superMove, pickNormalMove } from './moves.js';
import { player1Buffer, player2Buffer, updateBuffer, matchSpecialMove } from './input.js';
import { PLAYER1_KEYS, PLAYER2_KEYS } from './playerKeys.js';
import { renderFighter } from './FighterRenderer.js';
import { playSwoosh } from './sound.js';

const GRAVITY = 2000; // pixels per second squared
const JUMP_FORCE = -800;
const MOVE_SPEED = 300;
const GROUND_Y = 270; // ground line position (from style.css)

class Character {
    constructor(x, y, width, height, color, isPlayer1 = true) {
        this.x = x;
        this.y = y;
        this.velocity = { x: 0, y: 0 };
        this.width = width;
        this.height = height;
        this.color = color;
        this.facing = isPlayer1 ? 'right' : 'left';
        this.onGround = true;
        this.isCrouching = false;
        this.isPlayer1 = isPlayer1;
        this.bindings = isPlayer1 ? PLAYER1_KEYS : PLAYER2_KEYS;
        this.monsterLevel = 0; // 0=normal, 1=monster (round 2), 2=supermonster (round 3)

        // Health and hitstun
        this.health = 100;
        this.maxHealth = 100;
        this.hitstunFrames = 0;
        this.hitstunTimer = 0;
        this.hitFlashTimer = 0;
        this.isHit = false;

        // Blocking state
        this.blocking = false;
        this.blockstunTimer = 0;

        // Combo tracking
        this.comboCounter = 0;
        this.comboDamage = 0;
        this.lastAttacker = null;
        this.comboDisplayTimer = 0;

        // Knockdown state
        this.knockdownTimer = 0;
        this.isKnockdown = false;

        // Attack state
        this.attackState = null; // 'light' or 'heavy' or 'special'
        this.attackFrame = 0;
        this.attackData = null;
        this.hitbox = null;
        this.hasHitThisAttack = false; // Track if this attack already hit

        // Special / super move state
        this.specialMoveData = null;
        this.specialMoveName = null;
        this.isSuperMove = false;
        this.projectileSpawned = false;
        this.swooshPlayed = false;
        this.isInvulnerable = false;
        this.projectiles = []; // active projectiles fired by this character

        // Super meter (0-100)
        this.superMeter = 0;

        // Input buffer reference (shared with input.js)
        this.buffer = isPlayer1 ? player1Buffer : player2Buffer;
        this.prevSuperKey = false;

        // On-screen effect state
        this.flashText = '';
        this.flashTimer = 0;
        this.superFlashTimer = 0;

        // Hurtbox (matches character body bounds)
        this.hurtbox = { x: 0, y: 0, width: this.width, height: this.height };

        const self = this;

        this.fsm = new FiniteStateMachine({
            idle: {
                onUpdate: (dt) => {
                    self.velocity.x = 0;
                    if (self.keys.has(self.bindings.left) || self.keys.has(self.bindings.right)) {
                        self.fsm.transition('walking');
                    } else if (self.keys.has(self.bindings.up) && self.onGround) {
                        self.fsm.transition('jumping');
                    } else if (self.keys.has(self.bindings.down)) {
                        self.fsm.transition('crouching');
                    } else if (self.tryInitiateAttack()) {
                        // special / super / normal attack initiated
                    } else if (self.keys.has(self.bindings.block)) {
                        self.fsm.transition('blocking');
                    }
                },
                allowedTransitions: ['walking', 'jumping', 'crouching', 'attacking', 'blocking', 'specialAttack']
            },
            walking: {
                onUpdate: (dt) => {
                    if (self.keys.has(self.bindings.left)) {
                        self.velocity.x = -MOVE_SPEED;
                    } else if (self.keys.has(self.bindings.right)) {
                        self.velocity.x = MOVE_SPEED;
                    } else {
                        self.fsm.transition('idle');
                        return;
                    }

                    if (self.keys.has(self.bindings.up) && self.onGround) {
                        self.fsm.transition('jumping');
                    } else if (self.keys.has(self.bindings.down)) {
                        self.fsm.transition('crouching');
                    } else if (self.tryInitiateAttack()) {
                        // special / super / normal attack initiated
                    } else if (self.keys.has(self.bindings.block)) {
                        self.fsm.transition('blocking');
                    }
                },
                onExit: () => {
                    self.velocity.x = 0;
                },
                allowedTransitions: ['idle', 'jumping', 'crouching', 'attacking', 'blocking', 'specialAttack']
            },
            jumping: {
                onEnter: () => {
                    self.velocity.y = JUMP_FORCE;
                    self.onGround = false;
                },
                onUpdate: (dt) => {
                    // Air control
                    if (self.keys.has(self.bindings.left)) {
                        self.velocity.x = -MOVE_SPEED * 0.7;
                    } else if (self.keys.has(self.bindings.right)) {
                        self.velocity.x = MOVE_SPEED * 0.7;
                    } else {
                        self.velocity.x = 0;
                    }

                    if (self.onGround) {
                        if (self.keys.has(self.bindings.left) || self.keys.has(self.bindings.right)) {
                            self.fsm.transition('walking');
                        } else if (self.keys.has(self.bindings.down)) {
                            self.fsm.transition('crouching');
                        } else {
                            self.fsm.transition('idle');
                        }
                    }
                },
                allowedTransitions: ['idle', 'walking', 'crouching']
            },
            crouching: {
                onEnter: () => {
                    self.isCrouching = true;
                    self.velocity.x = 0;
                },
                onUpdate: (dt) => {
                    if (!(self.keys.has(self.bindings.down))) {
                        self.fsm.transition('idle');
                    } else if (self.tryInitiateAttack()) {
                        // special / super / normal attack initiated
                    } else if (self.keys.has(self.bindings.block)) {
                        self.fsm.transition('blocking');
                    }
                },
                onExit: () => {
                    self.isCrouching = false;
                },
                allowedTransitions: ['idle', 'walking', 'jumping', 'blocking', 'attacking', 'specialAttack']
            },
            blocking: {
                onEnter: () => {
                    self.blocking = true;
                    self.velocity.x = 0;
                },
                onUpdate: (dt) => {
                    // Stay in block if key held, else return to idle
                    if (!self.keys.has(self.bindings.block)) {
                        self.fsm.transition('idle');
                    }
                },
                onExit: () => {
                    self.blocking = false;
                },
                allowedTransitions: ['idle', 'walking', 'jumping', 'crouching', 'blockstun']
            },
            attacking: {
                onEnter: () => {
                    self.velocity.x = 0;
                },
                onUpdate: (dt) => {
                    self.updateAttack(dt);
                },
                onExit: () => {
                    self.resetAttackState();
                },
                allowedTransitions: ['idle', 'walking', 'jumping', 'crouching', 'hitstun', 'blockstun', 'knockdown', 'specialAttack']
            },
            specialAttack: {
                onEnter: () => {
                    self.velocity.x = 0;
                },
                onUpdate: (dt) => {
                    self.updateAttack(dt);
                },
                onExit: () => {
                    self.resetAttackState();
                },
                allowedTransitions: ['idle', 'walking', 'jumping', 'crouching', 'hitstun', 'blockstun', 'knockdown']
            },
            hitstun: {
                onEnter: () => {
                    self.velocity.x = 0;
                    self.velocity.y = 0;
                },
                onUpdate: (dt) => {
                    self.hitstunTimer -= dt * 60; // Convert to frames
                    self.hitFlashTimer -= dt;

                    if (self.hitFlashTimer <= 0) {
                        self.isHit = false;
                    }

                    if (self.hitstunTimer <= 0) {
                        if (self.onGround) {
                            if (self.keys.has(self.bindings.left) || self.keys.has(self.bindings.right)) {
                                self.fsm.transition('walking');
                            } else {
                                self.fsm.transition('idle');
                            }
                        } else {
                            self.fsm.transition('jumping');
                        }
                    }
                },
                allowedTransitions: ['idle', 'walking', 'jumping', 'crouching', 'hitstun', 'knockdown']
            },
            blockstun: {
                onEnter: () => {
                    self.velocity.x = 0;
                    self.velocity.y = 0;
                },
                onUpdate: (dt) => {
                    self.blockstunTimer -= dt * 60; // Convert to frames
                    if (self.blockstunTimer <= 0) {
                        self.fsm.transition('idle');
                    }
                },
                allowedTransitions: ['idle', 'walking', 'jumping', 'crouching', 'hitstun', 'knockdown']
            },
            knockdown: {
                onEnter: () => {
                    self.isKnockdown = true;
                    self.knockdownTimer = 40; // ~40 frames
                    self.velocity.x = 0;
                    self.velocity.y = 0;
                },
                onUpdate: (dt) => {
                    self.knockdownTimer -= dt * 60;
                    if (self.knockdownTimer <= 0) {
                        self.isKnockdown = false;
                        self.fsm.transition('idle');
                    }
                },
                allowedTransitions: ['idle', 'walking', 'jumping', 'crouching']
            }
        }, 'idle');
    }

    attack(type) {
        // Can only attack from idle, walking, jumping, or crouching
        const allowedStates = ['idle', 'walking', 'jumping', 'crouching'];
        if (!allowedStates.includes(this.fsm.currentState)) {
            return;
        }

        this.attackState = type;
        this.attackFrame = 0;
        this.attackData = pickNormalMove({
            onGround: this.onGround,
            crouching: this.isCrouching,
            button: type
        });
        this.hasHitThisAttack = false;
        this.swooshPlayed = false;
        this.fsm.transition('attacking');
    }

    // Decide whether to start a super, special, or normal attack based on
    // current input. Returns true if an attack was initiated.
    tryInitiateAttack() {
        const punchKey = this.bindings.punch;
        const kickKey = this.bindings.kick;
        const superKey = this.bindings.super;

        // Super move (edge-triggered, requires full meter)
        const superPressed = this.keys.has(superKey) && !this.prevSuperKey;
        this.prevSuperKey = this.keys.has(superKey);
        if (superPressed && this.superMeter >= 100) {
            this.startSuper();
            return true;
        }

        // Normal / special attack
        if (this.keys.has(punchKey) || this.keys.has(kickKey)) {
            if (this.trySpecialMove()) return true;
            const attackType = this.keys.has(punchKey) ? 'punch' : 'kick';
            this.attack(attackType);
            return true;
        }
        return false;
    }

    // Check buffered inputs against known special-move patterns.
    trySpecialMove() {
        const allowedStates = ['idle', 'walking', 'crouching', 'jumping'];
        if (!allowedStates.includes(this.fsm.currentState)) return false;

        for (const move of specialMoves) {
            if (matchSpecialMove(this.buffer, move.pattern)) {
                this.startSpecialMove(move);
                return true;
            }
        }
        return false;
    }

    startSpecialMove(move) {
        const allowedStates = ['idle', 'walking', 'crouching', 'jumping'];
        if (!allowedStates.includes(this.fsm.currentState)) return;

        this.attackState = 'special';
        this.attackFrame = 0;
        this.attackData = move;
        this.specialMoveData = move;
        this.specialMoveName = move.name;
        this.isSuperMove = false;
        this.hasHitThisAttack = false;
        this.projectileSpawned = false;
        this.swooshPlayed = false;
        this.isInvulnerable = false;
        this.buffer.length = 0; // clear so the motion can't re-trigger
        this.fsm.transition('specialAttack');
    }

    startSuper() {
        const allowedStates = ['idle', 'walking', 'crouching', 'jumping'];
        if (!allowedStates.includes(this.fsm.currentState)) return;

        this.attackState = 'special';
        this.attackFrame = 0;
        this.attackData = superMove;
        this.specialMoveData = superMove;
        this.specialMoveName = 'Super';
        this.isSuperMove = true;
        this.hasHitThisAttack = false;
        this.projectileSpawned = false;
        this.swooshPlayed = false;
        this.isInvulnerable = false;
        this.superMeter = 0; // consume all meter
        this.superFlashTimer = 0.4; // dramatic screen flash
        this.buffer.length = 0;
        this.fsm.transition('specialAttack');
    }

    spawnProjectile() {
        const data = this.attackData.projectile;
        const dir = this.facing === 'right' ? 1 : -1;
        const feetY = this.y + this.height;
        const offsetX = this.facing === 'right'
            ? data.offset.x
            : -data.offset.x - data.size.width;

        this.projectiles.push({
            x: this.x + this.width / 2 + offsetX,
            y: feetY + data.offset.y,
            width: data.size.width,
            height: data.size.height,
            vx: data.speed * dir,
            damage: data.damage,
            life: data.life,
            hit: false
        });
    }

    // Move projectiles, resolve collisions with the opponent, grant meter.
    updateProjectiles(dt, opponent) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.life -= dt;

            if (!p.hit && opponent && !opponent.isInvulnerable &&
                rectsOverlap(p, opponent.getHurtbox())) {
                opponent.takeHit(p.damage, p.vx > 0 ? 1 : -1, this, false);
                this.superMeter = Math.min(100, this.superMeter + 5); // landed a hit
                this.flashText = 'SPECIAL!';
                this.flashTimer = 1.0;
                this.projectiles.splice(i, 1);
                continue;
            }

            if (p.life <= 0 || p.x < -100 || p.x > 1060) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    resetAttackState() {
        this.attackState = null;
        this.attackFrame = 0;
        this.attackData = null;
        this.specialMoveData = null;
        this.specialMoveName = null;
        this.isSuperMove = false;
        this.hitbox = null;
        this.hasHitThisAttack = false;
        this.projectileSpawned = false;
        this.swooshPlayed = false;
        this.isInvulnerable = false;
    }

    updateAttack(dt) {
        if (!this.attackData) return;
        
        if (!this.swooshPlayed && this.attackData.type === 'melee') {
            playSwoosh(this.attackState === 'kick' || this.attackState === 'heavy');
            this.swooshPlayed = true;
        }

        const frameTime = 1 / 60; // 60 FPS
        this.attackFrame += dt / frameTime;

        const { startup, active, recovery } = this.attackData;
        const totalFrames = startup + active + recovery;

        // Brief invulnerability during startup (uppercut / super)
        if (this.attackData.invulnerableStartup) {
            const invuln = this.attackData.invulnFrames || startup;
            this.isInvulnerable = this.attackFrame <= invuln;
        } else {
            this.isInvulnerable = false;
        }

        if (this.attackData.type === 'projectile') {
            // Fire projectile once during the active window
            if (this.attackFrame > startup && this.attackFrame <= startup + active) {
                if (!this.projectileSpawned) {
                    this.spawnProjectile();
                    this.projectileSpawned = true;
                }
            }
            this.hitbox = null;
        } else {
            // Melee: spawn hitbox during active frames
            if (this.attackFrame > startup && this.attackFrame <= startup + active) {
                this.spawnHitbox();
            } else {
                this.hitbox = null;
            }
        }

        // Check if attack is done
        if (this.attackFrame >= totalFrames) {
            if (this.onGround) {
                if (this.keys.has(this.bindings.left) || this.keys.has(this.bindings.right)) {
                    this.fsm.transition('walking');
                } else {
                    this.fsm.transition('idle');
                }
            } else {
                this.fsm.transition('jumping');
            }
        }
    }

    spawnHitbox() {
        const { hitboxOffset, hitboxSize } = this.attackData;
        // Offsets in moves.js are measured UP from the feet (y+height), not from top-left.
        // Negative y = upward from ground level.
        const feetX = this.x + this.width / 2;
        const feetY = this.y + this.height;
        const offsetX = this.facing === 'right'
            ? hitboxOffset.x
            : -hitboxOffset.x - hitboxSize.width;

        this.hitbox = {
            x: feetX + offsetX - this.width / 2,
            y: feetY + hitboxOffset.y,
            width: hitboxSize.width,
            height: hitboxSize.height
        };
    }

    getHurtbox() {
        // The procedural humanoid renderer is ~90px tall standing, ~55px crouching.
        // Expand hurtbox to cover the actual visual body from feet upward.
        const feetY = this.y + this.height;
        const bodyH = this.isCrouching ? 55 : 90;
        return {
            x: this.x - 8,
            y: feetY - bodyH,
            width: this.width + 16,
            height: bodyH
        };
    }

    takeHit(damage, knockbackDirection, attacker = null, isHeavy = false) {
        // If already in knockdown, ignore further hits (invulnerable)
        if (this.fsm.currentState === 'knockdown') return;
        // Invulnerable during special-move startup (e.g. uppercut / super)
        if (this.isInvulnerable) return;

        // Build super meter: +2 when taking a hit
        this.superMeter = Math.min(100, this.superMeter + 2);

        // Blocking: reduce damage to 10% and apply minimal knockback (blockstun)
        if (this.blocking && this.fsm.currentState === 'blocking') {
            const blockedDamage = damage * 0.1;
            this.health = Math.max(0, this.health - blockedDamage);
            this.blockstunTimer = 8; // Short blockstun (~8 frames)
            this.hitFlashTimer = 0.05;
            this.isHit = true;

            // Minimal knockback
            this.velocity.x = knockbackDirection * 50;
            this.velocity.y = 0;

            this.fsm.transition('blockstun');
            return;
        }

        // Already in hitstun from this attacker -> combo continues
        const inCombo = (this.fsm.currentState === 'hitstun' || this.fsm.currentState === 'blockstun') && this.lastAttacker === attacker;

        if (inCombo) {
            this.comboCounter++;
        } else {
            // New combo: reset counter and damage
            this.comboCounter = 1;
            this.comboDamage = 0;
        }

        this.lastAttacker = attacker;

        // Damage scaling: each hit after the 1st deals (damage * 0.85^comboCount)
        const scaledDamage = damage * Math.pow(0.85, this.comboCounter - 1);
        this.comboDamage += scaledDamage;

        this.health = Math.max(0, this.health - scaledDamage);
        this.hitstunFrames = scaledDamage * 2; // hitstun frames = damage * 2
        this.hitstunTimer = this.hitstunFrames;
        this.hitFlashTimer = 0.1; // Flash for 100ms
        this.isHit = true;

        // Apply knockback impulse (physics will resolve over following frames)
        const knockbackForce = 300;
        this.velocity.x = knockbackDirection * knockbackForce;
        this.velocity.y = -200; // Small upward pop

        // Knockdown check: cumulative combo damage > 25 OR heavy attack as finisher
        if (this.comboDamage >= 25 || (isHeavy && this.comboCounter >= 2)) {
            if (this.fsm.currentState !== 'knockdown') {
                this.fsm.transition('knockdown');
            }
        } else {
            if (this.fsm.currentState !== 'hitstun') {
                this.fsm.transition('hitstun');
            } else {
                // Already in hitstun (combo) - refresh timer, keep knockback velocity
                this.hitstunTimer = this.hitstunFrames;
            }
        }
    }

    update(deltaTime, keys) {
        this.keys = keys;

        // Sample input into the rolling buffer (one token per frame)
        updateBuffer(this.isPlayer1 ? 1 : 2, this.keys, this.facing);

        // Tick down on-screen effect timers
        if (this.flashTimer > 0) this.flashTimer -= deltaTime;
        if (this.superFlashTimer > 0) this.superFlashTimer -= deltaTime;

        // Apply gravity
        this.velocity.y += GRAVITY * deltaTime;

        // Apply friction to horizontal velocity (for natural knockback decay)
        if (this.fsm.currentState === 'hitstun' || this.fsm.currentState === 'blockstun' || this.fsm.currentState === 'knockdown') {
            this.velocity.x *= 0.9; // Friction decay
        }

        // Update FSM (handles input and state transitions)
        this.fsm.update(deltaTime);

        // Apply velocity to position
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;

        // Ground collision
        const floorY = GROUND_Y - this.height;
        if (this.y >= floorY) {
            this.y = floorY;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // Boundary checks
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > 960) this.x = 960 - this.width;
    }

    render(context) {
        renderFighter(context, this);
    }
}

export default Character;
