// 복지포인트 자동입력 Content Script
// 이지웰 복지카드 차감신청 페이지에서 동작

function parseNumber(str) {
  return parseInt(str.replace(/[^0-9]/g, ''), 10) || 0;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Vue 반응성을 트리거하기 위한 이벤트 디스패치
function triggerVueInput(el, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  ).set;
  nativeInputValueSetter.call(el, value);

  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function triggerClick(el) {
  el.click();
}

// 사용내역 조회: "3개월" 선택 후 "조회하기" 클릭
async function searchUsageHistory() {
  // "3개월" 라디오 버튼 클릭 (label 텍스트로 찾아서 input을 직접 클릭)
  const buttons = document.querySelectorAll('.common-radio-btn button.btn-type05.v1');
  let threeMonthRadio = null;

  for (const btn of buttons) {
    const label = btn.querySelector('label');
    if (label && label.textContent.trim() === '3개월') {
      threeMonthRadio = btn.querySelector('input[type="radio"]');
      break;
    }
  }

  if (!threeMonthRadio) {
    return { success: false, message: '"3개월" 버튼을 찾을 수 없습니다.' };
  }

  triggerClick(threeMonthRadio);

  // "조회하기" 버튼 클릭
  const searchBtn = document.querySelector('button.btn-type05.v5');
  if (!searchBtn) {
    return { success: false, message: '"조회하기" 버튼을 찾을 수 없습니다.' };
  }

  triggerClick(searchBtn);
  await sleep(300);

  // 조회 결과 로드 대기 (행이 존재할 때까지)
  const maxWait = 10000;
  const interval = 300;
  let waited = 0;

  while (waited < maxWait) {
    await sleep(interval);
    waited += interval;
    if (document.querySelector('.tbl-type tbody tr')) {
      return { success: true };
    }
  }

  return { success: false, message: '조회 결과가 로드되지 않았습니다. (시간 초과)' };
}

async function autoFillWelfarePoints() {
  // 0. 사용내역 조회 (3개월)
  const searchResult = await searchUsageHistory();
  if (!searchResult.success) {
    return searchResult;
  }

  // 1. 가용 복지포인트 읽기
  const infoItems = document.querySelectorAll('.info-item');
  let availablePoints = 0;

  for (const item of infoItems) {
    const titleEl = item.querySelector('.tit');
    if (titleEl && titleEl.textContent.trim().includes('가용 복지포인트')) {
      const numEl = item.querySelector('.num strong em');
      if (numEl) {
        availablePoints = parseNumber(numEl.textContent);
      }
      break;
    }
  }

  if (availablePoints <= 0) {
    return { success: false, message: '가용 복지포인트가 0이거나 찾을 수 없습니다.' };
  }

  // 2. 테이블 행 순회
  const rows = document.querySelectorAll('.tbl-type tbody tr');
  let totalApplied = 0;
  let checkedCount = 0;

  for (const row of rows) {
    const checkbox = row.querySelector('.chk-box input[type="checkbox"]');
    if (!checkbox) continue;

    // 결제 금액 읽기
    const tds = row.querySelectorAll('td');
    // 5번째 td가 결제 금액 (0-indexed: 4)
    const paymentTd = tds[4];
    if (!paymentTd) continue;

    const paymentEm = paymentTd.querySelector('em');
    if (!paymentEm) continue;

    const paymentAmount = parseNumber(paymentEm.textContent);
    if (paymentAmount <= 0) continue;

    // 가용 포인트 초과 여부 확인
    if (totalApplied + paymentAmount > availablePoints) continue;

    // 3. 체크박스 클릭 (아직 체크 안 된 경우만)
    if (!checkbox.checked) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      triggerClick(checkbox);
      await sleep(300); // Vue 반응성 대기: 체크 후 input 활성화
    }

    // 4. 신청 복지포인트 입력 (6번째 td, 0-indexed: 5)
    const welfareInputTd = tds[5];
    if (!welfareInputTd) continue;

    const welfareInput = welfareInputTd.querySelector('input[type="text"]');
    if (!welfareInput) continue;

    // readonly/disabled 해제 확인 후 입력
    const formattedAmount = paymentAmount.toLocaleString();
    triggerVueInput(welfareInput, formattedAmount);

    totalApplied += paymentAmount;
    checkedCount++;
  }

  return {
    success: true,
    message: `완료! ${checkedCount}건 선택, 총 ${totalApplied.toLocaleString()}원 입력 (가용: ${availablePoints.toLocaleString()}원)`,
    checkedCount,
    totalApplied,
    availablePoints
  };
}

// popup에서 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'autoFill') {
    autoFillWelfarePoints()
      .then(result => sendResponse(result))
      .catch(() => sendResponse({ success: false, message: '처리 중 오류가 발생했습니다.' }));
    return true; // async sendResponse
  }
});
