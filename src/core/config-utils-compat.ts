/**
 * Backward compatibility shim for config-utils
 * This allows existing code to continue working while we gradually refactor
 *
 * NOTE: This is a temporary compatibility layer. New code should use ConfigManager directly.
 */

// Re-export constants that are still used
export const IAM = {
    DEVELOPER: "Developer",
    QC: 'QC'
};

export const TEMPO_URL = 'https://api.tempo.io/4';

// For files that still use the old config-utils, they'll need to import from ../components/config-utils
// which is the original VS Code-specific implementation
