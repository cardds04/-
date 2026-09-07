# 별빛 원정대

The existing `/english-travel-3d.html` URL now serves an original 2D canvas RPG. The old village/Three.js source is retained for reference but is not imported by the new entry point.

## Play loop

- Tap the top mission or a map marker to walk to the next objective. Arrow keys/WASD, a touch joystick and E also work.
- NPC dialogue supplies the English answer first; listen, repeat with optional browser speech recognition, or read and confirm.
- Battles teach an answer before showing three choices. One correct choice damages the monster; wrong choices damage the player and show the correct answer. Equipment affects damage/defense. Hints have no penalty.
- Gold and XP come from battles and 12 ordered story quests. Purchases use earned game currency only. Owned clothing/weapons can be re-equipped in the bag or at home.
- Three star fragments, a gated ruin key and the final village festival form a complete story. The festival unlocks a special outfit. Returning to a region respawns monsters for continued leveling.
- The 60 battle situations span 10 difficulty tiers. The current and preceding tier form the pool; missed phrases are prioritized among unused questions. This is a learning game, not a validated proficiency assessment.
- Houses, shops, an inn and a mountain lodge are separate walkable interiors. Resting restores all HP for free. Defeat returns the player home without removing gold.

## Isometric art update

The scene now uses a 2:1 isometric projection, detailed original raster character/prop atlases, screen-relative controls, and textured ground. Buildings fade when they cover the player. See `english-rpg-art.md` for the asset inventory and generation prompts. Story and saved progress are unchanged.

## Source

- `scripts/english-rpg/data.cjs`: authored story, items, questions and monsters.
- `scripts/english-rpg/logic.cjs`: saved state, progression, gates, purchases, stats, battle transitions.
- `scripts/english-rpg/maps.cjs`: map topology, collision and A* routes.
- `scripts/english-rpg/art.js`: original layered pixel characters, gear and monsters.
- `scripts/english-rpg/world.js`: map painting, depth sorting, walking and interaction.
- `scripts/english-rpg/game.js`: DOM UI, audio, story, shop and battle integration.
- `english-travel-rpg.css`: compact mobile HUD, dialogs and battle menus.

## Storage and limitations

Progress is stored locally in `english_starword_rpg_v1`, optionally suffixed with the selected family profile ID. The prior `english_travel_village_v2` save is retained unchanged; avatar/sound preferences are imported on a fresh RPG save. RPG progression starts with the new story. This game does not use account/cloud save or process payments. Browser speech recognition support varies; read-and-confirm always works. English audio uses the browser's installed speech synthesis voices.

## Validation

`npm run test:english-travel` includes complete-story tests through both first-weapon choices, quest ordering, travel gates, no duplicate purchases/rewards, one response per battle round, correct/incorrect combat damage, defeat/rest, equipment stats, save restoration, difficulty scaling, and walkable routes to every interaction. Mobile browser playtesting covers walking, interiors, the full quest story, purchase/equip, wrong answers, victories and reload/resume.
