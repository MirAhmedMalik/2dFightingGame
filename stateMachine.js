class FiniteStateMachine {
    constructor(states, initialState) {
        this.states = states;
        this.currentState = initialState;
        this.states[initialState].onEnter?.();
    }

    transition(newState) {
        const current = this.states[this.currentState];
        if (current.allowedTransitions && !current.allowedTransitions.includes(newState)) {
            return false;
        }

        current.onExit?.();
        this.currentState = newState;
        this.states[newState].onEnter?.();
        return true;
    }

    update(deltaTime) {
        this.states[this.currentState].onUpdate?.(deltaTime);
    }
}

export default FiniteStateMachine;