/**
 * 촬영일 하위 폴더 트리(편집완료 / 원본파일) — Cron·작가 현장확인 공통
 */
const { needsPhotoFolder, needsVideoFolder } = require("./delivery-drive-logic.cjs");
const { ensureFolder, listImmediateChildFolders } = require("./google-drive-delivery.cjs");

const PHOTO_EDIT = "사진편집완료";
const PHOTO_ORIG = "사진원본파일";
const VIDEO_EDIT = "영상편집완료";
const VIDEO_ORIG = "영상원본파일";

/**
 * 레거시 「사진」「영상」만 있거나 API 지연 후 목록 불일치 시 한 번 더 ensure
 */
async function ensureShootCompositionSubfolders(drive, shootFolderId, composition) {
  const sf = String(shootFolderId || "").trim();
  if (!sf) {
    throw new Error("shoot_folder_id 가 없습니다.");
  }
  const wantPhoto = needsPhotoFolder(composition);
  const wantVideo = needsVideoFolder(composition);
  if (!wantPhoto && !wantVideo) {
    throw new Error("사진·영상 구성이 없어 납품 폴더를 만들 수 없습니다.");
  }

  let photo_folder_id = null;
  let video_folder_id = null;
  let photo_original_folder_id = null;
  let video_original_folder_id = null;

  function requiredPresent(names) {
    if (wantPhoto && (!names.has(PHOTO_EDIT) || !names.has(PHOTO_ORIG))) return false;
    if (wantVideo && (!names.has(VIDEO_EDIT) || !names.has(VIDEO_ORIG))) return false;
    return true;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (wantPhoto) {
      photo_folder_id = await ensureFolder(drive, sf, PHOTO_EDIT);
      photo_original_folder_id = await ensureFolder(drive, sf, PHOTO_ORIG);
    }
    if (wantVideo) {
      video_folder_id = await ensureFolder(drive, sf, VIDEO_EDIT);
      video_original_folder_id = await ensureFolder(drive, sf, VIDEO_ORIG);
    }
    const snap = await listImmediateChildFolders(drive, sf);
    const nm = new Set(snap.map((x) => x.name));
    if (requiredPresent(nm)) {
      break;
    }
    if (attempt === 2) {
      console.warn("[shoot-folder-layout]", {
        shootFolderId: sf,
        composition,
        wantPhoto,
        wantVideo,
        childNames: [...nm],
      });
      throw new Error(
        `촬영일 폴더 하위에 요구 이름(예: ${PHOTO_EDIT}, ${PHOTO_ORIG} 등) 폴더가 생성되지 않았습니다. Drive 권한·공유드라이브 설정을 확인하세요.`
      );
    }
  }

  return {
    photo_folder_id,
    video_folder_id,
    photo_original_folder_id,
    video_original_folder_id,
  };
}

module.exports = { ensureShootCompositionSubfolders };
