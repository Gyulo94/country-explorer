// ====================== 전역 변수 ======================
let allCountries = []; // 모든 국가 데이터를 저장하는 배열 (REST Countries API에서 불러온 데이터)
let currentFilter = "all"; // 현재 적용된 대륙 필터 ("all", "Asia", "Europe", "Africa" 등)
let favorites = []; // 사용자가 즐겨찾기한 국가들의 cca3 코드 배열 (로컬스토리지와 연동)

// ====================== 1. 국가 목록 렌더링 ======================
/**
 * 국가 목록을 렌더링하는 메인 함수
 * - 즐겨찾기한 국가와 일반 국가를 분리하여 표시
 * - 즐겨찾기 섹션은 상단에, 일반 국가는 그 아래에 배치
 */
function renderCountryList(countries) {
  let allCountriesListHtml = "";
  let favCountriesListHtml = "";
  const favCountries = countries.filter((c) => favorites.includes(c.cca3));
  const normalCountries = countries.filter((c) => !favorites.includes(c.cca3));
  normalCountries.forEach((country) => {
    allCountriesListHtml += createCountryCard(country, false);
  });
  favCountries.forEach((country) => {
    favCountriesListHtml += createCountryCard(country, true);
  });

  $("#countryList").html(allCountriesListHtml);
  $("#favoritesList").html(favCountriesListHtml);
}

/**
 * 개별 국가 카드를 생성하는 함수
 * - 즐겨찾기 여부에 따라 별 아이콘 스타일이 달라짐
 *
 * @param {Object} country - 국가 데이터 객체
 * @param {boolean} isFavorite - 즐겨찾기 여부
 * @returns {string} 완성된 국가 카드 HTML 문자열
 */
function createCountryCard(country, isFavorite) {
  const korName = country.translations?.kor?.common || country.name.common;
  const safeFlag = getSafeFlagUrl(
    country.name.common,
    country.flags?.png || country.flags?.svg,
  );

  const starIcon = isFavorite
    ? `<span class="text-yellow-400 font-bold text-4xl drop-shadow">★</span>`
    : `<span class="text-gray-700 font-bold hover:text-yellow-400 text-4xl transition-colors">☆</span>`;

  return `
        <div onclick="showCountryDetail('${country.cca3}')" 
             class="country-card bg-white rounded-3xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-all border border-gray-100 relative">
            
            <button onclick="event.stopImmediatePropagation(); toggleFavorite('${country.cca3}');" 
                    class="absolute top-1 right-1 z-10 p-1 transition-all hover:scale-110">
                ${starIcon}
            </button>

            <img src="${safeFlag}" alt="${korName}" class="w-full h-48 object-cover">
            
            <div class="p-5">
                <h3 class="font-semibold text-xl mb-1">${korName}</h3>
                <p class="text-gray-500 text-sm">
                    수도: ${getKoreanCapital(country.capital ? country.capital[0] : "정보 없음")}
                </p>
            </div>
        </div>
    `;
}

// ====================== 2. 데이터 로드 ======================
/**
 * 모든 국가 데이터를 REST Countries API에서 불러오는 함수
 * - 데이터 로드 후 "조선" → "북한" 치환
 * - 한글 국가명 기준으로 가나다순 정렬
 * - 로딩 스피너 표시/숨김 처리
 */
function loadAllCountries() {
  showLoading(true);
  $.ajax({
    url: "https://restcountries.com/v3.1/all?fields=name,flags,capital,cca3,population,region,subregion,languages,latlng,translations",
    success: (data) => {
      data.forEach((country) => {
        if (country.translations?.kor?.common) {
          country.translations.kor.common =
            country.translations.kor.common.replace("조선", "북한");
        }
      });

      allCountries = data.sort((a, b) => {
        const nameA = a.translations?.kor?.common;
        const nameB = b.translations?.kor?.common;
        return nameA.localeCompare(nameB, "ko-KR");
      });

      filterByContinent("all");
      showLoading(false);
    },
    error: () => showLoading(false),
  });
}

/**
 * 로딩 상태를 제어하는 함수
 * - 로딩 스피너 표시/숨김
 * - 국가 목록 표시/숨김
 *
 * @param {boolean} show - true: 로딩 중, false: 로딩 완료
 */
function showLoading(show) {
  $("#loading").toggleClass("hidden", !show);
  $("#countryList").toggleClass("hidden", show);
}

// ====================== 3. 필터링 ======================
/**
 * 대륙별로 국가 목록을 필터링하고 렌더링하는 함수
 * - 현재 선택된 필터를 저장
 * - 버튼 활성화 상태 UI 업데이트
 * - "all"인 경우 전체 국가 표시, 특정 대륙인 경우 해당 대륙만 필터링
 *
 * @param {string} continent - 필터링할 대륙 코드 ("all", "Asia", "Europe", "Africa" 등)
 */
function filterByContinent(continent) {
  currentFilter = continent;
  $("#continentFilters button").removeClass("active");
  $(`button[onclick="filterByContinent('${continent}')"]`).addClass("active");

  if (continent === "all") {
    renderCountryList(allCountries);
  } else {
    renderCountryList(allCountries.filter((c) => c.region === continent));
  }
}

/**
 * 검색 입력창에서 실시간으로 국가를 필터링하는 이벤트 핸들러
 * - 한글 국가명 기준으로 검색
 * - 검색어가 없으면 현재 선택된 대륙 필터를 적용
 */
$("#search").on("keyup", function () {
  const keyword = $(this).val().toLowerCase().trim();
  if (keyword === "") {
    filterByContinent(currentFilter);
    return;
  }

  let filtered =
    currentFilter === "all"
      ? allCountries
      : allCountries.filter((c) => c.region === currentFilter);
  const result = filtered.filter((c) =>
    c.translations?.kor?.common.includes(keyword),
  );
  renderCountryList(result);
});

// ====================== 4. 상세 모달 ======================
/**
 * 국가 상세 정보를 불러와 모달에 표시하는 함수
 * - REST Countries API에서 개별 국가 데이터를 가져옴
 * - 한글 국가명 처리, 국기, 수도, 인구, 언어, 환율, 지도 등을 표시
 * - 즐겨찾기 버튼 상태도 함께 업데이트
 *
 * @param {string} code - 국가 코드 (cca3, 예: "KOR", "USA", "JPN")
 */
function showCountryDetail(code) {
  disableBodyScroll();
  $.ajax({
    url: `https://restcountries.com/v3.1/alpha/${code}?fields=name,flags,capital,population,region,subregion,languages,latlng,translations,currencies`,
    success: function (country) {
      const displayName = country.translations?.kor?.common.replace(
        "조선",
        "북한",
      );

      const safeFlag = getSafeFlagUrl(
        country.name.common,
        country.flags?.png || country.flags?.svg,
      );

      $("#modalCountryName").text(displayName);

      $("#modalFlag").attr("src", safeFlag);
      $("#modalCapital").text(
        getKoreanCapital(country.capital ? country.capital[0] : "정보 없음"),
      );
      $("#modalRegion").text(
        getKoreanRegion(country.region) || country.region || "정보 없음",
      );
      $("#modalPopulation").text(
        (country.population || 0).toLocaleString() + " 명",
      );
      $("#modalLanguages").text(getKoreanLanguages(country.languages));

      $("#detailModal").removeClass("hidden");
      const isFavorite = favorites.includes(code);
      $("#favoriteBtn")
        .text(isFavorite ? "★" : "☆")
        .toggleClass("text-yellow-400", isFavorite)
        .toggleClass("text-gray-700", !isFavorite)
        .off("click")
        .on("click", () => toggleFavorite(code));
      if (country.latlng && country.latlng.length === 2) {
        initMap(country.latlng[0], country.latlng[1], displayName);
      }
      renderCurrencyAndCalculator(country);
      initMapWithBorder(country);
    },
    error: function () {
      alert("상세 정보를 불러올 수 없습니다.");
    },
  });
}

/**
 * 모달 내부 지도에 국가 위치 마커와 국경을 함께 표시하는 함수
 *
 * 1. 기본 지도 초기화 (마커 표시)
 * 2. GeoJSON 데이터가 없으면 로드
 * 3. 해당 국가의 국경 하이라이트 표시
 *
 * @param {Object} country - 국가 데이터 객체 (latlng, translations 포함)
 */
async function initMapWithBorder(country) {
  if (country.latlng && country.latlng.length === 2) {
    initMap(
      country.latlng[0],
      country.latlng[1],
      country.translations?.kor?.common,
    );

    if (!countriesGeoJSON) {
      await loadCountriesGeoJSON();
    }
    highlightCountryBorderInModal(country.translations?.kor?.common);
  }
}

// ====================== 5. 즐겨찾기 ======================
/**
 * 국가의 즐겨찾기 상태를 토글(추가/제거)하는 함수
 *
 * - 즐겨찾기에 이미 있으면 제거
 * - 없으면 추가
 * - UI(모달 내 별 버튼)와 로컬스토리지, 목록을 모두 업데이트
 *
 * @param {string} cca3 - 국가 코드 (예: "KOR", "USA")
 */
function toggleFavorite(cca3) {
  if (favorites.includes(cca3)) {
    favorites = favorites.filter((code) => code !== cca3);
    $("#favoriteBtn")
      .text("☆")
      .removeClass("text-yellow-400")
      .addClass("text-gray-300");
  } else {
    favorites.push(cca3);
    $("#favoriteBtn")
      .text("★")
      .addClass("text-yellow-400")
      .removeClass("text-gray-300");
  }

  localStorage.setItem("countryFavorites", JSON.stringify(favorites));
  renderCountryList(allCountries);
}

// ====================== 6. 기타 이벤트 ======================
/**
 * 모달 배경 클릭 시 모달을 닫는 이벤트
 * - 모달 내부를 클릭하면 닫히지 않도록 e.target.id 체크
 */
$("#detailModal").on("click", function (e) {
  if (e.target.id === "detailModal") closeModal();
});

/**
 * 키보드 ESC 키를 누르면 현재 열려있는 모달을 닫음
 * - 접근성(Accessibility)과 사용자 편의성을 위한 기능
 */
$(document).on("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

/**
 * 문서가 완전히 로드된 후 실행되는 초기화 함수
 * - 로컬스토리지에서 즐겨찾기 데이터 복원
 * - 환율 데이터와 국가 데이터 로드 시작
 */
$(document).ready(() => {
  const savedFavorites = localStorage.getItem("countryFavorites");
  if (savedFavorites) {
    favorites = JSON.parse(savedFavorites);
  }
  loadAllExchangeRates();
  loadAllCountries();
});
