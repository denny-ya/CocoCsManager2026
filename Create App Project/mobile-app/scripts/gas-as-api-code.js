/**
 * AS 일일실적 GAS API
 * 스프레드시트 ID: 1FvByt2ivNffTArrTaKYX9Cawze-30YL2paHlKUsukGY
 * 
 * 핵심 열 (0-indexed):
 *  0: 완료구분 (완료/미완료)
 *  1: 접수상태 (접수대기/방문약속/...)
 *  2: 상태구분 (전화상담(미출동)/...)
 *  7: 파트 (서비스1~4)
 *  9: 담당마스터
 * 12: 접수일자 (yyyy-MM-dd)
 * 24: 완료일자
 * 34: 접수취소일자
 * 37: 리드타임(고객)
 * 42: 지점 (센터 분류)
 */

var AS_SHEET_ID = '1FvByt2ivNffTArrTaKYX9Cawze-30YL2paHlKUsukGY';

// 열 인덱스 상수
var COL = {
    COMPLETE_STATUS: 0,   // 완료구분
    RECEIPT_STATUS: 1,    // 접수상태
    STATUS_TYPE: 2,       // 상태구분
    PART: 7,              // 파트
    MASTER: 9,            // 담당마스터
    RECEIPT_DATE: 12,     // 접수일자
    COMPLETE_DATE: 24,    // 완료일자
    CANCEL_DATE: 34,      // 접수취소일자
    LEAD_TIME: 37,        // 리드타임(고객)
    BRANCH: 42,           // 지점
};

function doGet(e) {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'html';

    if (action === 'ping') {
        return jsonResponse({ success: true, message: 'AS API 연결 성공' });
    }

    if (action === 'asPerformance') {
        var month = e.parameter.month || '';  // 예: "2026-02"
        var date = e.parameter.date || '';    // 예: "2026-02-27"
        var result = getAsPerformance(month, date);
        return jsonResponse(result);
    }

    return jsonResponse({ success: false, error: '알 수 없는 action: ' + action });
}

function jsonResponse(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// AS 실적 데이터 집계
// ============================================================

function getAsPerformance(monthStr, dateStr) {
    try {
        var ss = SpreadsheetApp.openById(AS_SHEET_ID);
        var sheet = ss.getSheets()[0];
        var data = sheet.getDataRange().getValues();

        // 날짜 기준 설정
        var today = dateStr || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
        var targetMonth = monthStr || today.substring(0, 7); // "2026-02"

        // 4일 전 기준
        var todayDate = new Date(today);
        var fourDaysAgo = new Date(todayDate);
        fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
        var fourDaysAgoStr = Utilities.formatDate(fourDaysAgo, 'Asia/Seoul', 'yyyy-MM-dd');

        // 집계 구조: 파트 → 지점 → 마스터
        var serviceMap = {};
        var grandTotal = createEmptyStats();

        for (var i = 1; i < data.length; i++) {
            var row = data[i];
            var receiptDate = formatDateValue(row[COL.RECEIPT_DATE]);
            if (!receiptDate) continue;

            // 월 필터
            if (!receiptDate.startsWith(targetMonth)) continue;

            var part = String(row[COL.PART] || '').trim();
            var branch = String(row[COL.BRANCH] || '').trim();
            var master = String(row[COL.MASTER] || '').trim();
            var completeStatus = String(row[COL.COMPLETE_STATUS] || '').trim();
            var receiptStatus = String(row[COL.RECEIPT_STATUS] || '').trim();
            var statusType = String(row[COL.STATUS_TYPE] || '').trim();
            var completeDate = formatDateValue(row[COL.COMPLETE_DATE]);
            var cancelDate = formatDateValue(row[COL.CANCEL_DATE]);
            var leadTime = parseFloat(row[COL.LEAD_TIME]) || 0;

            if (!part || !master) continue;

            var isToday = (receiptDate === today);
            var isCompleted = (completeStatus === '완료');
            var isCompletedToday = isCompleted && (completeDate === today);
            var isNoVisit = (statusType === '전화상담(미출동)');
            var isIncomplete = (completeStatus === '미완료');
            var isPending = isIncomplete && (receiptStatus === '접수대기');
            var isOverdue = isIncomplete && (receiptDate <= fourDaysAgoStr);
            var isCancelled = !!cancelDate;
            var isCancelledToday = isCancelled && (cancelDate === today);

            // 서비스 맵 초기화
            if (!serviceMap[part]) {
                serviceMap[part] = { stats: createEmptyStats(), centers: {} };
            }
            if (!serviceMap[part].centers[branch]) {
                serviceMap[part].centers[branch] = { stats: createEmptyStats(), masters: {} };
            }
            if (!serviceMap[part].centers[branch].masters[master]) {
                serviceMap[part].centers[branch].masters[master] = createEmptyStats();
            }

            var targets = [
                grandTotal,
                serviceMap[part].stats,
                serviceMap[part].centers[branch].stats,
                serviceMap[part].centers[branch].masters[master]
            ];

            // 집계
            for (var t = 0; t < targets.length; t++) {
                var s = targets[t];
                // AS건수
                s.asCountCumulative++;
                if (isToday) s.asCountDaily++;

                // AS완료
                if (isCompleted) {
                    if (isNoVisit) {
                        s.noVisitCumulative++;
                        if (isCompletedToday) s.noVisitDaily++;
                    } else {
                        s.visitCumulative++;
                        if (isCompletedToday) s.visitDaily++;
                    }
                }

                // 미완료
                if (isIncomplete) {
                    s.incompleteTotal++;
                    if (isPending) s.incompletePending++;
                    if (isOverdue) s.incompleteOverdue++;
                }

                // 리드타임 (완료 건만)
                if (isCompleted && leadTime > 0) {
                    s.leadTimeSum += leadTime;
                    s.leadTimeCount++;
                }

                // 접수취소
                if (isCancelled) {
                    s.cancelledCumulative++;
                    if (isCancelledToday) s.cancelledDaily++;
                }
            }
        }

        // 결과 정리
        var servicesResult = [];
        var serviceOrder = ['서비스1', '서비스2', '서비스3', '서비스4'];

        for (var si = 0; si < serviceOrder.length; si++) {
            var svcName = serviceOrder[si];
            var svc = serviceMap[svcName];
            if (!svc) continue;

            var centersResult = [];
            for (var branchName in svc.centers) {
                var center = svc.centers[branchName];
                var mastersResult = [];

                for (var masterName in center.masters) {
                    mastersResult.push({
                        name: masterName,
                        stats: finalizeStats(center.masters[masterName])
                    });
                }

                // 마스터를 이름순 정렬
                mastersResult.sort(function (a, b) { return a.name.localeCompare(b.name); });

                centersResult.push({
                    name: branchName,
                    stats: finalizeStats(center.stats),
                    masters: mastersResult
                });
            }

            // 센터를 이름순 정렬
            centersResult.sort(function (a, b) { return a.name.localeCompare(b.name); });

            servicesResult.push({
                name: svcName,
                stats: finalizeStats(svc.stats),
                centers: centersResult
            });
        }

        return {
            success: true,
            data: {
                date: today,
                month: targetMonth,
                summary: finalizeStats(grandTotal),
                services: servicesResult
            }
        };

    } catch (e) {
        return { success: false, error: e.message };
    }
}

function createEmptyStats() {
    return {
        asCountDaily: 0,
        asCountCumulative: 0,
        noVisitDaily: 0,
        noVisitCumulative: 0,
        visitDaily: 0,
        visitCumulative: 0,
        incompleteTotal: 0,
        incompletePending: 0,
        incompleteOverdue: 0,
        leadTimeSum: 0,
        leadTimeCount: 0,
        cancelledDaily: 0,
        cancelledCumulative: 0,
    };
}

function finalizeStats(s) {
    var lt = s.leadTimeCount > 0 ? +(s.leadTimeSum / s.leadTimeCount).toFixed(1) : 0;
    return {
        asCount: { daily: s.asCountDaily, cumulative: s.asCountCumulative },
        completed: {
            noVisit: { daily: s.noVisitDaily, cumulative: s.noVisitCumulative },
            visit: { daily: s.visitDaily, cumulative: s.visitCumulative },
        },
        incomplete: {
            total: s.incompleteTotal,
            pending: s.incompletePending,
            incomplete: s.incompleteTotal - s.incompletePending,
            overdue: s.incompleteOverdue,
        },
        leadTime: lt,
        cancelled: { daily: s.cancelledDaily, cumulative: s.cancelledCumulative },
    };
}

function formatDateValue(val) {
    if (!val) return '';
    if (val instanceof Date) {
        return Utilities.formatDate(val, 'Asia/Seoul', 'yyyy-MM-dd');
    }
    var str = String(val).trim();
    if (str.length >= 10) return str.substring(0, 10);
    return str;
}
