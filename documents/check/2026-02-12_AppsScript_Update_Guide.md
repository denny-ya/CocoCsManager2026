# Apps Script API 연동을 위한 수정 가이드

## 개요
모바일 앱에서 실시간으로 데이터를 조회하기 위해서는 기존 웹 앱(Apps Script)이 HTML 대신 **JSON 데이터**를 반환하도록 수정해야 합니다.
사용 중인 4개의 서비스(Apps Script 프로젝트) 모두에 대해 아래 작업을 수행해주세요.

## 1. 수정 대상 파일: `Code.gs`

`Code.gs` 파일의 `doGet(e)` 함수를 찾아 아래 코드로 교체하거나 수정해주세요.

```javascript
function doGet(e) {
  // ---------------------------------------------------------
  // [추가된 부분] 앱에서 API 호출 시 JSON 데이터 반환
  // ---------------------------------------------------------
  if (e && e.parameter && e.parameter.type == 'json') {
    var result = [];
    
    try {
      // searchBSRework 함수가 이미 정의되어 있어야 합니다.
      // (기존 코드에 searchBSRework 함수가 있는지 확인해주세요)
      if (typeof searchBSRework === 'function') {
        result = searchBSRework(e.parameter.keyword);
      } else {
        result = { error: 'searchBSRework function not found' };
      }
    } catch (err) {
      result = { error: err.toString() };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ---------------------------------------------------------
  // [기존 코드 유지] PC/모바일 웹 브라우저 접속 처리
  // ---------------------------------------------------------
  var template = HtmlService.createTemplateFromFile('Index');
  
  // page 파라미터 처리 (기존 로직에 맞춰 유지)
  template.page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'main';

  return template.evaluate()
    .setTitle('2026 Coco CS Manager')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}
```

## 2. 주의사항
1.  **`searchBSRework` 함수 확인**: 위 코드는 `searchBSRework(keyword)` 라는 함수가 기존 코드에 존재한다고 가정합니다. 만약 함수명이 다르다면 해당 부분도 수정해야 합니다.
2.  **프로젝트 4개 모두 적용**: 서비스 1~4 각각의 Apps Script 프로젝트에 동일하게 적용해야 합니다.

## 3. 배포 (필수)
코드를 수정한 후에는 반드시 **[새 버전으로 배포]**해야 적용됩니다.
1.  우측 상단 `배포(Deploy)` 클릭
2.  `배포 관리(Manage deployments)` -> `수정(Edit)` 클릭
3.  버전(Version)을 **`새 버전(New version)`**으로 선택
4.  `배포(Deploy)` 클릭

---
*작성일: 2026-02-12*
