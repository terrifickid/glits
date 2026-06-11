// glits.config.js
// This file controls which platforms the CLI will use.
//
// It must be a valid ES module exporting an object with a "platforms" array.
// Platform names must be lowercase and exactly match one of the supported values below.
//
// After editing, the CLI (create + send) will pick up the change on the next run.
// In the hermes skill, edit the copy inside the installed skill directory
// (usually ~/.hermes/skills/glits/glits.config.js or ${HERMES_SKILL_DIR}/glits.config.js).

export default {
  platforms: [
    'bluesky',
    // 'mastodon',
    // 'x',
    // 'threads',
    // 'instagram',
    // 'linkedin',
    // 'youtube',
    // 'facebook',
    // 'nostr',
  ],
};
