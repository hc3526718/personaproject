/**
 * Boot-screen Rive file. Replace `assets/dalton_boot_logo.riv` with your export from Rive
 * (logo bounce + star shimmer). Rebuild the dev client after swapping the file.
 *
 * If the wrong scene plays, open the .riv in Rive and set the exact names below.
 */
export const DALTON_BOOT_RIVE = require('../../assets/dalton_boot_logo.riv');

/** e.g. "Main" — leave undefined to use the file default artboard */
export const DALTON_BOOT_ARTBOARD: string | undefined = undefined;

/** Prefer a state machine if your file uses one for the loop */
export const DALTON_BOOT_STATE_MACHINE: string | undefined = undefined;

/** If not using a state machine, optional animation timeline name */
export const DALTON_BOOT_ANIMATION: string | undefined = undefined;
