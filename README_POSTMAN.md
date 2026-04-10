# Huong dan Postman de bao cao (tach User/Admin)

Tai lieu nay huong dan chi tiet cach chay Postman theo 2 luong rieng (`user` va `admin`) de de kiem tra va de tong hop bao cao.

## 1) File su dung

- `postman-user-api.collection.json` (collection test rieng cho user)
- `postman-admin-api.collection.json` (collection test rieng cho admin)
- `postman-full-api.collection.json` (ban full all-in-one, giu de tham khao/chay tong)

## 2) Dieu kien truoc khi chay

1. Backend dang chay o `http://localhost:4000`.
2. Database MySQL ket noi dung.
3. Co san tai khoan admin hop le (`profiles.role = admin`).
4. Trong Postman bat cookie va giu cung workspace de session on dinh (`connect.sid`).

## 3) Cach import

1. Mo Postman -> `Import`.
2. Import 2 file:
   - `postman-user-api.collection.json`
   - `postman-admin-api.collection.json`
3. (Tuy chon) import them `postman-full-api.collection.json` neu can chay all-in-one.

## 4) Cau hinh bien (variables)

### 4.1 Collection User

Can cap nhat toi thieu:

- `baseUrl`
- `userEmail`
- `userPassword`
- `userNewPassword`
- `promotionCode` (neu muon test ap ma cu the)

### 4.2 Collection Admin

Can cap nhat toi thieu:

- `baseUrl`
- `adminEmail`
- `adminPassword`
- `userEmail` (email user muc tieu de assign ma)
- `promotionCode`
- `tempAccountEmail`

## 5) Thu tu chay khuyen nghi

### Buoc A - chay collection User

Folder theo thu tu:

1. `0. Bootstrap public data`
2. `1. User auth`
3. `2. Promotions + Reviews`
4. `3. Logout`

Ket qua mong doi:

- Lay duoc `productId`
- Dang nhap user thanh cong
- Submit review thanh cong (co `reviewId`)

### Buoc B - chay collection Admin

Folder theo thu tu:

1. `0. Admin login`
2. `1. Bootstrap admin variables`
3. `2. Promotions admin`
4. `3. Reviews admin`
5. `4. Accounts + DB CRUD`
6. `5. Logout admin`

Ket qua mong doi:

- Lay duoc `targetUserId` theo `userEmail`
- Tao promotion thanh cong (`promotionId`)
- Assign promotion cho user thanh cong
- Moderate review thanh cong (neu co `reviewId`)

## 6) Script tu dong cap nhat bien

Collection da co script test de set bien:

- `productId` (tu query products)
- `targetUserId` (tu query users theo email)
- `promotionId`, `promotionCode`
- `promotionAssignmentId`
- `reviewId` (tu submit review hoac query pending review)
- `resetCode` (tu forgot password request khi server tra `preview`)

## 7) Luu y quan trong

### 7.1 Filter DB API phai dung `op`

Dung:

```json
{ "column": "title", "op": "eq", "value": "Section A" }
```

Khong dung:

```json
{ "column": "title", "operator": "eq", "value": "Section A" }
```

### 7.2 Session/cookie

Neu API bao `UNAUTHENTICATED`:

- Kiem tra da chay request login chua.
- Kiem tra Postman co giu cookie khong.
- Khong doi workspace/tab khac giua luc chay chain.

### 7.3 Quyen admin

Neu API admin bao `FORBIDDEN`:

- Kiem tra `adminEmail` dang login co role `admin` trong bang `profiles`.

## 8) Cach lam bao cao test

Sau khi run xong, chup man hinh:

1. Collection Runner ket qua pass/fail cho User.
2. Collection Runner ket qua pass/fail cho Admin.
3. Response 200 cua cac API key:
   - `auth/login`, `auth/session`
   - `promotions/create`, `promotions/assign`
   - `reviews/submit`, `reviews/moderate`
   - `db/insert`, `db/update`, `db/delete`

Checklist bao cao:

- Tong so request da chay
- So pass / so fail
- Danh sach API fail + message loi + huong xu ly

## 9) Troubleshooting nhanh

- `TABLE_NOT_ALLOWED`: backend chua whitelist table hoac chua restart.
- `PROMOTION_NOT_ASSIGNED`: user chua duoc assign ma.
- `INVALID_RESET_CODE`: reset code sai/het han.
- `PROMOTION_CODE_EXISTS`: doi `promotionCode` khac roi chay lai.
- `REVIEW_ID_REQUIRED`: chua co `reviewId`, can submit review truoc.
