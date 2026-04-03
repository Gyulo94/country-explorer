<div align="center">
  <h1>국가 탐색기</h1>
  
  <p>
    <strong>REST Countries API</strong>와 <strong>Leaflet.js</strong>를 활용한 국가 정보 탐색 프로젝트입니다.
  </p>

  <p>
    <a href="https://country-explorer-gyulo94.vercel.app/">
      <img src="https://img.shields.io/badge/바로_체험하기-black?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo">
    </a>
    &nbsp;
    <a href="https://github.com/gyulo94/country-explorer/stargazers">
      <img src="https://img.shields.io/github/stars/gyulo94/country-explorer?style=for-the-badge" alt="GitHub stars">
    </a>
  </p>
  <br><br>
  <em>국가 목록 · 국가 검색 · 대륙별 국가 필터 · 국가 상세정보 · 마커·국경 하이라이트 · 환율 계산기</em>
</div>

### ✨ 주요 기능

#### 1. 국가 목록

- 모든 국가 (약 250개) 가나다순 정렬
- 대륙별 필터 (아시아, 유럽, 아프리카, 아메리카, 오세아니아)
- 검색 기능 (한글 국가명 기준)
- 즐겨찾기 기능 (로컬스토리지 저장)

#### 2. 국가 상세 모달

- 한국어 국가명, 국기, 수도, 인구, 지역, 주요 언어
- **실시간 환율 정보** (KRW 기준)
- **환율 계산기** (KRW ↔ 해당 국가 화폐, 계산)
- 모달 내부 지도 + 해당 국가 국경 하이라이트

### #3. 세계지도 모달

- 모든 국가에 마커 표시
- 마커 호버 시 정보 카드 표시
- 마커 클릭 시 카드 고정 + 국경 하이라이트
- 작은 국가도 화면에 꽉 차게 자동 줌인
- 지도 이동/줌 시 카드가 따라 움직임

### 4. 기타

- 로딩 스피너
- 모바일 반응형 지원

#### 🛠 기술 스택

- **HTML5 + Tailwind CSS** (CDN)
- **jQuery**
- **Leaflet.js** (지도, 마커, GeoJSON)
- **REST Countries API** (v3.1)
- **Frankfurter API** (환율)
- **로컬스토리지** (즐겨찾기 저장)
- **배포**: Vercel

### 🚀 바로 체험하기

**[국가 탐색기 데모](https://country-explorer-gyulo94.vercel.app/)**

### 설치 & 로컬 실행

```bash
# 1. 저장소 클론
git clone https://github.com/gyulo94/country-explorer.git
cd country-explorer

# 2. 실행 (가장 편한 방법)
# VS Code → Live Server 확장 프로그램 열기
# 또는 index.html을 브라우저에서 직접 열기
📂 파일 구조
├── index.html # 메인 HTML
├── js/
│   ├── config.js # regionMap, subregionMap, capitalKorean, languageMap
│   ├── utils.js # getKoreanCapital, getKoreanRegion, getKoreanLanguages, getSafeFlagUrl 등
│   ├── map.js # Leaflet 관련 모든 함수 (initWorldMap, initMap, showCard 등)
│   └── main.js # 데이터 로드, 이벤트, render 함수 등
└── README.md
```
