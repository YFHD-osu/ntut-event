# App Script 修改指南

## 你需要做的事

### 第一步：設定 Google Cloud OAuth Client ID

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立或選擇一個專案
3. 左側選單 → **API 和服務** → **憑證**
4. 點擊 **＋ 建立憑證** → **OAuth 2.0 用戶端 ID**
5. 應用程式類型選 **網頁應用程式**
6. 在「已授權的 JavaScript 來源」加入：
   - `http://localhost`（本地測試用）
   - `https://你的帳號.github.io`（GitHub Pages 部署後的網址）
7. 建立後複製 **用戶端 ID**（格式類似 `1234567890-xxxxx.apps.googleusercontent.com`）
8. 將這個 ID 填入 `script.js` 第 15 行的 `GOOGLE_CLIENT_ID`

---

### 第二步：準備 Google Sheet 格式

你的試算表需要有以下欄位（第一列為標題）：

| A (email) | B (name) | C (class) | D (group) | E (contact_1) | F (contact_2) | G (contact_3) |
|---|---|---|---|---|---|---|
| s110590001@mail.ntut.edu.tw | 王小明 | 資工一 | 17 | wang_ig | 0912345678 | |
| s110590002@mail.ntut.edu.tw | 李小華 | 資工二 | 17 | lee_ig | lee_line | discord:lee#1234 |

> **重要**：group 欄（D欄）相同值的人會被視為同一組，全部回傳。

---

### 第三步：替換 App Script 程式碼

將你的 `doGet` 函式整個換成以下程式碼：

```javascript
// ※ 填入你的 Google Cloud OAuth 2.0 Client ID ※
const CLIENT_ID = '你的_CLIENT_ID.apps.googleusercontent.com';

function doGet(e) {
  // 1. 取得前端傳來的 ID Token
  const idToken = e.parameter.idToken;
  if (!idToken) {
    return jsonResponse({ error: '缺少 idToken，請重新登入' });
  }

  // 2. 向 Google 驗證 Token（確認這是真實的 Google 帳號登入）
  let tokenInfo;
  try {
    const res = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + idToken,
      { muteHttpExceptions: true }
    );
    tokenInfo = JSON.parse(res.getContentText());
  } catch (err) {
    return jsonResponse({ error: 'Token 驗證請求失敗：' + err.message });
  }

  // 3. 確認 Token 有效且來自正確的應用程式
  if (tokenInfo.error) {
    return jsonResponse({ error: 'Token 無效或已過期，請重新登入' });
  }
  if (tokenInfo.aud !== CLIENT_ID) {
    return jsonResponse({ error: 'Token 來源不符' });
  }

  // 4. 取得已驗證的使用者 email
  const email = tokenInfo.email;

  // 5. 查 Google Sheet，以 email 找出所屬組別
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data  = sheet.getDataRange().getValues();

  // 略過第一列標題，找到這個 email
  let groupName = null;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === email.toLowerCase()) {
      groupName = data[i][3]; // D 欄 = group
      break;
    }
  }

  if (groupName === null) {
    return jsonResponse({
      error: '查無此帳號：' + email + '，請確認使用學校信箱登入，或聯絡管理員確認是否已加入名單'
    });
  }

  // 6. 找出同組所有成員（不洩漏其他組的資料）
  const members = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][3] == groupName) { // D 欄相同 = 同組
      members.push({
        name:      String(data[i][1] || ''),  // B 欄
        class:     String(data[i][2] || ''),  // C 欄
        contact_1: String(data[i][4] || ''),  // E 欄 (Instagram)
        contact_2: String(data[i][5] || ''),  // F 欄 (Line)
        contact_3: String(data[i][6] || ''),  // G 欄 (其他)
      });
    }
  }

  return jsonResponse({ groupName: groupName, members: members });
}

// 統一的 JSON 回應格式（附上 CORS header）
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

### 第四步：重新部署 App Script

> ⚠️ 每次修改程式碼後都要重新部署，否則舊版本仍在運作。

1. 點擊右上角 **部署** → **管理部署作業**
2. 點擊右上角鉛筆圖示 ✏️
3. 版本選 **新版本**
4. 存取權限設定：
   - **執行身分**：我（你的帳號）
   - **誰可以存取**：**所有人**（包含匿名使用者）
5. 點擊 **部署**
6. 複製新的網址，填入 `script.js` 的 `scriptUrl` 變數

---

### 安全性總結

```
攻擊者拿到 App Script URL
    ↓
直接呼叫，沒有 idToken → 回傳 { error: '缺少 idToken' }  ✅

攻擊者偽造 idToken
    ↓
Google tokeninfo API 驗證失敗 → 回傳 { error: 'Token 無效' }  ✅

已登入的同學嘗試查別人的資料
    ↓
App Script 只根據已驗證的 email 查表，無法傳入其他人的 email  ✅

已登入的同學重複查詢
    ↓
只會拿到自己的組別，不影響他人資料  ✅
```
