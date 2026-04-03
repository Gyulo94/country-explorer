/**
 * 영문 수도명을 한국어로 변환하는 헬퍼 함수
 * capitalKorean 객체에 매핑된 값이 있으면 반환, 없으면 원본 또는 "정보 없음" 반환
 */
function getKoreanCapital(capital) {
  return capitalKorean[capital] || capital || "정보 없음";
}

/**
 * 대륙(Region) 영문명을 한국어로 변환하는 헬퍼 함수
 * regionMap에 매핑된 값이 있으면 반환, 없으면 원본 또는 "정보없음" 반환
 */
function getKoreanRegion(region) {
  return regionMap[region] || region || "정보없음";
}

/**
 * 언어 코드를 한국어 이름으로 변환하는 헬퍼 함수
 * 여러 언어가 있는 경우 쉼표로 구분하여 반환
 */
function getKoreanLanguages(languages) {
  if (!languages) return "정보 없음";
  const langArray = Object.values(languages);
  return langArray.map((lang) => languageMap[lang] || lang).join(", ");
}

/**
 * 국기 이미지 URL을 안전하게 처리하는 함수
 * - .svg.png 형식 오류 수정
 * - 아프가니스탄의 경우 특별한 Taliban 국기 URL 사용
 * - URL이 없으면 빈 문자열 반환
 */
function getSafeFlagUrl(countryName, originalUrl) {
  if (!countryName) {
    if (originalUrl) {
      return originalUrl
        .replace(".svg.png", ".png")
        .replace(/\/(\d+px-.*)\.svg$/, "/$1.png");
    }
    return "";
  }

  if (countryName === "Afghanistan") {
    return "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Flag_of_the_Taliban.svg/3840px-Flag_of_the_Taliban.svg.png";
  }

  if (!originalUrl) return "";

  let safeUrl = originalUrl.replace(".svg.png", ".png");
  safeUrl = safeUrl.replace(/\/(\d+px-.*)\.svg$/, "/$1.png");

  return safeUrl;
}

/**
 * 모달이 열릴 때 페이지 스크롤을 막는 함수
 * - 스크롤 위치를 저장하고 body를 fixed로 설정
 */
function disableBodyScroll() {
  const scrollY = window.scrollY;

  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = "100%";
  document.body.style.overflow = "hidden";
}

/**
 * 모달이 닫힐 때 페이지 스크롤을 다시 허용하는 함수
 * - 저장했던 스크롤 위치로 복원
 */
function enableBodyScroll() {
  const scrollY = document.body.style.top;

  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  document.body.style.overflow = "";

  if (scrollY) {
    window.scrollTo(0, parseInt(scrollY || "0") * -1);
  }
}
