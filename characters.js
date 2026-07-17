import { fireball, uppercut, spinningKick, bladeDash, flyingKnee, earthquakeSmash } from './moves.js';

export const KAI = {
    id: 'kai',
    name: 'KAI',
    tagline: 'The Balanced Striker',
    stats: { maxHealth: 100, speed: 300, meterGain: 1.0 },
    scale: 1.0,
    specials: [fireball, bladeDash], // QCF+P, QCB+P
    palette: {
        skin: '#ffccaa',
        gi: '#3366cc', belt: '#ffffff',
        glove: '#cc2222', shoe: '#444444',
        shadow: 'rgba(0,0,0,0.5)'
    }
};

export const VEGA = {
    id: 'vega',
    name: 'VEGA',
    tagline: 'The Blazing Assassin',
    stats: { maxHealth: 85, speed: 380, meterGain: 1.2 },
    scale: 0.92,
    specials: [uppercut, flyingKnee], // QCB+K, QCF+K
    palette: {
        skin: '#ecd5c5',
        gi: '#991122', belt: '#111111',
        glove: '#222222', shoe: '#1a1a1a',
        shadow: 'rgba(0,0,0,0.5)'
    }
};

export const GOLEM = {
    id: 'golem',
    name: 'GOLEM',
    tagline: 'The Unstoppable Force',
    stats: { maxHealth: 130, speed: 200, meterGain: 0.8 },
    scale: 1.15,
    specials: [spinningKick, earthquakeSmash], // DP+K, QCB+P
    palette: {
        skin: '#7a967a',
        gi: '#223322', belt: '#553311',
        glove: '#555555', shoe: '#222222',
        shadow: 'rgba(0,0,0,0.6)'
    }
};

export const CHARACTERS = [KAI, VEGA, GOLEM];
