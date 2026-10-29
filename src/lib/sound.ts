/**
 * Sound utilities stub.
 * Notifications and sounds are completely silenced/disabled per project configuration.
 * Retained to prevent Rollup/Vite resolution breakage across builds.
 */

let soundEnabledState = true;

export const isSoundEnabled = (): boolean => {
  return soundEnabledState;
};

export const toggleSoundEnabled = (): boolean => {
  soundEnabledState = !soundEnabledState;
  return soundEnabledState;
};

export const playClickSound = (): void => {
  // Silent / No-op
};

export const playSuccessSound = (): void => {
  // Silent / No-op
};

export const playNotificationSound = (): void => {
  // Silent / No-op
};

export const playSound = (): void => {
  // Silent / No-op
};

export default {
  isSoundEnabled,
  toggleSoundEnabled,
  playClickSound,
  playSuccessSound,
  playNotificationSound,
  playSound,
};
