import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { state, saveToDB } from '../core/state.js';
import { showToast } from '../view/ui/ui_base.js';

/**
 * 📸 [NATIVE-GALLERY] 갤러리에서 사진 가져오기
 */
export async function pickFromGallery() {
    try {
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Uri,
            source: CameraSource.Photos
        });

        // 1. Android/iOS 로컬 파일 URI 또는 Web Blob 확보
        const imageUrl = image.webPath; // Browser-safe URL for preview
        // 여기서는 URL만 반환하여 미리보기/등록 시점에 처리
        return imageUrl;
    } catch (err) {
        console.error("Gallery Pick Error:", err);
        if (err.message !== "User cancelled photos app") {
            showToast("갤러리 접근 실패: " + err.message, "error");
        }
        return null;
    }
}

/**
 * 📂 [SYNERGY-DRIVE] 로컬 사진을 드라이브 공유 폴더로 전송 (v20.0)
 * 폰에서 찍은 사진을 ‘공유 폴더’에 업로드하고, 그 영구 링크를 마크다운에 심음.
 */
export async function syncImageToDrive(blob, fileName) {
    const { uploadDriveFile } = await import('./auth.js');
    if (!state.lockerFolderId) return null;

    try {
        const fileId = await uploadDriveFile(fileName, blob, state.lockerFolderId, 'image/jpeg');
        if (fileId) {
            // 구글 드라이브 썸네일/뷰어 링크 생성
            return `https://docs.google.com/uc?id=${fileId}&export=view`;
        }
    } catch (err) {
        console.error("Image Cloud Sync Fail:", err);
    }
    return null;
}
