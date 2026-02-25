import json, requests, sys

# โหลด clasp token
with open(r"C:\Users\krumu\.clasprc.json") as f:
    clasprc = json.load(f)
td = clasprc["tokens"]["default"]

# Refresh token
r = requests.post("https://oauth2.googleapis.com/token", data={
    "client_id": td["client_id"],
    "client_secret": td["client_secret"],
    "refresh_token": td["refresh_token"],
    "grant_type": "refresh_token"
})
token_info = r.json()
access_token = token_info.get("access_token")
print("Scope:", token_info.get("scope","?"))
print("Token ok:", bool(access_token))

SHEET_ID = "1dd3A0dLTWH-kS039jeKI5hW4J6YkMzYbL2lGFJ-OTLo"
ADMIN_EMAIL = "pongsatorn.b@ppk.ac.th"
headers = {"Authorization": f"Bearer {access_token}"}

# อ่าน Users sheet
url = f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/Users!A:J"
resp = requests.get(url, headers=headers)
print("Sheets status:", resp.status_code)
if resp.status_code != 200:
    print(resp.text[:300])
    sys.exit(1)

rows = resp.json().get("values", [])
print(f"Users rows: {len(rows)}")

# หาแถวที่มี email ตรงกัน (header = row 0)
row_to_delete = None
user_id = None
for i, row in enumerate(rows):
    if i == 0: continue
    if len(row) > 1 and row[1].strip().lower() == ADMIN_EMAIL.lower():
        row_to_delete = i + 1  # 1-based
        user_id = row[0] if row else None
        print(f"Found admin at row {row_to_delete}, id={user_id}")
        break

if not row_to_delete:
    print(f"WARN: ไม่พบ {ADMIN_EMAIL}")
    sys.exit(0)

# ลบแถวออกจาก Users โดย batchUpdate deleteRange
sheet_meta = requests.get(f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}", headers=headers).json()
sheet_id_map = {s["properties"]["title"]: s["properties"]["sheetId"] for s in sheet_meta.get("sheets", [])}
users_sheet_id = sheet_id_map.get("Users")
perm_sheet_id  = sheet_id_map.get("Permissions")
print(f"UsersSheetId={users_sheet_id}, PermSheetId={perm_sheet_id}")

requests_list = [
    {"deleteDimension": {
        "range": {
            "sheetId": users_sheet_id,
            "dimension": "ROWS",
            "startIndex": row_to_delete - 1,
            "endIndex": row_to_delete
        }
    }}
]

# ลบออกจาก Permissions ถ้ามี user_id
if perm_sheet_id and user_id:
    perm_resp = requests.get(
        f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/Permissions!A:A",
        headers=headers
    )
    perm_rows = perm_resp.json().get("values", [])
    for pi, pr in enumerate(perm_rows):
        if pi == 0: continue
        if pr and str(pr[0]).strip() == str(user_id).strip():
            requests_list.append({"deleteDimension": {
                "range": {
                    "sheetId": perm_sheet_id,
                    "dimension": "ROWS",
                    "startIndex": pi,
                    "endIndex": pi + 1
                }
            }})
            print(f"Found perm row {pi+1}")
            break

# batch delete
batch_url = f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}:batchUpdate"
batch_resp = requests.post(batch_url, headers={**headers, "Content-Type":"application/json"},
                           json={"requests": requests_list})
print("Batch status:", batch_resp.status_code)
if batch_resp.status_code == 200:
    print("DONE: ลบบัญชี Admin เสร็จสิ้น")
else:
    print(batch_resp.text[:400])
