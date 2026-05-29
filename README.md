# 金多賢聊天頁面

這是一個可部署到 GitHub Pages 的單頁聊天介面，前端會呼叫 Google Apps Script Web App，並由 GAS 後台使用 OpenAI API 產生回覆、把完整聊天記錄寫入 Google 試算表。

## 前端

- 入口檔案：`index.html`
- GAS Web App：`https://script.google.com/macros/s/AKfycbxf91Z-zGY2RfsJ4G3zyI7WbaR-MNFwkBdvY1oAnA__MyMRx1kNbfGqJDwKjafULKba/exec`
- 模型：`gpt-5-mini`
- 試算表 ID：`11t68e11Y6QVDzoYwjYkk2PZ9PdY-O-uz-Amm6bJODh4`

## GAS 後台

`gas/Code.gs` 是對應前端的後台範例。它會：

- 讀取 Script Properties 裡的 `OPENAI_API_KEY`
- 使用 OpenAI Responses API 呼叫 `gpt-5-mini`
- 建立或使用 `聊天記錄` 工作表
- 記錄日期時間、使用者訊息、金多賢回覆、模型、服務狀態、使用者端時間、回覆完成時間

部署 GAS 時，Web App 權限請使用可被前端頁面呼叫的設定。
