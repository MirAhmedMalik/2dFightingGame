import { fireball, uppercut } from './moves.js';
import { PLAYER2_KEYS } from './playerKeys.js';

// Distance (in pixels, center-to-center) at which the AI stops approaching
// and switches to its close-range attack decision tree. Kept small so the
// AI closes to within melee range (hitboxes only reach ~50px) before attacking.
const CLOSE_RANGE = 80;

// Difficulty presets. `reactionDelay` is the number of frames the AI waits
// between re-evaluating its decision (lower = faster/harder reactions).
// `weights` are the relative probabilities for the close-range choices.
// `jumpChance` / `specialChance` tune how often the AI mixes in those options.
const DIFFICULTY_PRESETS = {
    easy: {
        reactionDelay: 22,
        weights: { punch: 45, kick: 12, block: 18, special: 5 },
        jumpChance: 0.08,
        specialChance: 0.1,
        blockOnEnemyAttack: 0.15
    },
    medium: {
        reactionDelay: 12,
        weights: { punch: 35, kick: 25, block: 25, special: 15 },
        jumpChance: 0.16,
        specialChance: 0.25,
        blockOnEnemyAttack: 0.45
    },
    hard: {
        reactionDelay: 5,
        weights: { punch: 30, kick: 30, block: 20, special: 20 },
        jumpChance: 0.22,
        specialChance: 0.35,
        blockOnEnemyAttack: 0.80
    }
};

// Keys the AI "presses" to drive Player 2 (must match input.js mappings).
const KEY = PLAYER2_KEYS;

class AIController {
    constructor(character, opponent, difficulty = 'medium') {
        this.character = character;   // the AI-controlled fighter (Player 2)
        this.opponent = opponent;     // the human / other fighter (Player 1)
        this.keys = new Set();        // synthetic input set fed to character.update()

        this.setDifficulty(difficulty);

        this.frame = 0;
        this.reactionTimer = 0;       // counts down frames until next decision
        this.action = 'approach';     // current committed action
        this.actionFrames = 0;        // frames remaining for the current action

        this.wasHit = false;          // edge-detect for "just got hit"
        this.justHit = false;         // set true the frame the AI is hit
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.preset = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.medium;
    }

    // Center-to-center horizontal distance to the opponent.
    getDistance() {
        const cx = this.character.x + this.character.width / 2;
        const ox = this.opponent.x + this.opponent.width / 2;
        return Math.abs(cx - ox);
    }

    // True if the opponent is currently in the active/startup portion of an attack.
    opponentIsAttacking() {
        const o = this.opponent;
        if (!o.attackState || !o.attackData) return false;
        return o.attackFrame < (o.attackData.startup + o.attackData.active);
    }

    // Pick the next action based on distance and situation.
    decide(dist) {
        if (dist > CLOSE_RANGE) {
            // Far away: close the distance, occasionally jumping in.
            if (Math.random() < this.preset.jumpChance) {
                this.action = 'jumpApproach';
            } else {
                this.action = 'approach';
            }
            this.actionFrames = 10 + Math.floor(Math.random() * 20);
            return;
        }

        // Close: weighted random choice between attacks / block / special.
        this.action = this.chooseCloseAction(dist);
        this.actionFrames = 12 + Math.floor(Math.random() * 16);
    }

    chooseCloseAction(dist) {
        const w = { ...this.preset.weights };

        // If the AI was just hit, it becomes much more likely to block.
        if (this.justHit) {
            w.block += 45;
            this.justHit = false;
        }

        // If the opponent is attacking and is close, raise block probability
        // (scaled by difficulty so harder AIs react more reliably).
        if (this.opponentIsAttacking() && dist < CLOSE_RANGE) {
            w.block += Math.round(50 * this.preset.blockOnEnemyAttack);
        }

        // If the super meter is full, sometimes unleash the super.
        if (this.character.superMeter >= 100 && Math.random() < 0.35) {
            return 'super';
        }

        // Weighted random pick.
        const total = w.punch + w.kick + w.block + w.special;
        let r = Math.random() * total;
        if ((r -= w.punch) < 0) return 'punch';
        if ((r -= w.kick) < 0) return 'kick';
        if ((r -= w.block) < 0) return 'block';
        return 'special';
    }

    // Execute the currently committed action for this frame by populating
    // `this.keys` (and occasionally triggering special/super moves directly).
    execute(dist) {
        this.actionFrames--;

        const toward = this.opponent.x > this.character.x ? KEY.right : KEY.left;

        switch (this.action) {
            case 'approach':
                this.keys.add(toward);
                break;

            case 'jumpApproach':
                this.keys.add(toward);
                if (this.character.onGround) this.keys.add(KEY.up);
                break;

            case 'punch':
                this.keys.add(KEY.punch);
                break;

            case 'kick':
                this.keys.add(KEY.kick);
                break;

            case 'block':
                this.keys.add(KEY.block);
                break;

            case 'special': {
                const canAct = this.character.onGround &&
                    ['idle', 'walking', 'crouching'].includes(this.character.fsm.currentState);
                if (canAct && Math.random() < this.preset.specialChance + 0.4) {
                    const move = Math.random() < 0.5 ? fireball : uppercut;
                    this.character.startSpecialMove(move);
                }
                break;
            }

            case 'super': {
                const canAct = this.character.onGround &&
                    ['idle', 'walking', 'crouching'].includes(this.character.fsm.currentState);
                if (canAct && this.character.superMeter >= 100) {
                    this.character.startSuper();
                }
                break;
            }
        }
    }

    // Called once per frame from the game loop. Returns the synthetic key set
    // to feed into the AI character's update().
    update(dt) {
        this.frame++;
        this.keys.clear();

        // Edge-detect being hit so the next decision boosts blocking.
        if (this.character.isHit && !this.wasHit) {
            this.justHit = true;
        }
        this.wasHit = this.character.isHit;

        const dist = this.getDistance();

        // Reaction delay: only re-decide when the timer elapses. A lower
        // reactionDelay means the AI re-evaluates more often (harder).
        this.reactionTimer -= 1;
        if (this.reactionTimer <= 0) {
            this.decide(dist);
            this.reactionTimer = this.preset.reactionDelay;
        }

        this.execute(dist);
        return this.keys;
    }
}

export default AIController;
export { DIFFICULTY_PRESETS };
