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
- `accessToken` (se duoc tu dong cap nhat sau login/refresh token)

### 4.2 Collection Admin

Can cap nhat toi thieu:

- `baseUrl`
- `adminEmail`
- `adminPassword`
- `accessToken` (se duoc set tu dong sau login/refresh)
- `userEmail` (email user muc tieu de assign ma)
- `promotionCode`
- `tempAccountEmail`
- `tempAccountPassword`

## 5) Thu tu chay khuyen nghi

### Buoc A - chay collection User

Folder theo thu tu:

1. `0. Bootstrap public data`
2. `1. User auth`
3. `2. Promotions + Reviews`
4. `3. Orders`
5. `4. User DB APIs`
6. `5. Logout`

Ket qua mong doi:

- Lay duoc `productId`
- Dang nhap user thanh cong
- Nhan duoc `access_token` va luu vao bien `accessToken`
- Submit review thanh cong (co `reviewId`)
- Tao duoc don hang qua RPC checkout (`orderId`)
- Huy don hang user vua tao (`status = cancelled`)
- Test duoc CRUD gio hang va query don hang cua user

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
- Tao account staff + reset password account user thanh cong
- Query duoc cac bang admin hay dung (`branches`, `support_requests`)
- Co the thong ke nhanh tong user va theo role (`customer/staff/admin`) trong folder `1. Bootstrap admin variables`
- Co request `Query all orders (count total)` trong folder `1. Bootstrap admin variables` de thong ke tong don hang hien co

## 6) Script tu dong cap nhat bien

Collection da co script test de set bien:

- `productId` (tu query products)
- `productPrice` (tu query products)
- `searchKeyword` (tu khoa tim kiem san pham, mac dinh `vot`)
- `userId` (tu API Current user)
- `targetUserId` (tu query users theo email)
- `promotionId`, `promotionCode`
- `promotionAssignmentId`
- `orderId` (tu API tao don)
- `reviewId` (tu submit review hoac query pending review)
- `resetCode` (tu forgot password request khi server tra `preview`)

Trong folder `0. Bootstrap public data` cua collection User da co them request:

- `Search products by name (public)` -> test tim kiem san pham theo ten bang `db/query` voi filter `op: ilike` tren cot `name`.

Trong folder `1. User auth`:

- `Login` tra ve `access_token` (JWT access token), Postman tu dong luu vao `accessToken`.
- `Refresh access token` goi `POST /api/auth/refresh-token` de cap token moi (refresh token duoc luu trong HttpOnly cookie).
- `Current user` da kem header `Authorization: Bearer {{accessToken}}` de test luong Bearer token.

Trong folder `3. Orders` cua collection User da co them:

- `Create checkout order (user)` -> dat don qua RPC `create_checkout_order_atomic`.
- `Cancel my order (set status=cancelled)` -> huy don cua chinh user theo `orderId + userId`.
- `Verify my order status (cancelled)` -> kiem tra lai trang thai sau khi huy.

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
