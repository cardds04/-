/**
 * 촬영일 하위 폴더 트리(편집완료 / 원본파일) — Cron·작가 현장확인 공통
 */
const { needsPhotoFolder, needsVideoFolder } = require("./delivery-drive-logic.cjs");
const { ensureFolder } = require("./google-drive-delivery.cjs");

const PHOTO_EDIT = "사진편집완료";
const PHOTO_ORIG = "사진원본파일";
const VIDEO_EDIT = "영상편집완료";
const VIDEO_ORIG = "영상원본파일";

/**
 * @param {*} drive googleapis drive client
 * @param {string} shootFolderId
 * @param {string} composition schedules.composition
 * @returns {Promise<{ photo_folder_id: string|null, video_folder_id: string|null, photo_original_folder_id: string|null, video_original_folder_id: string|null }>}
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

  if (wantPhoto) {
    photo_folder_id = await ensureFolder(drive, sf, PHOTO_EDIT);
    photo_original_folder_id = await ensureFolder(drive, sf, PHOTO_ORIG);
  }
  if (wantVideo) {
    video_folder_id = await ensureFolder(drive, sf, VIDEO_EDIT);
    video_original_folder_id = await ensureFolder(drive, sf, VIDEO_ORIG);
  }

  return {
    photo_folder_id,
    video_folder_id,
    photo_original_folder_id,
    video_original_folder_id,
  };
}

module.exports = { ensureShootCompositionSubfolders };
