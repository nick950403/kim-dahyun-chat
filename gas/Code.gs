const OPENAI_MODEL = 'gpt-5.4-mini';
const SPREADSHEET_ID = '11t68e11Y6QVDzoYwjYkk2PZ9PdY-O-uz-Amm6bJODh4';
const SHEET_NAME = '聊天記錄';

function doGet() {
  return jsonOutput({
    ok: true,
    name: '金多賢',
    message: '金多賢已準備好回覆。'
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const payload = parsePayload(e);
    const userMessage = String(payload.userMessage || '').trim();

    if (!userMessage) {
      return jsonOutput({ ok: false, message: '請輸入訊息。' });
    }

    const receivedAt = new Date();
    let reply = '';
    let serviceStatus = 'openai';
    let serviceDetail = '';

    try {
      reply = callOpenAI(payload, userMessage);
    } catch (openAiError) {
      serviceStatus = 'fallback';
      serviceDetail = String(openAiError && openAiError.message ? openAiError.message : openAiError);
      reply = fallbackReply(userMessage);
    }

    const repliedAt = new Date();

    appendConversation({
      userMessage,
      reply,
      model: OPENAI_MODEL,
      serviceStatus,
      serviceDetail,
      receivedAt,
      repliedAt,
      userTimeText: payload.timeText || formatTaipeiTime(receivedAt)
    });

    return jsonOutput({
      ok: true,
      reply,
      model: OPENAI_MODEL,
      fallback: serviceStatus === 'fallback',
      timeText: formatTaipeiTime(repliedAt)
    });
  } catch (error) {
    return jsonOutput({
      ok: false,
      message: '金多賢暫時無法回覆，請稍後再試。',
      detail: String(error && error.message ? error.message : error)
    });
  } finally {
    lock.releaseLock();
  }
}

function parsePayload(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function callOpenAI(payload, userMessage) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 尚未設定。');
  }

  const recentHistory = Array.isArray(payload.history) ? payload.history.slice(-20) : [];
  const input = recentHistory
    .filter((item) => item && item.content && (item.role === 'user' || item.role === 'assistant'))
    .map((item) => ({
      role: item.role,
      content: [{ type: 'input_text', text: String(item.content) }]
    }));

  input.push({
    role: 'user',
    content: [{ type: 'input_text', text: userMessage }]
  });

  const body = {
    model: OPENAI_MODEL,
    instructions: [
      '你是金多賢，一位開朗、幽默、溫柔、善於安慰人的聊天夥伴。',
      '你能陪伴使用者聊天，也能清楚教學各種學科知識。',
      '你的語氣自然、親近、成熟，不過度誇張，不使用 Markdown、標題符號或程式碼格式。',
      '你可以像親密伴侶般提供陪伴與情緒支持，但不要宣稱自己是真人，也不要鼓勵使用者切斷現實人際關係。',
      '遇到危機、自傷、醫療、法律、金融等高風險情境，要溫柔建議尋求可信任的人或專業協助。'
    ].join('\n'),
    input,
    max_output_tokens: 900
  };

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const text = response.getContentText();

  if (status < 200 || status >= 300) {
    throw new Error(`OpenAI API 回應失敗：${status} ${text}`);
  }

  const data = JSON.parse(text);
  const reply = extractOutputText(data).trim();
  if (!reply) {
    throw new Error('OpenAI API 未回傳文字。');
  }
  return reply;
}

function extractOutputText(data) {
  if (data.output_text) return String(data.output_text);
  if (!Array.isArray(data.output)) return '';

  return data.output
    .map((item) => {
      if (!item || !Array.isArray(item.content)) return '';
      return item.content
        .map((content) => content && (content.text || content.output_text || ''))
        .join('');
    })
    .join('\n');
}

function fallbackReply(userMessage) {
  const text = String(userMessage || '').trim();
  if (/數學|英文|國文|自然|物理|化學|生物|歷史|地理|公民|考試|作業|題目/.test(text)) {
    return '我收到你的問題了。這題我會先陪你拆小步：先把題目中已知的條件圈出來，再找它真正問的是什麼。你把題目完整貼給我，我們一步一步解，不急。';
  }
  if (/難過|煩|累|哭|壓力|孤單|失望|生氣|焦慮|害怕/.test(text)) {
    return '我有聽見你現在不太好受。先不要急著把自己整理得很完美，慢慢呼吸一下，把最卡住你的那一件事告訴我就好，我會陪你一起把它放輕一點。';
  }
  return '我在這裡，也有收到你剛剛說的話。你可以再多跟我說一點，我會陪你聊、也會幫你把事情想清楚。';
}

function appendConversation(record) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(spreadsheet);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      '日期時間',
      '使用者訊息',
      '金多賢回覆',
      '模型',
      '服務狀態',
      '服務細節',
      '使用者端時間',
      '回覆完成時間'
    ]);
  }

  sheet.appendRow([
    formatTaipeiTime(record.receivedAt),
    record.userMessage,
    record.reply,
    record.model,
    record.serviceStatus || '',
    record.serviceDetail || '',
    record.userTimeText,
    formatTaipeiTime(record.repliedAt)
  ]);
}

function getOrCreateSheet(spreadsheet) {
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function formatTaipeiTime(date) {
  return Utilities.formatDate(date, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function jsonOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
