#!/usr/local/bin/python3
"""촬영 날짜가 바뀐 건의 마이박스 촬영 폴더 날짜(MMDD) 바꾸기 — 11-18.
   daily_delivery_folders.cjs 가 「이미 폴더 있음 + 날짜가 바뀜」일 때 부른다.
   사용: rename_shoot_folder_date.py <업체공유링크> <촬영폴더 resourceKey> <새 MMDD>
   폴더 이름과 안쪽 폴더 이름의 앞 4자리 날짜만 바꾼다(파일은 건드리지 않음, resourceKey 그대로라 딥링크 유지).
   출력: JSON {ok, from, to, subs}"""
import sys, json, re, unicodedata, base64
sys.path.insert(0, "/Users/happykimsfamily/mybox-auto")
import mybox_fetch as mf

def nfc(x): return unicodedata.normalize("NFC", str(x))

def main():
    share, key, mmdd = sys.argv[1], sys.argv[2], sys.argv[3]
    s = mf.sess(mf.load_cookies())
    root = mf.resolve_share_root(s, share)
    if not root:
        print(json.dumps({"ok": False, "message": "업체 공유링크 해석 실패"}, ensure_ascii=False)); return
    # 저장된 키는 끝(공유번호)이 다를 수 있다 → 가운데 resourceNo 로 맞춘다
    def res_no(k):
        try:
            return base64.b64decode(k + "=" * (-len(k) % 4)).decode(errors="ignore").split("|")[1]
        except Exception:
            return ""
    want = res_no(key)
    hit = next((it for it in mf.list_folder(s, root) if it.get("resourceKey") == key or (want and str(it.get("resourceNo")) == want)), None)
    if hit:
        key = hit["resourceKey"]
    if not hit:
        print(json.dumps({"ok": False, "message": "업체 폴더 바로 아래에서 촬영 폴더를 못 찾음"}, ensure_ascii=False)); return
    old = nfc(mf.name_of(hit))
    m = re.match(r"^(\d{4})", old)
    if not m:
        print(json.dumps({"ok": False, "message": f"이름이 날짜로 시작하지 않음: {old}"}, ensure_ascii=False)); return
    if m.group(1) == mmdd:
        print(json.dumps({"ok": True, "from": old, "to": old, "subs": []}, ensure_ascii=False)); return
    subs = []
    for c in mf.list_folder(s, key):
        cn = nfc(mf.name_of(c))
        if c.get("resourceType") == "folder" and cn.startswith(m.group(1)):
            nn = mmdd + cn[4:]
            subs.append([cn, nn, mf.rename_mybox_folder(s, c["resourceKey"], key, nn)])
    new = mmdd + old[4:]
    ok = mf.rename_mybox_folder(s, key, root, new)
    print(json.dumps({"ok": bool(ok), "from": old, "to": new, "subs": subs}, ensure_ascii=False))

main()
