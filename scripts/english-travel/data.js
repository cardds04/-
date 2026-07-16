import curriculum from "./curriculum.json";
import missionContent from "./missions.json";

// One curriculum source is shared by the browser bundle and the locked
// server-side conversation evaluator. `target` and `accepts` are examples for
// hints/offline practice, never the only valid answers in live conversation.
export const AVATARS = curriculum.AVATARS;
export const LOCATIONS = curriculum.LOCATIONS;
export const MISSIONS = missionContent.missions;
export const ECONOMY = missionContent.economy;
