// ====================== 환율 관련 전역 변수 ======================
let exchangeRates = {}; // 환율 데이터 저장소 (예: { "USD": 1382.45, "EUR": 1512.30, ... })
let lastExchangeUpdate = null; // 마지막으로 환율을 업데이트한 시간 (Date 객체)

// ====================== 1. 환율 데이터 로드 ======================
/**
 * 전세계 환율 정보를 KRW 기준으로 불러오는 함수
 */
function loadAllExchangeRates() {
  const fetchRates = () => {
    $.ajax({
      url: "https://api.frankfurter.dev/v2/rates?base=KRW",
      type: "GET",
      dataType: "json",
      timeout: 15000,
      success: function (data) {
        if (data && data.rates) {
          exchangeRates = data.rates;
          lastExchangeUpdate = new Date();
        } else if (data && Array.isArray(data)) {
          exchangeRates = {};
          data.forEach((item) => {
            if (item.quote && item.rate) {
              exchangeRates[item.quote] = item.rate;
            }
          });
          lastExchangeUpdate = new Date();
        }
      },
      error: function (xhr, status, error) {
        console.error("v2 환율 로드 실패:", status, error);
      },
    });
  };

  fetchRates();
}

// ====================== 2. 모달에 화폐 정보 & 환율 & 계산기 표시 ======================
/**
 * 모달에 화폐 정보, 환율, 계산기를 렌더링하는 함수
 * @param {Object} country - REST Countries API에서 가져온 국가 데이터
 */
function renderCurrencyAndCalculator(country) {
  const currencies = country.currencies || {};
  const currencyCodes = Object.keys(currencies);

  if (currencyCodes.length === 0) {
    $("#modalCurrencyInfo").html(
      '<span class="text-gray-400">화폐 정보 없음</span>',
    );
    $("#exchangeCalculator").html("");
    return;
  }

  let currencyHtml = "";
  let calculatorHtml = "";

  currencyCodes.forEach((code) => {
    const info = currencies[code];
    const name = info?.name || code;
    const symbol = info?.symbol ? ` (${info.symbol})` : "";

    let rate = exchangeRates[code] || exchangeRates[code.toUpperCase()];

    const displayRate = rate && rate < 1 ? 1 / rate : rate || 0;

    let rateText = displayRate
      ? `<span class="text-blue-600 font-medium">${Number(displayRate).toLocaleString()} KRW</span>`
      : `<span class="text-amber-500">환율 데이터 없음</span>`;

    currencyHtml += `
            <div class="flex justify-between py-2 border-b last:border-none">
                <span class="font-medium">${code}${symbol}</span>
                <span class="text-right">1 ${code} ≈ ${rateText}</span>
            </div>
        `;

    if (!calculatorHtml && displayRate > 0) {
      calculatorHtml = `
                <div class="mt-6 bg-white border border-gray-200 rounded-2xl p-6">
                  <div
                       class="flex flex-col md:flex-row gap-4 items-center justify-center md:justify-between"
                     >
                       <div class="flex-1">
                         <input
                           id="localAmount"
                           type="text"
                           value="1"
                           class="w-full text-2xl font-semibold bg-transparent focus:outline-none text-center md:text-right"
                         />
                         <div class="text-sm text-gray-500 mt-1 text-center md:text-right">
                           ${code}${symbol}
                         </div>
                       </div>
                       <div class="text-4xl text-gray-300 text-center px-3">≈</div>
                       <div class="flex-1">
                         <input
                           id="krwAmount"
                           type="text"
                           class="w-full text-2xl text-center md:text-left font-semibold bg-transparent focus:outline-none"
                         />
                         <div class="text-sm text-gray-500 text-center md:text-left mt-1">
                           대한민국 원 (KRW)
                         </div>
                       </div>
                     </div>
                  <div id="calcRateInfo" class="text-center text-xs text-gray-400 mt-4">
                      1 ${code} = ${Number(displayRate || finalRate || rate).toLocaleString()} KRW
                      </div>
                      <div class="text-xs text-gray-400 text-center md:text-right">
                         마지막 업데이트: ${lastExchangeUpdate.toLocaleString("ko-KR")}
                 </div>  
              </div>
            `;
    }
  });

  $("#modalCurrencyInfo").html(currencyHtml);
  $("#exchangeCalculator").html(
    calculatorHtml ||
      '<div class="text-gray-400 py-8 text-center">환율 계산기를 사용할 수 없습니다.</div>',
  );

  if (currencyCodes[0]) {
    if (currencyCodes[0] === "CKD" || currencyCodes[0] === "CUC") {
      setupCalculatorEvents(currencyCodes[1]);
    }

    setupCalculatorEvents(currencyCodes[0]);
  }
}

// ====================== 3. 환율 계산기 이벤트 설정 ======================
/**
 * 환율 계산기 이벤트 설정 함수
 * - 입력 필드의 실시간 계산
 * - 포커스 아웃 시 콤마 정리
 * - KRW와 외국 화폐 간 환율 계산 처리
 *
 * @param {string} currencyCode - 계산에 사용할 통화 코드 (예: "USD", "EUR", "JPY")
 */
function setupCalculatorEvents(currencyCode) {
  let rate =
    exchangeRates[currencyCode] || exchangeRates[currencyCode.toUpperCase()];
  if (!rate) return;

  const finalRate = rate < 1 ? 1 / rate : rate;

  function formatWithComma(num, decimals = 3) {
    if (num === 0 || isNaN(num)) return "0";
    return Number(num.toFixed(decimals)).toLocaleString("ko-KR");
  }

  $("#localAmount, #krwAmount")
    .off("input")
    .on("input", function () {
      let rawValue = this.value.replace(/,/g, "");
      let numValue = parseFloat(rawValue) || 0;

      if (rawValue === "" || numValue === 0) {
        if (this.id === "krwAmount") $("#localAmount").val("0");
        else $("#krwAmount").val("0");
        return;
      }

      if (this.id === "krwAmount") {
        const result = numValue / finalRate;
        $("#localAmount").val(formatWithComma(result, 3));
      } else {
        const result = numValue * finalRate;
        $("#krwAmount").val(formatWithComma(result, 3));
      }

      $("#calcRateInfo").html(
        `1 ${currencyCode} = ${finalRate.toFixed(3)} KRW`,
      );
    });

  $("#localAmount, #krwAmount")
    .off("blur")
    .on("blur", function () {
      let rawValue = this.value.replace(/,/g, "");
      let numValue = parseFloat(rawValue) || 0;
      if (numValue > 0) {
        this.value = formatWithComma(numValue, 3);
      } else {
        this.value = "0";
      }
    });

  $("#localAmount").val("1");
  $("#krwAmount").val(formatWithComma(1 * finalRate, 3));
}
