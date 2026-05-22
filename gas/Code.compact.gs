const OPENAI_MODEL = 'gpt-5.4-mini';
const SPREADSHEET_ID = '11t68e11Y6QVDzoYwjYkk2PZ9PdY-O-uz-Amm6bJODh4';
const SHEET_NAME = '\u804a\u5929\u8a18\u9304';

function doGet() {
  return out({ ok: true, message: '\u91d1\u591a\u8ce2\u5df2\u6e96\u5099\u597d\u56de\u8986\u3002' });
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents || '{}');
    var userMessage = String(payload.userMessage || '').trim();
    if (!userMessage) return out({ ok: false, message: '\u8acb\u8f38\u5165\u8a0a\u606f\u3002' });
    var reply = askOpenAI(userMessage);
    writeSheet(userMessage, reply, payload.timeText || taipei(new Date()));
    return out({ ok: true, reply: reply, model: OPENAI_MODEL, timeText: taipei(new Date()) });
  } catch (err) {
    return out({ ok: false, reply: '\u6211\u73fe\u5728\u9023\u7dda\u6709\u9ede\u4e0d\u9806\uff0c\u4f46\u6211\u6c92\u6709\u96e2\u958b\u3002\u4f60\u53ef\u4ee5\u518d\u9001\u4e00\u6b21\uff0c\u6211\u6703\u63a5\u8457\u966a\u4f60\u3002', detail: String(err && err.message ? err.message : err) });
  }
}

function askOpenAI(userMessage) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY missing');
  var body = {
    model: OPENAI_MODEL,
    instructions: '\u4f60\u662f\u91d1\u591a\u8ce2\uff0c\u958b\u6717\u3001\u5e7d\u9ed8\u3001\u6eab\u67d4\u3001\u64c5\u9577\u5b89\u6170\u8207\u5b78\u79d1\u6559\u5b78\u3002\u56de\u8986\u8981\u81ea\u7136\u89aa\u8fd1\uff0c\u4e0d\u4f7f\u7528 Markdown\u3002',
    input: userMessage,
    max_output_tokens: 800
  };
  var res = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + apiKey },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code < 200 || code >= 300) throw new Error('OpenAI API failed: ' + code + ' ' + text);
  var data = JSON.parse(text);
  if (data.output_text) return String(data.output_text);
  if (data.output && data.output[0] && data.output[0].content && data.output[0].content[0]) {
    return String(data.output[0].content[0].text || '');
  }
  throw new Error('No OpenAI text output');
}

function writeSheet(userMessage, reply, userTimeText) {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(['\u65e5\u671f\u6642\u9593', '\u4f7f\u7528\u8005\u8a0a\u606f', '\u91d1\u591a\u8ce2\u56de\u8986', '\u6a21\u578b', '\u4f7f\u7528\u8005\u7aef\u6642\u9593']);
  sheet.appendRow([taipei(new Date()), userMessage, reply, OPENAI_MODEL, userTimeText]);
}

function taipei(date) {
  return Utilities.formatDate(date, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function out(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
