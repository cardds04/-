# Animal assets

- ShibaInu — Quaternius, Ultimate Animated Animal Pack (July 2021).
  Official: https://quaternius.com/packs/ultimateanimatedanimals.html
  License: CC0 1.0 https://creativecommons.org/publicdomain/zero/1.0/
- Cat — Quaternius, Cube World Kit (August 2023), CC0.
  Official: https://quaternius.com/packs/cubeworldkit.html
  Source mirror: https://github.com/agentkaerf/FreeModels
  Exact path: Cube World - Aug 2023/Animals/glTF/Cat.gltf.
  Converted with Blender: welded seams, subdivided, smoothed, retained animations.
- Shiba file retrieved from https://github.com/agentkaerf/FreeModels
  Exact path: Ultimate Animated Animals - July 2021/glTF/ShibaInu.gltf.
- Runtime changes: normalized size, softened Shiba normals, larger head proportions,
  outfit-color collar, animation transitions. Models remain low-poly stylized assets.
- pets.js packages the resulting embedded glTF data for file:// compatibility.

Other free source considered: Kenney Cube Pets, https://kenney.nl/assets/cube-pets (CC0).
No paid assets were purchased.

## Town & Build Mode update
- Buildings: Kenney City Kit (Suburban), https://kenney.nl/assets/city-kit-suburban
- Shops/public buildings: Kenney City Kit (Commercial), https://kenney.nl/assets/city-kit-commercial
- Furniture: Kenney Furniture Kit, https://kenney.nl/assets/furniture-kit
- Trees/flowers: Kenney Nature Kit, https://kenney.nl/assets/nature-kit
- Food objects: Kenney Food Kit, https://kenney.nl/assets/food-kit
  All five packs are CC0. Their original license files are in licenses/.
  48 selected models are embedded in world.js, including external palette images.
  Runtime material roughness/metalness adjusted for the pastel scene.
- Pug, German Shepherd: Quaternius Zombie Apocalypse Kit (March 2024), CC0.
  Official: https://quaternius.com/packs/zombieapocalypsekit.html
  Retrieved from agentkaerf/FreeModels / Zombie Apocalypse Kit - March 2024 / Characters / glTF.
- Walking guardian: Quaternius Cube World Kit, CC0, Character_Female_1.gltf.
- Corgi: Gobkit free animal pack, CC0.
  Creator repository: https://github.com/ariescar0326-sketch/gobkit-free-assets
  Source: animal/Corgi.glb. Idle/Walk animations split from the source clip at 24 fps.
  Runtime proportions and animation blending adjusted. No paid assets purchased.

## Adoption & furnishing expansion (September 2026)
- Husky and Fox: Quaternius Ultimate Animated Animal Pack (CC0), creator page:
  https://quaternius.com/packs/ultimateanimatedanimals.html
  Embedded glTF retrieved from agentkaerf/FreeModels, Ultimate Animated Animals - July 2021/glTF.
- Duck: Gobkit CC0 Animal Pack, https://github.com/Ariescar/gobkit-free-assets/tree/main/animal
  Original license is included as licenses/Gobkit-CC0.txt.
- Added 63 selected Kenney models from the already licensed Furniture, Food, Nature and Suburban kits.
  world.js now contains 111 models. Catalogue: 73 furniture/decor items, 10 foods and 10 houses.
- All selection thumbnails are rendered from the same model used in the game.
  The selection preview is a live Three.js model with idle/walk controls. No generated character artwork is used there.
- Safe animation allowlist retained; Gobkit Duck uses only idle 0–29 and walk 90–119 at 24 fps.
