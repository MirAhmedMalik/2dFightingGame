// Procedural humanoid fighter renderer — articulated limbs, Tekken-style poses.
// Supports monsterLevel: 0 = normal fighter, 1 = monster, 2 = super-monster (demon)

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function drawLimb(ctx, x1, y1, x2, y2, thickness, color, outline) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * thickness * 0.5;
    const ny = dx / len * thickness * 0.5;

    ctx.fillStyle = color;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1 + nx, y1 + ny);
    ctx.lineTo(x2 + nx, y2 + ny);
    ctx.lineTo(x2 - nx, y2 - ny);
    ctx.lineTo(x1 - nx, y1 - ny);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawJoint(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

function drawHead(ctx, x, y, r, skin, hair, facing, monsterLevel) {
    // Skull
    const headScale = monsterLevel === 2 ? 1.3 : (monsterLevel === 1 ? 1.15 : 1.0);
    const hr = r * headScale;

    ctx.fillStyle = skin;
    ctx.strokeStyle = '#1a0a0a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, hr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hair / horns
    if (monsterLevel === 2) {
        // Devil horns
        ctx.fillStyle = '#8b0000';
        ctx.beginPath();
        ctx.moveTo(x - hr * 0.5, y - hr * 0.7);
        ctx.lineTo(x - hr * 0.3, y - hr * 1.6);
        ctx.lineTo(x, y - hr * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + hr * 0.5, y - hr * 0.7);
        ctx.lineTo(x + hr * 0.3, y - hr * 1.6);
        ctx.lineTo(x, y - hr * 0.9);
        ctx.closePath();
        ctx.fill();
    } else if (monsterLevel === 1) {
        // Spiky monster hair
        ctx.fillStyle = hair;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(x + i * hr * 0.35 - hr * 0.2, y - hr * 0.6);
            ctx.lineTo(x + i * hr * 0.35, y - hr * 1.5);
            ctx.lineTo(x + i * hr * 0.35 + hr * 0.2, y - hr * 0.6);
            ctx.closePath();
            ctx.fill();
        }
    } else {
        // Normal hair
        ctx.fillStyle = hair;
        ctx.beginPath();
        ctx.arc(x, y - hr * 0.15, hr * 1.05, Math.PI, Math.PI * 2);
        ctx.fill();
    }

    // Eyes
    const eyeX = facing * 4;
    if (monsterLevel === 2) {
        // Glowing red demon eyes
        ctx.fillStyle = '#ff3300';
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(x + eyeX - 4, y - 2, 3, 2, 0, 0, Math.PI * 2);
        ctx.ellipse(x + eyeX + 4, y - 2, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    } else if (monsterLevel === 1) {
        // Glowing yellow monster eyes
        ctx.fillStyle = '#aaff00';
        ctx.shadowColor = '#aaff00';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(x + eyeX - 3, y - 1, 2.5, 0, Math.PI * 2);
        ctx.arc(x + eyeX + 3, y - 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    } else {
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(x + eyeX - 3, y - 1, 2, 0, Math.PI * 2);
        ctx.arc(x + eyeX + 3, y - 1, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function getWalkPhase(fighter) {
    return (performance.now() / 1000) * 14 + (fighter.isPlayer1 ? 0 : Math.PI);
}

function activePhase(fighter) {
    if (!fighter.attackData) return 0;
    const { startup, active, recovery } = fighter.attackData;
    const f = fighter.attackFrame;
    if (f <= startup) return f / Math.max(startup, 1);
    if (f <= startup + active) return 1;
    return 1 - (f - startup - active) / Math.max(recovery, 1);
}

function buildPose(fighter) {
    const state = fighter.fsm.currentState;
    const moveId = fighter.attackData?.id || '';
    const walk = getWalkPhase(fighter);
    const swing = Math.sin(walk) * 0.55;
    const ext = activePhase(fighter);

    const pose = {
        bodyY: 0,
        bodyLean: 0,
        lUpperArm: 0.3,
        lForeArm: 0.4,
        rUpperArm: -0.3,
        rForeArm: -0.4,
        lUpperLeg: 0.05,
        lLowerLeg: 0.1,
        rUpperLeg: -0.05,
        rLowerLeg: -0.1,
        airborne: false,
        knockedDown: false
    };

    if (state === 'knockdown') {
        pose.knockedDown = true;
        return pose;
    }

    if (state === 'crouching' || fighter.isCrouching) {
        pose.bodyY = 18;
    }

    if (state === 'jumping' || !fighter.onGround) {
        pose.airborne = true;
        pose.lUpperLeg = -0.7;
        pose.lLowerLeg = 0.9;
        pose.rUpperLeg = -0.5;
        pose.rLowerLeg = 0.7;
        pose.lUpperArm = -0.8;
        pose.rUpperArm = -0.8;
    }

    if (state === 'walking') {
        pose.lUpperLeg = swing;
        pose.lLowerLeg = -swing * 0.6;
        pose.rUpperLeg = -swing;
        pose.rLowerLeg = swing * 0.6;
        pose.lUpperArm = -swing * 0.5;
        pose.rUpperArm = swing * 0.5;
    }

    if (state === 'blocking') {
        pose.lUpperArm = -1.4;
        pose.lForeArm = -1.2;
        pose.rUpperArm = -1.4;
        pose.rForeArm = -1.2;
        pose.bodyY = 8;
    }

    if (state === 'hitstun' || state === 'blockstun') {
        pose.bodyLean = -0.25;
        pose.lUpperArm = -0.5;
        pose.rUpperArm = 0.8;
    }

    if (fighter.attackState && fighter.attackData) {
        switch (moveId) {
            case 'jab':
                pose.rUpperArm = lerp(-0.2, -1.55, ext);
                pose.rForeArm = lerp(-0.3, -0.2, ext);
                break;
            case 'cross':
                pose.bodyLean = ext * 0.15;
                pose.rUpperArm = lerp(-0.2, -1.7, ext);
                pose.rForeArm = lerp(-0.3, 0.1, ext);
                pose.lUpperArm = lerp(0.3, 0.8, ext);
                break;
            case 'hook':
                pose.lUpperArm = lerp(0.3, -1.3, ext);
                pose.lForeArm = lerp(0.4, -0.8, ext);
                break;
            case 'highKick':
                pose.rUpperLeg = lerp(-0.05, -1.6, ext);
                pose.rLowerLeg = lerp(-0.1, 0.3, ext);
                pose.lUpperArm = -0.6;
                pose.rUpperArm = 0.5;
                break;
            case 'lowKick':
                pose.bodyY = 12;
                pose.rUpperLeg = lerp(0.2, 1.2, ext);
                pose.rLowerLeg = lerp(0.1, -0.4, ext);
                break;
            case 'jumpKick':
                pose.airborne = true;
                pose.rUpperLeg = lerp(-0.5, -1.4, ext);
                pose.rLowerLeg = lerp(0.5, 0.1, ext);
                break;
            case 'crouchPunch':
                pose.bodyY = 14;
                pose.rUpperArm = lerp(-0.2, -1.4, ext);
                break;
            case 'uppercut':
                pose.bodyLean = -ext * 0.2;
                pose.rUpperArm = lerp(-0.2, -2.2, ext);
                pose.rForeArm = lerp(-0.3, -0.5, ext);
                break;
            case 'spinKick':
                pose.bodyLean = ext * 0.3;
                pose.rUpperLeg = lerp(-0.05, -1.3, ext);
                pose.rLowerLeg = lerp(-0.1, 0.6, ext);
                pose.lUpperLeg = lerp(0.05, 0.9, ext);
                break;
            case 'fireball':
                pose.rUpperArm = lerp(-0.3, -1.5, ext);
                pose.lUpperArm = lerp(0.3, -1.5, ext);
                pose.rForeArm = -0.3;
                pose.lForeArm = -0.3;
                break;
            case 'super':
                pose.bodyLean = ext * 0.2;
                pose.rUpperArm = -1.8;
                pose.lUpperArm = -1.8;
                pose.rForeArm = 0.2;
                pose.lForeArm = 0.2;
                pose.rUpperLeg = -0.8;
                pose.lUpperLeg = 0.4;
                break;
            // ---- 3-hit Combo String poses ----
            case 'comboJab':
                // Quick left-hand lead jab
                pose.lUpperArm = lerp(0.3, -1.55, ext);
                pose.lForeArm  = lerp(0.4, -0.1, ext);
                pose.rUpperArm = lerp(-0.3, 0.2, ext);
                break;
            case 'comboCross':
                // Right-hand body blow — step in, slight lean
                pose.bodyLean  = ext * 0.18;
                pose.rUpperArm = lerp(-0.2, -1.6, ext);
                pose.rForeArm  = lerp(-0.3, 0.15, ext);
                pose.lUpperArm = lerp(0.3, 0.9, ext);
                pose.bodyY     = ext * 4;
                break;
            case 'comboKick':
                // Rising kick finisher
                pose.bodyLean  = -ext * 0.1;
                pose.rUpperLeg = lerp(-0.05, -1.8, ext);
                pose.rLowerLeg = lerp(-0.1, 0.4, ext);
                pose.lUpperArm = lerp(-0.3, -1.1, ext);
                pose.rUpperArm = lerp(0.5,  1.0, ext);
                break;
            default:
                break;
        }
    }

    return pose;
}

function jointFromAngle(originX, originY, length, angle) {
    return {
        x: originX + Math.sin(angle) * length,
        y: originY + Math.cos(angle) * length
    };
}

function drawFighterBody(ctx, pose, palette, facing, monsterLevel, customScale = 1.0) {
    const { skin, suit, suitDark, outline, hair, glove } = palette;
    const scale = customScale * (monsterLevel === 2 ? 1.2 : (monsterLevel === 1 ? 1.1 : 1.0));
    const hipY = (-38 + pose.bodyY) * scale;
    const shoulderY = (-62 + pose.bodyY) * scale;
    const neckY = (-72 + pose.bodyY) * scale;
    const headY = (-82 + pose.bodyY) * scale;

    ctx.save();
    ctx.rotate(pose.bodyLean);

    // Add glow aura for monsters
    if (monsterLevel === 2) {
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur = 20;
    } else if (monsterLevel === 1) {
        ctx.shadowColor = '#44ff00';
        ctx.shadowBlur = 12;
    }

    const hipL = { x: -7 * scale, y: hipY };
    const hipR = { x: 7 * scale, y: hipY };
    const lKnee = jointFromAngle(hipL.x, hipL.y, 22 * scale, pose.lUpperLeg);
    const lFoot = jointFromAngle(lKnee.x, lKnee.y, 24 * scale, pose.lUpperLeg + pose.lLowerLeg);
    const rKnee = jointFromAngle(hipR.x, hipR.y, 22 * scale, pose.rUpperLeg);
    const rFoot = jointFromAngle(rKnee.x, rKnee.y, 24 * scale, pose.rUpperLeg + pose.rLowerLeg);

    drawLimb(ctx, hipL.x, hipL.y, lKnee.x, lKnee.y, 9 * scale, suitDark, outline);
    drawLimb(ctx, lKnee.x, lKnee.y, lFoot.x, lFoot.y, 8 * scale, suit, outline);
    drawLimb(ctx, hipR.x, hipR.y, rKnee.x, rKnee.y, 9 * scale, suitDark, outline);
    drawLimb(ctx, rKnee.x, rKnee.y, rFoot.x, rFoot.y, 8 * scale, suit, outline);

    ctx.fillStyle = monsterLevel > 0 ? '#111' : '#222';
    ctx.fillRect(lFoot.x - 8 * scale, lFoot.y - 4, 14 * scale, 6);
    ctx.fillRect(rFoot.x - 8 * scale, rFoot.y - 4, 14 * scale, 6);

    ctx.fillStyle = suit;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-14 * scale, shoulderY, 28 * scale, hipY - shoulderY + 4, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = suitDark;
    ctx.fillRect(-14 * scale, hipY - 6, 28 * scale, 5);

    const shL = { x: -16 * scale, y: shoulderY + 4 };
    const shR = { x: 16 * scale, y: shoulderY + 4 };
    const lElbow = jointFromAngle(shL.x, shL.y, 18 * scale, pose.lUpperArm);
    const lHand = jointFromAngle(lElbow.x, lElbow.y, 16 * scale, pose.lUpperArm + pose.lForeArm);
    const rElbow = jointFromAngle(shR.x, shR.y, 18 * scale, pose.rUpperArm);
    const rHand = jointFromAngle(rElbow.x, rElbow.y, 16 * scale, pose.rUpperArm + pose.rForeArm);

    drawLimb(ctx, shL.x, shL.y, lElbow.x, lElbow.y, 7 * scale, suit, outline);
    drawLimb(ctx, lElbow.x, lElbow.y, lHand.x, lHand.y, 6 * scale, skin, outline);
    drawLimb(ctx, shR.x, shR.y, rElbow.x, rElbow.y, 7 * scale, suit, outline);
    drawLimb(ctx, rElbow.x, rElbow.y, rHand.x, rHand.y, 6 * scale, skin, outline);

    drawJoint(ctx, lHand.x, lHand.y, 5 * scale, glove);
    drawJoint(ctx, rHand.x, rHand.y, 5 * scale, glove);

    drawLimb(ctx, 0, shoulderY, 0, neckY, 6 * scale, skin, outline);

    ctx.shadowBlur = 0;
    drawHead(ctx, 0, headY, 11 * scale, skin, hair, facing, monsterLevel);

    ctx.restore();
}

function drawKnockdown(ctx, palette, outline) {
    ctx.save();
    ctx.rotate(-Math.PI / 2);
    ctx.translate(-20, -10);
    ctx.fillStyle = palette.suit;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-30, -12, 60, 24, 6);
    ctx.fill();
    ctx.stroke();
    drawHead(ctx, 28, -4, 9, palette.skin, palette.hair, 1, 0);
    ctx.restore();
}

function drawProjectile(ctx, p, isSuper) {
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, p.width);
    grad.addColorStop(0, isSuper ? '#fff' : '#ffff88');
    grad.addColorStop(0.5, isSuper ? '#00ffff' : '#ff8800');
    grad.addColorStop(1, 'rgba(255,100,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, p.width * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isSuper ? 'cyan' : 'yellow';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function getPalette(fighter) {
    const ml = fighter.monsterLevel || 0;

    if (fighter.isHit) {
        if (ml === 2) return { suit: '#ff6600', suitDark: '#cc3300', skin: '#ff9900', hair: '#ffffff', glove: '#ff4400', outline: '#880000' };
        if (ml === 1) return { suit: '#88ff00', suitDark: '#44aa00', skin: '#ccff44', hair: '#ffffff', glove: '#66ee00', outline: '#114400' };
        return { suit: '#ffffff', suitDark: '#dddddd', skin: '#ffffff', hair: '#aaaaaa', glove: '#cccccc', outline: '#888888' };
    }

    if (fighter.customPalette && ml === 0) {
        return fighter.customPalette;
    }

    if (fighter.isPlayer1) {
        return { suit: '#1e5bb8', suitDark: '#123d7a', skin: '#d4a574', hair: '#1a1008', glove: '#2244aa', outline: '#0a2040' };
    }

    if (ml === 2) {
        // Super-Monster: Hellfire Demon
        return { suit: '#660000', suitDark: '#330000', skin: '#1a0000', hair: '#ff4400', glove: '#880000', outline: '#220000' };
    }
    if (ml === 1) {
        // Monster: Dark Beast
        return { suit: '#1a3300', suitDark: '#0a1a00', skin: '#2d5a1a', hair: '#884400', glove: '#336600', outline: '#0a1a00' };
    }

    // Normal CPU
    return { suit: '#b81e2e', suitDark: '#7a1220', skin: '#c9956a', hair: '#0a0806', glove: '#aa2233', outline: '#400a10' };
}

export function renderFighter(ctx, fighter) {
    const dir = fighter.facing === 'right' ? 1 : -1;
    const baseX = fighter.x + fighter.width / 2;
    const baseY = fighter.y + fighter.height;
    const ml = fighter.monsterLevel || 0;

    const palette = getPalette(fighter);

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.scale(dir, 1);

    const pose = buildPose(fighter);

    if (pose.knockedDown) {
        drawKnockdown(ctx, palette, palette.outline);
    } else {
        if (pose.airborne) ctx.translate(0, -8);
        drawFighterBody(ctx, pose, palette, dir, ml, fighter.bodyScale);
    }

    // Invulnerability shield
    if (fighter.isInvulnerable) {
        ctx.strokeStyle = 'rgba(0, 220, 255, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, -45, 28, 50, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();

    // Projectiles
    for (const p of fighter.projectiles) {
        drawProjectile(ctx, p, fighter.isSuperMove);
    }

    // Combo counter
    if (fighter.comboCounter >= 2) {
        ctx.fillStyle = ml === 2 ? '#ff4400' : (ml === 1 ? '#88ff00' : '#ffcc00');
        ctx.font = 'bold 18px Orbitron, Arial';
        const text = `${fighter.comboCounter} HIT COMBO!`;
        ctx.fillText(text, fighter.isPlayer1 ? 20 : 960 - 20 - ctx.measureText(text).width, 100);
    }
}
