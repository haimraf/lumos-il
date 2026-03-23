/**
 * Module-level audio trigger — avoids custom event dispatch
 * which may lose user-gesture context on iOS Safari.
 * BackgroundMusic registers the play function once on mount;
 * Header buttons call triggerAudioPlay() directly within the click handler.
 */
let _playCallback: (() => void) | null = null;

export function registerAudioPlay(fn: () => void) {
    _playCallback = fn;
}

export function triggerAudioPlay() {
    _playCallback?.();
}
