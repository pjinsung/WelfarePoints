# 복지포인트 자동입력 Chrome Extension

이지웰(ezwel) 복지카드 차감신청 페이지에서 가용 복지포인트 범위 내로 자동 체크 및 금액 입력을 수행하는 Chrome 확장 프로그램입니다.

## 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | 복지포인트 자동입력 |
| 버전 | 1.0.0 |
| Manifest | V3 |
| 대상 사이트 | `https://netmarbleneo.ezwel.com/pc/customer/welfarecard/subtraction-requisition` |
| 대상 페이지 | 복지카드 차감신청 (사용내역 조회) |

## 기능

1. **가용 복지포인트 자동 인식** - 페이지 하단의 "가용 복지포인트" 금액을 읽어옴
2. **자동 체크** - 테이블의 각 행을 위에서부터 순회하며 체크박스 선택
3. **금액 자동 입력** - 각 행의 "결제" 금액을 "신청 복지포인트" 입력란에 자동 입력
4. **포인트 한도 준수** - 누적 신청 금액이 가용 복지포인트를 초과하면 해당 행은 건너뜀

## 프로젝트 구조

```
WelfarePoints/
├── manifest.json       # Chrome Extension Manifest V3 설정
├── content.js          # Content Script (자동 체크/입력 핵심 로직)
├── popup.html          # 팝업 UI (실행 버튼, 결과 표시)
├── popup.js            # 팝업 동작 (버튼 클릭 → content script 메시지)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## 파일별 상세

### manifest.json
- Manifest V3 기반
- 권한: `activeTab`, `scripting`
- Content Script가 `https://netmarbleneo.ezwel.com/*` 도메인에서 자동 주입 (`document_idle`)

### content.js
핵심 로직을 담은 Content Script.

| 함수 | 설명 |
|------|------|
| `parseNumber(str)` | 콤마가 포함된 금액 문자열을 숫자로 변환 (예: `"5,500"` → `5500`) |
| `sleep(ms)` | 비동기 대기 (Vue 반응성 타이밍 확보용) |
| `triggerVueInput(el, value)` | Vue.js의 반응성 시스템을 우회하여 input 값을 설정. `HTMLInputElement.prototype.value`의 native setter를 사용한 후 `input`/`change` 이벤트 디스패치 |
| `triggerClick(el)` | 체크박스 클릭 트리거 |
| `autoFillWelfarePoints()` | 메인 로직 - 가용 포인트 읽기 → 행 순회 → 체크 → 입력 |

**동작 흐름:**
1. `.info-item` 요소에서 "가용 복지포인트" 텍스트를 찾아 금액 파싱
2. `.tbl-type tbody tr` 행을 순회
3. 각 행의 5번째 td(결제 금액)에서 `<em>` 태그의 금액 읽기
4. 누적합 + 결제금액 > 가용 포인트이면 건너뜀
5. 체크박스 미선택 시 클릭 → 300ms 대기 (Vue 반응성)
6. 6번째 td(신청 복지포인트)의 input에 결제 금액 입력
7. `chrome.runtime.onMessage`로 popup과 통신

### popup.html / popup.js
확장 아이콘 클릭 시 표시되는 팝업 UI.

- **"자동 입력 실행"** 버튼 클릭 시 `content.js`에 `{ action: 'autoFill' }` 메시지 전송
- 현재 탭이 이지웰 사이트가 아닌 경우 에러 표시
- 처리 결과(성공/실패)를 색상으로 구분하여 표시
  - 성공(초록): 선택 건수, 입력 총액, 가용 포인트 표시
  - 실패(빨강): 에러 메시지 표시

## 설치 방법

1. Chrome 브라우저에서 `chrome://extensions` 접속
2. 우측 상단 **개발자 모드** 활성화
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. `H:\Project\WelfarePoints` 폴더 선택

## 사용 방법

1. 이지웰 사이트 로그인 후 **복지카드 차감신청** 페이지 이동
2. 사용내역이 테이블에 표시된 상태에서 Chrome 툴바의 확장 아이콘 클릭
3. **"자동 입력 실행"** 버튼 클릭
4. 자동 체크 및 입력 완료 후 결과 확인
5. **"차감 신청하기"** 버튼은 직접 클릭

## 기술 노트

- **Vue.js 대응**: 대상 사이트가 Vue.js 기반이므로, 체크박스 클릭 시 300ms 딜레이를 두어 Vue 반응성이 DOM을 업데이트(input readonly/disabled 해제)할 시간을 확보합니다.
- **Native Setter 사용**: Vue가 `Object.defineProperty`로 input의 value를 감시하므로, `HTMLInputElement.prototype.value`의 native setter를 직접 호출한 후 `input`/`change` 이벤트를 디스패치하여 Vue의 v-model 바인딩을 트리거합니다.
- **에러 핸들링**: content script의 메시지 리스너에 `.catch()` 처리가 되어 있어, 에러 발생 시 popup이 무한 대기하지 않습니다.

## 제한사항

- 이지웰 사이트의 HTML 구조가 변경되면 셀렉터 수정이 필요할 수 있음
- 테이블 컬럼 순서에 의존 (결제: 5번째 td, 신청 복지포인트: 6번째 td)
- 사이트 로딩 속도에 따라 Vue 반응성 대기 시간(300ms) 조정이 필요할 수 있음
