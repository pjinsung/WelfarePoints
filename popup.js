document.getElementById('btnAutoFill').addEventListener('click', async () => {
  const btn = document.getElementById('btnAutoFill');
  const resultEl = document.getElementById('result');

  btn.disabled = true;
  btn.textContent = '처리 중...';
  resultEl.className = 'result';
  resultEl.style.display = 'none';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url || !tab.url.includes('ezwel.com')) {
      resultEl.className = 'result error';
      resultEl.textContent = '이지웰 사이트에서만 사용할 수 있습니다.';
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'autoFill' });

    if (response && response.success) {
      resultEl.className = 'result success';
      resultEl.textContent = response.message;
    } else {
      resultEl.className = 'result error';
      resultEl.textContent = response ? response.message : '응답을 받지 못했습니다.';
    }
  } catch (err) {
    resultEl.className = 'result error';
    resultEl.textContent = '오류: 페이지를 새로고침 후 다시 시도해주세요.';
  } finally {
    btn.disabled = false;
    btn.textContent = '자동 입력 실행';
  }
});
