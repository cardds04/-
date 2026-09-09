# Pet town visual direction

The generated hotel proposal is an art-direction reference, not a screenshot of the playable game. Actual gameplay remains Three.js, with real imported assets and interactive DOM speech bubbles.

For substantial screen changes, capture the actual mobile game, use image generation for a visual proposal, then implement and inspect the working screen. Preserve readable faces and a clear walking area. Use cream, sage, honey wood, and warm gold across furniture, lights and controls. Human staff serve the player's animal companion. Object name labels must not obscure the scene.

Questions belong above NPCs; answers belong to the player's bubble. Both use similarly large English typography. Korean translations remain behind the translation control. Correct answers advance only after spoken audio and any associated animation complete. Audio errors offer replay, never silently advance. Gold and XP rise above the pet with a short chime.

Minigames retain the existing town instance and return to the originating location. The home furnishings added here are fixed starter decor; purchased furniture and saved layouts are preserved.

## Spacious rooms and daily story, version 16

The six-room design board guides distinct functional zones rather than one generic room with swapped furniture. Rooms now use 12 by 10 scene units, a clear center aisle, perimeter furniture, a cutaway entrance, and a smaller pet scale. The hotel lobby has no bed; the clinic has a partitioned exam bay. Indoor movement routes around furniture.

A scenario review recommended morning kindergarten, a daytime errand or rest, then home; airports/hotels belong to separate outings rather than an obligatory daily circuit. The implemented daily guide uses completed outings as time steps, not real clock time. Every third day starting day 2, after one outing, a fictional sore-tummy event can direct the player to the vet. It supplies known symptoms, never asks children to diagnose or select medication, and routes home after the checkup. Incorrect English does not worsen illness. The existing episode reward applies; there is no duplicate mission reward.

Eight new three-turn visits have context, translated hints and generated audio. Visit selection rotates whole episodes, preserves unfinished conversations, and excludes the café work shift from automatic customer visits. The expansive park-town image is a concept only; it is not the currently implemented outdoor map.

## v17 — connected home and spacious park town

The home reference `home-art-direction-v17.png` guides warm wood, sage accents, a dining kitchen, bedroom and bathroom around an open circulation route. Runtime uses actual model assets and connected walkable floors, rather than displaying the concept image as a backdrop. Home room buttons focus the camera and route the pet through door openings. Existing living-room furniture coordinates remain valid; the saved layout bounds now include the new rooms.

The town expands to an 80 × 84 park with separated destination buildings, a river, pond, two crossing bridges, paths, trees and rest spots. Overview and follow views support exploration. The human companion remains visible indoors. Each destination has one discoverable object with a once-per-day gold/XP reward, persisted in existing save claims. Home mission placement follows the measured gauge bounds on resize.

## v18 — Blender-authored home and follow camera

`tools/blender/build-pet-home.py` builds the house in Blender 5.2. The editable `.blend`, exported `.glb`, and file-URL-compatible embedded GLB payload live in `assets/animal-town/models/home-v18/`. The model includes beveled furniture, upholstered cushions, authored oak/cloth texture maps, framed windows, cabinet panels and brass pulls, a layered bed, recessed bathtub, and tiled bathroom. Meshes are merged into 25 material/interaction groups; glTF extras preserve fixture actions. This is a real runtime model, not a rendered backdrop. Lighting remains real-time; baked lighting is not claimed.

The home now opens close to the pet. Camera position and target follow movement with smoothing; the full-house view is opt-in. Room buttons route the pet and keep following, while in furnishing mode they let the camera inspect a room without moving the pet. Bought furniture and the existing saved layout remain separate from the authored house.

All home/town/interior floors now use a horizontal √2 world scale: twice the floor area. Actor and imported prop horizontal scales compensate so their apparent proportions remain unchanged. Blender room furnishings use matching room anchors; fixture collision bounds follow those anchors. Save coordinates stay in their original logical units. Tap the floor to walk; hold for 350 ms to run, and release/cancel/blur to return to walking. The input controller is shared by home and town, disabled while furnishing, playing fetch, or answering a dialogue.
