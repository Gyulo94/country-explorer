// ====================== 세계지도 관련 전역 변수 ======================
let worldMapInstance = null; // 세계지도 Leaflet 인스턴스
let modalMapInstance = null; // 모달 내부 지도 Leaflet 인스턴스

let hoverCard = null; // 호버 카드 DOM 요소
let hideTimeout = null; // 호버 카드 숨김 타이머

let currentFixedMarker = null; // 현재 클릭으로 고정된 마커
let fixedCountry = null; // 현재 고정된 국가 데이터
let currentCountry = null; // 현재 국가 데이터
let isHighlightFixed = false; // 고정 하이라이트 상태

let currentHighlightLayer = null; // 호버 중인 임시 국경 레이어
let fixedHighlightLayer = null; // 클릭으로 고정된 국경 레이어

let countriesGeoJSON = null; // 국경 데이터 (GeoJSON)

// ====================== 1. 모달 내부 지도 초기화 ======================
/**
 * 모달 내부 지도를 초기화하고 국가 위치에 마커를 표시하는 함수
 *
 * - 기존 모달 지도가 있으면 제거 후 새로 생성
 * - Jawg Sunny 타일 레이어 사용
 * - 국가 중심 좌표로 지도 이동 및 줌 설정
 * - 마커 추가 및 팝업 자동 오픈
 * - 해당 국가의 국경 하이라이트 표시
 *
 * @param {number} lat - 위도 (latitude)
 * @param {number} lng - 경도 (longitude)
 * @param {string} countryName - 표시할 국가 이름 (한글)
 */
function initMap(lat, lng, countryName) {
  if (modalMapInstance) {
    modalMapInstance.remove();
    modalMapInstance = null;
  }

  modalMapInstance = L.map("modalMap", {
    zoomControl: true,
    attributionControl: false,
  }).setView([lat, lng], 6);

  L.tileLayer(
    `https://tile.jawg.io/jawg-sunny/{z}/{x}/{y}{r}.png?access-token=83vifzpRzWmgFqaqLKvoLY5BbaDCj2hEugXka5gaQAoFtpQVoNzcui4tCAFylr2e`,
    {
      attribution:
        '<a href="https://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  ).addTo(modalMapInstance);

  L.marker([lat, lng])
    .addTo(modalMapInstance)
    .bindPopup(`<strong>${countryName}</strong>`)
    .openPopup();

  highlightCountryBorderInModal(countryName);
}

// ====================== 2. 모달 내부 국경 하이라이트 ======================
/**
 * 모달 내부 지도에 해당 국가의 국경을 하이라이트로 표시하고,
 * 국경 크기에 맞춰 자동으로 줌인하는 함수
 *
 * - ISO_A3 코드 우선 매칭
 * - 작은 국가(싱가포르 등)는 더 크게 줌인
 * - 큰 국가(러시아 등)는 적당한 줌 레벨로 표시
 */
function highlightCountryBorderInModal(countryName) {
  if (!modalMapInstance) {
    return;
  }
  if (!countriesGeoJSON) {
    return;
  }

  const targetCountry = allCountries.find(
    (c) => (c.translations?.kor?.common || c.name.common) === countryName,
  );

  if (!targetCountry) {
    console.warn(`모달 국경: allCountries에서 찾을 수 없음 - ${countryName}`);
    return;
  }

  const cca3 = (targetCountry.cca3 || "").toUpperCase().trim();

  let feature = null;

  if (cca3) {
    feature = countriesGeoJSON.features.find((f) => {
      const p = f.properties || {};
      const iso = (p.iso_a3 || "").toUpperCase().trim();
      return iso === cca3;
    });
  }

  if (feature) {
    const geoLayer = L.geoJSON(feature, {
      style: {
        color: "#2563eb",
        weight: 4.5,
        opacity: 0.95,
        fillColor: "#3b82f6",
        fillOpacity: 0.18,
      },
    }).addTo(modalMapInstance);

    const bounds = geoLayer.getBounds();

    const boundsSize = bounds.getNorthEast().lat - bounds.getSouthWest().lat;

    let targetZoom = 8;

    if (boundsSize < 1) {
      targetZoom = 12;
    } else if (boundsSize < 3) {
      targetZoom = 10;
    } else if (boundsSize < 8) {
      targetZoom = 9;
    }

    modalMapInstance.flyToBounds(bounds, {
      padding: [30, 30],
      duration: 1.0,
      maxZoom: targetZoom,
    });
  } else {
    console.warn(`모달 내부 국경 매칭 실패: ${countryName} (cca3: ${cca3})`);
  }
}

// ====================== 3. 모달 닫기 ======================
/**
 * 상세 정보 모달을 닫고, 관련 리소스를 정리하는 함수
 *
 * - 모달 창을 숨김
 * - 모달 내부 Leaflet 지도 인스턴스를 완전히 제거
 * - modalMapInstance 변수를 null로 초기화
 */
function closeModal() {
  enableBodyScroll();
  $("#detailModal").addClass("hidden");

  if (modalMapInstance) {
    modalMapInstance.remove();
    modalMapInstance = null;
  }
}

// ====================== 4. 세계지도 초기화 ======================
/**
 * 세계지도 모달을 초기화하는 함수
 *
 * - Leaflet 지도 인스턴스를 생성하고 Jawg Sunny 타일 레이어를 적용
 * - 지도 이동 범위를 제한 (극지방 과도한 이동 방지)
 * - GeoJSON 데이터를 로드한 후 모든 국가에 마커를 추가
 * - 마커 이벤트(호버, 클릭)와 카드 따라가기 기능을 연결
 */
async function initWorldMap() {
  if (worldMapInstance) return;

  worldMapInstance = L.map("worldMap", {
    zoomControl: true,
    scrollWheelZoom: true,
    maxBounds: L.latLngBounds([-85, -180], [85, 180]),
    maxBoundsViscosity: 1.0,
  }).setView([20, 0], 2);

  L.tileLayer(
    `https://tile.jawg.io/jawg-sunny/{z}/{x}/{y}{r}.png?access-token=83vifzpRzWmgFqaqLKvoLY5BbaDCj2hEugXka5gaQAoFtpQVoNzcui4tCAFylr2e`,
    {
      attribution:
        '<a href="https://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      minZoom: 2,
      maxZoom: 18,
    },
  ).addTo(worldMapInstance);

  await loadCountriesGeoJSON();

  allCountries.forEach((country) => {
    if (!country.latlng || country.latlng.length !== 2) return;

    const marker = L.marker([country.latlng[0], country.latlng[1]]).addTo(
      worldMapInstance,
    );
    addMarkerEvents(marker, country);
    startCardFollowing();
  });
}

// ====================== 5. 호버 카드 관련 함수 ======================
/**
 * 호버 카드를 처음 한 번만 생성하는 함수
 *
 * - 세계지도에서 국가 마커에 마우스를 올렸을 때 표시되는 정보 카드
 */
function createHoverCard() {
  if (hoverCard) return;

  hoverCard = document.createElement("div");
  hoverCard.style.position = "absolute";
  hoverCard.style.backgroundColor = "white";
  hoverCard.style.borderRadius = "16px";
  hoverCard.style.boxShadow = "0 10px 15px -3px rgb(0 0 0 / 0.15)";
  hoverCard.style.padding = "16px";
  hoverCard.style.width = "280px";
  hoverCard.style.zIndex = "1100";
  hoverCard.style.pointerEvents = "auto";
  hoverCard.style.opacity = "0";
  hoverCard.style.transition = "opacity 0.3s ease, transform 0.3s ease";
  hoverCard.style.transform = "translateY(10px)";
  hoverCard.style.display = "none";
  hoverCard.style.border = "1px solid #e5e7eb";

  document.body.appendChild(hoverCard);
}

/**
 * 세계지도에서 국가 마커에 호버하거나 클릭했을 때 표시되는 정보 카드
 *
 * - 호버 카드를 생성하고 내용(국기, 국가명, 수도, 상세보기 버튼)을 채움
 * - fade-in + slide-up 애니메이션 적용
 * - 카드 위치를 실시간으로 업데이트 (지도 이동/줌 시 따라 움직임)
 *
 * @param {Object} country - 표시할 국가 데이터
 * @param {boolean} isFixed - true: 클릭으로 고정된 상태, false: 호버 상태
 */
function showCard(country, isFixed = false) {
  createHoverCard();

  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  const korName = country.translations?.kor?.common || country.name.common;
  const safeFlag = getSafeFlagUrl(
    country.name.common,
    country.flags?.png || country.flags?.svg,
  );
  const capital = getKoreanCapital(
    country.capital ? country.capital[0] : "정보 없음",
  );

  hoverCard.innerHTML = `
        <div class="flex gap-4">
            <img src="${safeFlag}" alt="${korName}" class="w-20 h-14 object-cover rounded-xl shadow-sm flex-shrink-0">
            <div class="flex-1">
                <div class="font-semibold text-lg leading-tight mb-1">${korName}</div>
                <div class="text-sm text-gray-600 mb-4">수도: ${capital}</div>
                <button onclick="openDetailFromCard('${country.cca3}'); event.stopImmediatePropagation();" 
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-3 rounded-2xl transition">
                    상세정보
                </button>
            </div>
        </div>
    `;

  hoverCard.style.display = "block";
  hoverCard.style.opacity = "1";
  hoverCard.style.transform = "translateY(0)";

  updateCardPosition(country);

  if (isFixed) {
    fixedCountry = country;
  }
}

/**
 * 호버 카드를 숨기는 함수
 * - opacity와 transform을 이용해 부드럽게 사라지는 애니메이션 적용
 * - 애니메이션 완료 후 display: none으로 완전히 숨김
 */
function hideCard() {
  if (!hoverCard) return;
  hoverCard.style.opacity = "0";
  hoverCard.style.transform = "translateY(10px)";

  hideTimeout = setTimeout(() => {
    if (hoverCard) hoverCard.style.display = "none";
  }, 250);
}

/**
 * 호버 카드의 위치를 지도상의 국가 마커 위치에 맞춰 업데이트하는 함수
 * - 지도가 이동하거나 줌될 때마다 호출됨
 *
 * @param {Object} country - 위치를 계산할 국가 데이터
 */
function updateCardPosition(country) {
  if (!hoverCard || !worldMapInstance || !country?.latlng) return;

  const latlng = L.latLng(country.latlng[0], country.latlng[1]);
  const point = worldMapInstance.latLngToContainerPoint(latlng);

  hoverCard.style.left = point.x - 90 + "px";
  hoverCard.style.top = point.y - 200 + "px";
}

/**
 * 지도가 이동하거나 줌될 때 호버 카드가 따라 움직이도록 이벤트 리스너를 등록하는 함수
 * - fixedCountry(클릭으로 고정된 국가)가 있을 때만 위치 업데이트
 */
function startCardFollowing() {
  if (!worldMapInstance) return;

  worldMapInstance.off("move zoom");
  worldMapInstance.on("move zoom", () => {
    if (fixedCountry) {
      updateCardPosition(fixedCountry);
    }
  });
}

// ====================== 6. 세계지도 모달 제어 ======================
/**
 * 세계지도 모달을 여는 함수
 * - 모달을 표시하고, 지도가 처음이라면 초기화
 * - 이미 생성된 지도가 있다면 크기 재조정 및 초기 뷰로 복원
 */
function showWorldMap() {
  $("#worldMapModal").removeClass("hidden");

  if (!worldMapInstance) {
    setTimeout(initWorldMap, 300);
  } else {
    worldMapInstance.invalidateSize();
    worldMapInstance.setView([20, 0], 2);
  }
}

/**
 * 세계지도 모달을 닫는 함수
 * - 모달을 숨기고, 관련된 호버 카드와 국경 하이라이트를 정리
 */
function closeWorldMap() {
  $("#worldMapModal").addClass("hidden");
  if (worldMapInstance) {
    hideCard();
    removeHighlight(true);
  }
}

/**
 * 세계지도의 호버/클릭 카드에서 "상세정보" 버튼을 클릭했을 때 호출되는 함수
 * - 현재 세계지도 관련 상태를 모두 정리한 후 상세 모달을 열음
 *
 * @param {string} cca3 - 국가 코드 (예: "KOR", "USA")
 */
function openDetailFromCard(cca3) {
  removeHighlight(true);
  isHighlightFixed = false;
  fixedCountry = null;
  currentFixedMarker = null;
  hideCard();
  closeWorldMap();
  showCountryDetail(cca3);
}

/**
 * 세계지도에서 국가 국경을 그리기 위한 GeoJSON 데이터를 로드하는 함수
 *
 * - 이미 로드된 데이터가 있으면 즉시 반환
 * - jQuery.ajax를 사용해 비동기로 GeoJSON 파일을 가져옴
 * - 성공 시 countriesGeoJSON 전역 변수에 저장
 */
function loadCountriesGeoJSON() {
  if (countriesGeoJSON) {
    return $.Deferred().resolve(countriesGeoJSON).promise();
  }

  return $.ajax({
    url: "https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson",
    type: "GET",
    dataType: "json",
    timeout: 10000,
    success: function (data) {
      countriesGeoJSON = data;
    },
    error: function (xhr, status, error) {
      console.error(error);
    },
  });
}

/**
 * 세계지도에서 국가의 국경을 하이라이트로 표시하는 함수
 *
 * - 호버 시 임시 하이라이트 (얇고 밝은 색)
 * - 클릭 시 고정 하이라이트 (두껍고 진한 색) + 자동 줌인
 * - Afghanistan 매칭 오류를 방지하기 위한 특별 처리 포함
 *
 * @param {Object} country - 하이라이트할 국가 데이터
 * @param {boolean} isFixed - true: 클릭으로 고정된 상태 / false: 호버 상태 (기본값)
 */
function highlightCountryBorder(country, isFixed = false) {
  if (!countriesGeoJSON) return;

  if (currentHighlightLayer) {
    worldMapInstance.removeLayer(currentHighlightLayer);
    currentHighlightLayer = null;
  }

  const cca3 = (country.cca3 || "").toUpperCase().trim();
  const name = (country.name.common || "").toLowerCase().trim();

  let matchedFeature = null;

  matchedFeature = countriesGeoJSON.features.find((f) => {
    const p = f.properties || {};
    const iso = (p.iso_a3 || "").toUpperCase().trim();
    return iso === cca3;
  });

  if (matchedFeature) {
    const featureName = (matchedFeature.properties.NAME || "")
      .toString()
      .toLowerCase();
    if (
      featureName.includes("afghanistan") ||
      featureName.includes("afganistan")
    ) {
      if (name !== "afghanistan" && cca3 !== "AFG") {
        matchedFeature = null;
      }
    }

    const newLayer = L.geoJSON(matchedFeature, {
      style: {
        color: isFixed ? "#1e40af" : "#2563eb",
        weight: isFixed ? 6 : 4.5,
        opacity: 0.95,
        fillColor: isFixed ? "#1e3a8a" : "#60a5fa",
        fillOpacity: isFixed ? 0.28 : 0.2,
      },
    }).addTo(worldMapInstance);

    if (isFixed) {
      worldMapInstance.flyToBounds(newLayer.getBounds(), {
        padding: [80, 80],
        duration: 1.4,
        maxZoom: 8,
      });
      fixedHighlightLayer = newLayer;
      isHighlightFixed = true;
      fixedCountry = country;
    } else {
      currentHighlightLayer = newLayer;
    }
  } else if (isFixed) {
    isHighlightFixed = true;
    fixedCountry = country;
  } else {
    return;
  }
}

/**
 * 세계지도에서 호버 카드가 지도 이동/줌에 따라 따라 움직이도록 이벤트 리스너를 등록하는 함수
 *
 * - "move" 이벤트 : 지도를 드래그할 때
 * - "zoom" 이벤트 : 지도를 확대/축소할 때
 * - fixedCountry(클릭으로 고정된 국가)가 있으면 그 국가의 카드를 따라가고,
 *   없으면 현재 호버 중인 currentCountry를 따라감
 */
function startCardFollowing() {
  if (!worldMapInstance) return;
  worldMapInstance.on("move zoom", () => {
    if (fixedCountry) {
      updateCardPosition(fixedCountry);
    } else if (currentCountry) {
      updateCardPosition(currentCountry);
    }
  });
}

/**
 * 세계지도에서 국가 국경 하이라이트를 제거하는 함수
 *
 * - 호버 하이라이트와 고정(클릭) 하이라이트를 구분하여 제거
 * - 상태 변수도 함께 정리하여 메모리 누수와 상태 오류 방지
 *
 * @param {boolean} isFixedOnly - true: 고정 하이라이트만 제거 / false: 호버 하이라이트 제거 (기본값)
 */
function removeHighlight(isFixedOnly = false) {
  if (!isFixedOnly && currentHighlightLayer) {
    worldMapInstance.removeLayer(currentHighlightLayer);
    currentHighlightLayer = null;
  }
  if (isFixedOnly && fixedHighlightLayer) {
    worldMapInstance.removeLayer(fixedHighlightLayer);
    fixedHighlightLayer = null;
    isHighlightFixed = false;
    fixedCountry = null;
  }
}

/**
 * 세계지도 마커에 이벤트(호버, 클릭)를 연결하는 함수
 *
 * - mouseover: 호버 카드 표시 + 임시 국경 하이라이트
 * - mouseout: 호버 카드 숨김 + 고정 상태라면 고정 카드 복원
 * - click: 카드를 고정하고 국경을 고정 하이라이트로 변경
 */
function addMarkerEvents(marker, country) {
  marker.on("mouseover", function (e) {
    if (isHighlightFixed && fixedCountry && fixedCountry.cca3 === country.cca3)
      return;

    removeHighlight(false);
    showCard(country, false);
    highlightCountryBorder(country, false);
  });

  marker.on("mouseout", function () {
    removeHighlight(false);
    hideCard();

    if (isHighlightFixed && fixedCountry) {
      showCard(fixedCountry, true);
    }
  });

  marker.on("click", function (e) {
    removeHighlight(true);

    showCard(country, true);

    currentFixedMarker = marker;
    highlightCountryBorder(country, true);
  });
}

// ====================== 7. 상세 모달로 이동 ======================
/**
 * 세계지도의 호버/고정 카드에서 "상세정보" 버튼을 클릭했을 때 호출되는 함수
 *
 * - 세계지도 관련 모든 상태(고정 하이라이트, 카드 등)를 정리
 * - 세계지도 모달을 닫고, 기존 상세 정보 모달을 열음
 *
 * @param {string} cca3 - 국가 코드 (예: "KOR", "USA")
 */
function openDetailFromCard(cca3) {
  removeHighlight(true);
  isHighlightFixed = false;
  fixedCountry = null;
  currentFixedMarker = null;
  hideCard();
  closeWorldMap();
  showCountryDetail(cca3);
}
