const STORAGE_KEY = 'travelReachState_v1';
const SCORE_PALETTE = [
  '#f4f6f8',
  '#dfeff2',
  '#c9e5e7',
  '#b2dadb',
  '#94cdc9',
  '#75bfb6',
  '#58b0a3',
  '#3f9a8c',
  '#2f7f74',
  '#23645d',
  '#1a4c47'
];

const SCORE_DEFINITIONS = [
  { score: 10, label: '居住', description: 'yearsLived ≥ 2（10 点は yearsLived ≥ 2 のみ）' },
  { score: 9, label: '長期滞在', description: '3 ≤ monthsStayed < 24' },
  { score: 8, label: '中期滞在', description: '2 ≤ weeksStayed < 12' },
  { score: 7, label: '反復宿泊', description: 'totalNights ≥ 3' },
  { score: 6, label: '宿泊', description: 'totalNights ≥ 1' },
  {
    score: 5,
    label: '反復訪問（日帰り）',
    description: 'dayTripCount ≥ 2 かつ dayTripMinPerVisitHours ≥ 2 または dayTripTotalHours ≥ 6'
  },
  { score: 4, label: '濃厚訪問（日帰り）', description: 'maxSingleDayHours ≥ 4' },
  { score: 3, label: '訪問（日帰り）', description: '1 ≤ maxSingleDayHours < 4' },
  { score: 2, label: '立ち寄り（短時間）', description: '短時間（<1h）または駅/空港/SA/PA のみ' },
  { score: 1, label: '通過（未下車）', description: '鉄道/自動車/船で通過のみ（上空通過は除外）' },
  { score: 0, label: '未踏', description: '上記いずれにも該当せず' }
];

const SCORE_DEFINITION_MAP = new Map(SCORE_DEFINITIONS.map((item) => [item.score, item]));

const WORLD_REGION_ORDER = [
  'アジア',
  '東南アジア',
  '中東・北アフリカ',
  'ヨーロッパ',
  '北アメリカ',
  '北米',
  '中米・南米',
  'アフリカ',
  'サハラ以南アフリカ',
  'オセアニア',
  'インド洋地域',
  '大西洋地域',
  'その他'
];

const PREFECTURE_REGION_ORDER = ['北海道', '北海道・東北', '関東', '中部', '近畿', '中国', '四国', '九州・沖縄'];

const numberFormatter = new Intl.NumberFormat('ja-JP');

const MAP_STYLE_URL = 'https://demotiles.maplibre.org/style.json';
const PREFECTURE_GEOJSON_URL =
  'https://raw.githubusercontent.com/gsi-cyberjapan/geojson/master/prefectures.geojson';
const MUNICIPALITY_GEOJSON_URL =
  'https://raw.githubusercontent.com/gsi-cyberjapan/geojson/master/municipality/latest/municipality.geojson';

const worldMapContainer = document.getElementById('worldMap');
const prefectureMapContainer = document.getElementById('prefectureMap');
const municipalityMapContainer = document.getElementById('municipalityMap');
const worldListBody = document.getElementById('worldList');
const prefectureListBody = document.getElementById('prefectureList');
const municipalityListBody = document.getElementById('municipalityList');
const scoreQuickSummaryContainer = document.getElementById('scoreQuickSummary');
const scoreLegendContainer = document.getElementById('scoreLegend');
const worldTotalsBody = document.getElementById('worldTotals');
const worldTotalsFoot = document.getElementById('worldTotalsFoot');
const prefectureTotalsBody = document.getElementById('prefectureTotals');
const prefectureTotalsFoot = document.getElementById('prefectureTotalsFoot');

const regionDisplayNames = (() => {
  try {
    if (typeof Intl.DisplayNames === 'function') {
      return new Intl.DisplayNames(['ja'], { type: 'region' });
    }
  } catch (error) {
    console.warn('地域名のローカライズに失敗しました', error);
  }
  return null;
})();

const metadata = {
  world: new Map(),
  prefectures: new Map(),
  municipalities: new Map()
};

const mapInstances = {
  world: null,
  prefectures: null,
  municipalities: null
};

const geojsonCache = {
  prefectures: null,
  municipalities: null
};

let state = loadState();

const templates = {
  score: document.getElementById('scoreTemplate')
};

const scoreDialog = document.getElementById('scoreDialog');

renderScoreQuickSummary();
renderScoreLegend();
initScoreGuideTabs();
initTabs();
initApp();

async function initApp() {
  try {
    const [worldData, prefectureData, municipalitySample] = await Promise.all([
      fetchJson('data/world-countries.json'),
      fetchJson('data/japan-prefectures.json'),
      fetchJson('data/japan-municipalities-sample.json')
    ]);
    bootstrapWorld(worldData.countries);
    await bootstrapPrefectures(prefectureData.prefectures);
    await bootstrapMunicipalities(municipalitySample.municipalities);
    bindGlobalButtons();
  } catch (error) {
    console.error('初期化に失敗しました', error);
  }
}

function initScoreGuideTabs() {
  const buttons = document.querySelectorAll('[data-score-tab]');
  const panes = document.querySelectorAll('[data-score-pane]');
  if (!buttons.length || !panes.length) {
    return;
  }
  panes.forEach((pane) => {
    pane.setAttribute('aria-hidden', pane.classList.contains('active') ? 'false' : 'true');
  });
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.scoreTab;
      buttons.forEach((btn) => {
        const isActive = btn === button;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      panes.forEach((pane) => {
        const isActive = pane.dataset.scorePane === target;
        pane.classList.toggle('active', isActive);
        pane.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });
    });
  });
}

function initTabs() {
  const tabButtons = document.querySelectorAll('.primary-tabs button');
  const panels = document.querySelectorAll('.tab-panel');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      tabButtons.forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      panels.forEach((panel) => {
        panel.classList.toggle('active', panel.id === targetId);
      });
    });
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { world: {}, prefectures: {}, municipalities: {} };
    }
    const parsed = JSON.parse(raw);
    return {
      world: parsed.world || {},
      prefectures: parsed.prefectures || {},
      municipalities: parsed.municipalities || {}
    };
  } catch (error) {
    console.warn('状態の復元に失敗したため初期化します', error);
    return { world: {}, prefectures: {}, municipalities: {} };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('状態の保存に失敗しました', error);
  }
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }
  return response.json();
}

function escapeAttribute(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getScoreDefinition(score) {
  if (!Number.isFinite(score)) {
    return null;
  }
  return SCORE_DEFINITION_MAP.get(Number(score)) || null;
}

function buildScoreBadgeHTML(score, { compact = false } = {}) {
  if (!Number.isFinite(score)) {
    return '<span class="score-empty">—</span>';
  }
  const definition = getScoreDefinition(score);
  const label = definition ? definition.label : '未設定';
  const description = definition?.description || '';
  const title = description ? `${label}｜${description}` : label;
  const classes = ['score-chip'];
  if (compact) {
    classes.push('score-chip-compact');
  }
  const color = getScoreColor(score);
  return `<span class="${classes.join(' ')}" data-score="${score}" style="--chip-color:${color}" title="${escapeAttribute(title)}"><span class="score-chip-value">${score}</span><span class="score-chip-label">${label}</span></span>`;
}

function renderScoreBadgeElement(element, score, { compact = false } = {}) {
  if (!element) return;
  element.classList.add('score-chip');
  element.classList.toggle('score-chip-compact', compact);
  if (!Number.isFinite(score)) {
    element.classList.add('score-chip-empty');
    element.style.removeProperty('--chip-color');
    element.textContent = '未設定';
    element.removeAttribute('title');
    element.dataset.score = '';
    return;
  }
  const definition = getScoreDefinition(score);
  const label = definition ? definition.label : '未設定';
  element.classList.remove('score-chip-empty');
  element.style.setProperty('--chip-color', getScoreColor(score));
  element.innerHTML = `<span class="score-chip-value">${score}</span><span class="score-chip-label">${label}</span>`;
  element.dataset.score = String(score);
  if (definition?.description) {
    element.setAttribute('title', `${label}｜${definition.description}`);
  } else {
    element.setAttribute('title', label);
  }
}

function configureScoreMeterElement(element, score, { compact = false, showLabels = false } = {}) {
  if (!element) return;
  element.classList.add('score-meter');
  element.classList.toggle('score-meter-compact', Boolean(compact));
  element.classList.toggle('score-meter-labeled', Boolean(showLabels));
  element.innerHTML = '';

  const isFiniteScore = typeof score === 'number' && Number.isFinite(score);
  const numericScore = isFiniteScore ? score : NaN;
  const ariaLabel = isFiniteScore ? `スコアメーター：${numericScore} 点` : 'スコアメーター：未設定';
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', ariaLabel);

  for (let value = 10; value >= 0; value -= 1) {
    const step = document.createElement('span');
    step.className = 'score-meter-step';
    step.dataset.score = String(value);
    step.style.setProperty('--score-meter-color', getScoreColor(value));
    step.setAttribute('aria-hidden', 'true');
    const definition = getScoreDefinition(value);
    const tooltip = definition ? `${value} 点｜${definition.label}` : `${value} 点`;
    step.setAttribute('title', tooltip);
    if (showLabels) {
      const label = document.createElement('span');
      label.className = 'score-meter-step-label';
      label.textContent = String(value);
      step.appendChild(label);
    }
    if (isFiniteScore && numericScore === value) {
      step.classList.add('is-active');
    }
    element.appendChild(step);
  }
}

function createScoreMeterElement(score, options = {}) {
  const meter = document.createElement('div');
  configureScoreMeterElement(meter, score, options);
  return meter;
}

function renderScoreMeterElement(element, score, options = {}) {
  configureScoreMeterElement(element, score, options);
}

function formatScoreHintText(score, { explicit = false } = {}) {
  if (!Number.isFinite(score)) {
    return 'カテゴリ：未設定';
  }
  const definition = getScoreDefinition(score);
  const label = definition ? definition.label : '未設定';
  const suffix = explicit ? '' : '（推奨）';
  return `カテゴリ：${label}（${score} 点${suffix}）`;
}

function renderScoreQuickSummary() {
  if (!scoreQuickSummaryContainer) return;
  const items = SCORE_DEFINITIONS.slice()
    .sort((a, b) => b.score - a.score)
    .map((definition) => {
      const badge = buildScoreBadgeHTML(definition.score, { compact: true });
      const label = definition.label;
      const description = definition.description;
      return `<div class="score-quick-item">
        ${badge}
        <span class="score-quick-label">${label}</span>
        <span class="score-quick-desc">${description}</span>
      </div>`;
    });
  scoreQuickSummaryContainer.innerHTML = items.join('');
}

function renderScoreLegend() {
  if (!scoreLegendContainer) return;
  scoreLegendContainer.innerHTML = '';
  scoreLegendContainer.setAttribute('role', 'group');
  scoreLegendContainer.setAttribute('aria-label', 'スコア凡例');

  const scaleWrapper = document.createElement('div');
  scaleWrapper.className = 'score-legend-scale';
  const scaleMeter = createScoreMeterElement(undefined, { showLabels: true });
  scaleMeter.classList.add('score-meter-legend');
  scaleMeter.setAttribute('aria-label', 'スコア配色（10 点 → 0 点）');
  scaleWrapper.appendChild(scaleMeter);
  scoreLegendContainer.appendChild(scaleWrapper);

  const listWrapper = document.createElement('div');
  listWrapper.className = 'score-legend-list';
  listWrapper.setAttribute('role', 'list');
  SCORE_DEFINITIONS.slice()
    .sort((a, b) => b.score - a.score)
    .forEach((definition) => {
      const badge = document.createElement('span');
      badge.className = 'score-chip score-chip-compact';
      badge.setAttribute('role', 'listitem');
      renderScoreBadgeElement(badge, definition.score, { compact: true });
      listWrapper.appendChild(badge);
    });
  scoreLegendContainer.appendChild(listWrapper);
}

function computeRecommendedScore(metrics) {
  const yearsLived = Number(metrics.yearsLived) || 0;
  const monthsStayed = Number(metrics.monthsStayed) || 0;
  const weeksStayed = Number(metrics.weeksStayed) || 0;
  const totalNights = Number(metrics.totalNights) || 0;
  const dayTripCount = Number(metrics.dayTripCount) || 0;
  const dayTripMinPerVisitHours = Number(metrics.dayTripMinPerVisitHours) || 0;
  const dayTripTotalHours = Number(metrics.dayTripTotalHours) || 0;
  const maxSingleDayHours = Number(metrics.maxSingleDayHours) || 0;
  const shortStop = Boolean(metrics.shortStop);
  const transitOnly = Boolean(metrics.transitOnly);

  if (yearsLived >= 2) return 10;
  if (monthsStayed >= 3 && monthsStayed < 24) return 9;
  if (weeksStayed >= 2 && weeksStayed < 12) return 8;
  if (totalNights >= 3) return 7;
  if (totalNights >= 1) return 6;
  if (dayTripCount >= 2 && (dayTripMinPerVisitHours >= 2 || dayTripTotalHours >= 6)) return 5;
  if (maxSingleDayHours >= 4) return 4;
  if (maxSingleDayHours >= 1) return 3;
  if (shortStop) return 2;
  if (transitOnly) return 1;
  return 0;
}

function getScoreColor(score) {
  if (Number.isFinite(score)) {
    const idx = Math.max(0, Math.min(10, Math.round(score)));
    return SCORE_PALETTE[idx];
  }
  return '#dbe7ea';
}

function formatInteger(value) {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return numberFormatter.format(Math.round(value));
}

async function fetchGeoJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
}

async function ensurePrefectureGeoJSON() {
  if (geojsonCache.prefectures) {
    return geojsonCache.prefectures;
  }
  const data = await fetchGeoJson(PREFECTURE_GEOJSON_URL);
  if (!data?.features) {
    throw new Error('都道府県ポリゴンの取得に失敗しました');
  }
  data.features = data.features
    .map((feature) => {
      const properties = feature.properties || {};
      const scoreId = normalizePrefectureCode(properties);
      if (!scoreId) return null;
      feature.properties = { ...properties, scoreId };
      feature.id = scoreId;
      return feature;
    })
    .filter(Boolean);
  geojsonCache.prefectures = data;
  return geojsonCache.prefectures;
}

async function ensureMunicipalityGeoJSON() {
  if (geojsonCache.municipalities) {
    return geojsonCache.municipalities;
  }
  const data = await fetchGeoJson(MUNICIPALITY_GEOJSON_URL);
  if (!data?.features) {
    throw new Error('市区町村ポリゴンの取得に失敗しました');
  }
  data.features = data.features
    .map((feature) => {
      const properties = feature.properties || {};
      const scoreId = normalizeMunicipalityCode(properties);
      if (!scoreId) return null;
      const prefCode = scoreId.slice(0, 2);
      feature.properties = { ...properties, scoreId, prefCode };
      feature.id = scoreId;
      return feature;
    })
    .filter(Boolean);
  geojsonCache.municipalities = data;
  return geojsonCache.municipalities;
}

function normalizePrefectureCode(properties) {
  const candidates = [
    properties.pref_code,
    properties.prefCode,
    properties.pref,
    properties.PREF,
    properties.code,
    properties.KEN,
    properties.ken,
    properties.ken_code
  ];
  const value = candidates.find((entry) => entry !== undefined && entry !== null && entry !== '');
  if (!value) return null;
  const text = String(value).padStart(2, '0');
  return text.slice(-2);
}

function normalizeMunicipalityCode(properties) {
  const candidates = [
    properties.code,
    properties.CODE,
    properties.citycode,
    properties.city_code,
    properties.CITY_CODE,
    properties.SITYO_CODE,
    properties.jiscode,
    properties.JISCODE,
    properties.JIS_Code,
    properties.municipalityCode
  ];
  const value = candidates.find((entry) => entry !== undefined && entry !== null && entry !== '');
  if (!value) return null;
  const text = String(value).padStart(5, '0');
  return text.slice(-5);
}

function buildScoreExpression(dataset, propertyName) {
  const entries = Object.entries(state[dataset] || {}).filter(([, record]) => {
    return record && typeof record.score === 'number';
  });
  if (!entries.length) {
    return '#dbe7ea';
  }
  const expression = ['match', ['to-string', ['get', propertyName]]];
  entries.forEach(([id, record]) => {
    expression.push(id, getScoreColor(record.score));
  });
  expression.push('#dbe7ea');
  return expression;
}

function initWorldMap() {
  if (!worldMapContainer) return;
  if (typeof maplibregl === 'undefined') {
    console.error('MapLibre GL JS が読み込まれていません');
    return;
  }
  if (mapInstances.world) {
    mapInstances.world.remove();
  }
  const map = new maplibregl.Map({
    container: worldMapContainer,
    style: MAP_STYLE_URL,
    center: [0, 15],
    zoom: 0.8,
    attributionControl: true
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.scrollZoom.enable();
  map.doubleClickZoom.enable();
  map.touchZoomRotate.enable();
  map.on('load', () => {
    map.fitBounds(
      [
        [-178.5, -60],
        [178.5, 82]
      ],
      { padding: 24, duration: 0 }
    );
    addWorldLayers(map);
  });
  mapInstances.world = map;
}

function addWorldLayers(map) {
  const fillId = 'world-score-fill';
  const outlineId = 'world-score-outline';
  if (map.getLayer(fillId)) {
    map.removeLayer(fillId);
  }
  if (map.getLayer(outlineId)) {
    map.removeLayer(outlineId);
  }
  map.addLayer({
    id: fillId,
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'admin_0_countries',
    paint: {
      'fill-color': buildScoreExpression('world', 'iso_a2'),
      'fill-opacity': 0.75
    }
  });
  map.addLayer({
    id: outlineId,
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'admin_0_countries',
    paint: {
      'line-color': '#334155',
      'line-width': 0.6,
      'line-opacity': 0.9
    }
  });

  map.on('click', fillId, (event) => {
    const feature = event.features && event.features[0];
    if (!feature) return;
    const iso = feature.properties?.iso_a2 || feature.properties?.ISO_A2;
    if (iso && metadata.world.has(iso)) {
      openScoreDialog('world', iso);
    }
  });
  updateWorldChoropleth();
}

function updateWorldChoropleth() {
  const map = mapInstances.world;
  if (!map) return;
  const fillId = 'world-score-fill';
  if (!map.getLayer(fillId)) return;
  map.setPaintProperty(fillId, 'fill-color', buildScoreExpression('world', 'iso_a2'));
}

async function initPrefectureMap() {
  if (!prefectureMapContainer) return;
  if (typeof maplibregl === 'undefined') {
    console.error('MapLibre GL JS が読み込まれていません');
    return;
  }
  const data = await ensurePrefectureGeoJSON();
  if (mapInstances.prefectures) {
    mapInstances.prefectures.remove();
  }
  const map = new maplibregl.Map({
    container: prefectureMapContainer,
    style: MAP_STYLE_URL,
    center: [138, 37],
    zoom: 4.4,
    attributionControl: true
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.on('load', () => {
    if (map.getSource('prefecture-polygons')) {
      map.removeLayer('prefecture-fill');
      map.removeLayer('prefecture-outline');
      map.removeSource('prefecture-polygons');
    }
    map.addSource('prefecture-polygons', {
      type: 'geojson',
      data
    });
    map.addLayer({
      id: 'prefecture-fill',
      type: 'fill',
      source: 'prefecture-polygons',
      paint: {
        'fill-color': buildScoreExpression('prefectures', 'scoreId'),
        'fill-opacity': 0.72
      }
    });
    map.addLayer({
      id: 'prefecture-outline',
      type: 'line',
      source: 'prefecture-polygons',
      paint: {
        'line-color': '#1f2937',
        'line-width': 0.75,
        'line-opacity': 0.8
      }
    });
    updatePrefectureChoropleth();
    map.on('click', 'prefecture-fill', (event) => {
      const feature = event.features && event.features[0];
      if (!feature) return;
      const code = feature.properties?.scoreId;
      if (code && metadata.prefectures.has(code)) {
        openScoreDialog('prefectures', code);
      }
    });
  });
  mapInstances.prefectures = map;
}

function updatePrefectureChoropleth() {
  const map = mapInstances.prefectures;
  if (!map) return;
  if (!map.getLayer('prefecture-fill')) return;
  map.setPaintProperty('prefecture-fill', 'fill-color', buildScoreExpression('prefectures', 'scoreId'));
}

let selectedMunicipalityPrefectureCode = '';

async function initMunicipalityMap() {
  if (!municipalityMapContainer) return;
  if (typeof maplibregl === 'undefined') {
    console.error('MapLibre GL JS が読み込まれていません');
    return;
  }
  const [municipalityData, prefectureData] = await Promise.all([
    ensureMunicipalityGeoJSON(),
    ensurePrefectureGeoJSON()
  ]);
  if (mapInstances.municipalities) {
    mapInstances.municipalities.remove();
  }
  const map = new maplibregl.Map({
    container: municipalityMapContainer,
    style: MAP_STYLE_URL,
    center: [138, 37],
    zoom: 5.2,
    attributionControl: true
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.on('load', () => {
    map.addSource('municipality-prefectures', {
      type: 'geojson',
      data: prefectureData
    });
    map.addSource('municipality-polygons', {
      type: 'geojson',
      data: municipalityData
    });
    map.addLayer({
      id: 'municipality-pref-fill',
      type: 'fill',
      source: 'municipality-prefectures',
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'scoreId'], selectedMunicipalityPrefectureCode],
          '#dfeff2',
          'rgba(0,0,0,0)'
        ],
        'fill-opacity': 0.8
      }
    });
    map.addLayer({
      id: 'municipality-pref-outline',
      type: 'line',
      source: 'municipality-prefectures',
      paint: {
        'line-color': '#1f2937',
        'line-width': 0.6,
        'line-opacity': 0.65
      }
    });
    map.addLayer({
      id: 'municipality-fill',
      type: 'fill',
      source: 'municipality-polygons',
      paint: {
        'fill-color': buildScoreExpression('municipalities', 'scoreId'),
        'fill-opacity': [
          'case',
          ['==', ['get', 'prefCode'], selectedMunicipalityPrefectureCode],
          0.82,
          0.55
        ]
      }
    });
    map.addLayer({
      id: 'municipality-outline',
      type: 'line',
      source: 'municipality-polygons',
      paint: {
        'line-color': '#0f172a',
        'line-width': 0.3,
        'line-opacity': 0.6
      }
    });
    updateMunicipalityLayers();
    map.on('click', (event) => {
      handleMunicipalityMapClick(map, event.lngLat);
    });
  });
  mapInstances.municipalities = map;
}

function updateMunicipalityLayers() {
  const map = mapInstances.municipalities;
  if (!map) return;
  if (map.getLayer('municipality-fill')) {
    map.setPaintProperty('municipality-fill', 'fill-color', buildScoreExpression('municipalities', 'scoreId'));
    map.setPaintProperty('municipality-fill', 'fill-opacity', [
      'case',
      ['==', ['get', 'prefCode'], selectedMunicipalityPrefectureCode],
      0.82,
      0.55
    ]);
  }
  if (map.getLayer('municipality-pref-fill')) {
    map.setPaintProperty('municipality-pref-fill', 'fill-color', [
      'case',
      ['==', ['get', 'scoreId'], selectedMunicipalityPrefectureCode],
      '#dfeff2',
      'rgba(0,0,0,0)'
    ]);
  }
}

function handleMunicipalityMapClick(map, lngLat) {
  if (!map.getLayer('municipality-fill')) {
    return;
  }
  const features = map.queryRenderedFeatures(
    map.project(lngLat),
    { layers: ['municipality-fill'] }
  );
  if (!features.length) {
    return;
  }
  const target = features[0];
  const code = target.properties?.scoreId;
  if (!code) {
    return;
  }
  const prefCode = target.properties?.prefCode;
  const prefectureName = prefCode
    ? [...metadata.prefectures.values()].find((pref) => pref.code === prefCode)?.name || ''
    : '';
  if (!metadata.municipalities.has(code)) {
    const nameCandidates = [
      target.properties?.name,
      target.properties?.NAME,
      target.properties?.nam_ja,
      target.properties?.N03_004,
      target.properties?.N03_004_ja,
      target.properties?.municipality,
      '新規市区町村'
    ];
    const name = nameCandidates.find((value) => value && String(value).trim().length > 0) || '新規市区町村';
    metadata.municipalities.set(code, {
      code,
      name,
      prefecture: prefectureName,
      geometry: target.geometry,
      centroid: lngLat
    });
    populateMunicipalityPrefectureFilter();
    renderMunicipalityList();
  }
  if (prefCode) {
    selectedMunicipalityPrefectureCode = prefCode;
    const select = document.getElementById('municipalityPrefectureFilter');
    if (prefectureName && select) {
      select.value = prefectureName;
    }
    updateMunicipalityLayers();
    renderMunicipalityList();
  }
  openScoreDialog('municipalities', code);
}

function findPrefectureCodeByName(name) {
  if (!name) return '';
  const match = [...metadata.prefectures.values()].find((pref) => pref.name === name);
  return match ? match.code : '';
}

function bootstrapWorld(countries) {
  const validCountries = countries
    .filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude))
    .map((country) => {
      const localized = regionDisplayNames ? regionDisplayNames.of(country.alpha2) : null;
      return {
        ...country,
        displayName: localized || country.name
      };
    });
  validCountries.forEach((country) => {
    metadata.world.set(country.alpha2, country);
  });
  initWorldMap();
  renderWorldList();
  renderWorldTotals();
  setupFilter('worldFilter', renderWorldList);
}

function renderWorldList() {
  const filterValue = (document.getElementById('worldFilter').value || '').trim().toLowerCase();
  const entries = Array.from(metadata.world.values())
    .filter((country) => country.displayName.toLowerCase().includes(filterValue))
    .sort((a, b) => {
      if (a.region === b.region) {
        return a.displayName.localeCompare(b.displayName, 'ja');
      }
      return a.region.localeCompare(b.region);
    });

  worldListBody.innerHTML = '';
  entries.forEach((country) => {
    const row = document.createElement('tr');
    row.tabIndex = 0;
    row.dataset.id = country.alpha2;
    row.innerHTML = `
      <td>${country.region}</td>
      <td>${country.displayName}</td>
      <td>${formatScoreCell('world', country.alpha2)}</td>
    `;
    row.addEventListener('click', () => openScoreDialog('world', country.alpha2));
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        openScoreDialog('world', country.alpha2);
      }
    });
    worldListBody.appendChild(row);
  });
}

function renderWorldTotals() {
  renderRegionTotals({
    dataset: 'world',
    bodyElement: worldTotalsBody,
    footElement: worldTotalsFoot,
    order: WORLD_REGION_ORDER,
    getRegion: (info) => info.region || 'その他',
    fallbackLabel: 'その他'
  });
}

async function bootstrapPrefectures(prefectures) {
  prefectures.forEach((pref) => metadata.prefectures.set(pref.code, pref));
  try {
    await initPrefectureMap();
  } catch (error) {
    console.error('都道府県マップの初期化に失敗しました', error);
  }
  renderPrefectureList();
  renderPrefectureTotals();
  setupFilter('prefectureFilter', renderPrefectureList);
}

function renderPrefectureList() {
  const filterValue = (document.getElementById('prefectureFilter').value || '').trim();
  const normalized = filterValue.toLowerCase();
  const entries = Array.from(metadata.prefectures.values())
    .filter((pref) => pref.name.toLowerCase().includes(normalized))
    .sort((a, b) => {
      if (a.region === b.region) {
        return a.code.localeCompare(b.code);
      }
      return a.region.localeCompare(b.region);
    });

  prefectureListBody.innerHTML = '';
  entries.forEach((pref) => {
    const row = document.createElement('tr');
    row.dataset.id = pref.code;
    row.tabIndex = 0;
    row.innerHTML = `
      <td>${pref.region}</td>
      <td>${pref.name}</td>
      <td>${formatScoreCell('prefectures', pref.code)}</td>
    `;
    row.addEventListener('click', () => openScoreDialog('prefectures', pref.code));
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        openScoreDialog('prefectures', pref.code);
      }
    });
    prefectureListBody.appendChild(row);
  });
}

function renderPrefectureTotals() {
  renderRegionTotals({
    dataset: 'prefectures',
    bodyElement: prefectureTotalsBody,
    footElement: prefectureTotalsFoot,
    order: PREFECTURE_REGION_ORDER,
    getRegion: (info) => info.region || 'その他',
    fallbackLabel: 'その他'
  });
}

function renderRegionTotals({ dataset, bodyElement, footElement, order = [], getRegion, fallbackLabel = '未分類' }) {
  if (!bodyElement || !metadata[dataset]) {
    return;
  }
  const totals = new Map();
  metadata[dataset].forEach((info, id) => {
    const regionName = (typeof getRegion === 'function' ? getRegion(info, id) : info.region) || fallbackLabel;
    if (!totals.has(regionName)) {
      totals.set(regionName, { name: regionName, total: 0, count: 0 });
    }
    const entry = state[dataset][id];
    if (entry && Number.isFinite(entry.score)) {
      const bucket = totals.get(regionName);
      bucket.total += entry.score;
      bucket.count += 1;
    }
  });

  const rows = Array.from(totals.values());
  if (!rows.length) {
    bodyElement.innerHTML = '<tr><td colspan="3">データがありません</td></tr>';
    if (footElement) {
      footElement.innerHTML = '';
    }
    return;
  }

  if (Array.isArray(order) && order.length) {
    const orderMap = new Map(order.map((name, index) => [name, index]));
    rows.sort((a, b) => {
      const aIdx = orderMap.has(a.name) ? orderMap.get(a.name) : Number.MAX_SAFE_INTEGER;
      const bIdx = orderMap.has(b.name) ? orderMap.get(b.name) : Number.MAX_SAFE_INTEGER;
      if (aIdx !== bIdx) return aIdx - bIdx;
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name, 'ja');
    });
  } else {
    rows.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name, 'ja');
    });
  }

  bodyElement.innerHTML = rows
    .map((row) => `<tr><td>${row.name}</td><td>${formatInteger(row.total)}</td><td>${formatInteger(row.count)}</td></tr>`)
    .join('');

  if (footElement) {
    const totalSum = rows.reduce((acc, row) => acc + row.total, 0);
    const totalCount = rows.reduce((acc, row) => acc + row.count, 0);
    footElement.innerHTML = `<tr><td>合計</td><td>${formatInteger(totalSum)}</td><td>${formatInteger(totalCount)}</td></tr>`;
  }
}

async function bootstrapMunicipalities(initialList) {
  initialList.forEach((item) => {
    metadata.municipalities.set(item.code, item);
  });
  try {
    await initMunicipalityMap();
  } catch (error) {
    console.error('市区町村マップの初期化に失敗しました', error);
  }
  populateMunicipalityPrefectureFilter();
  renderMunicipalityList();
  bindMunicipalityControls();
}

function populateMunicipalityPrefectureFilter() {
  const select = document.getElementById('municipalityPrefectureFilter');
  const prefectures = new Set();
  metadata.municipalities.forEach((item) => {
    prefectures.add(item.prefecture);
  });
  const options = Array.from(prefectures.values()).sort();
  select.innerHTML = '<option value="">すべて</option>' + options.map((name) => `<option value="${name}">${name}</option>`).join('');
  selectedMunicipalityPrefectureCode = findPrefectureCodeByName(select.value);
  updateMunicipalityLayers();
}

function renderMunicipalityList() {
  const textFilter = (document.getElementById('municipalityFilter').value || '').trim().toLowerCase();
  const prefectureFilter = document.getElementById('municipalityPrefectureFilter').value;

  const entries = Array.from(metadata.municipalities.values()).filter((item) => {
    const matchesText = !textFilter || item.name.toLowerCase().includes(textFilter);
    const matchesPref = !prefectureFilter || item.prefecture === prefectureFilter;
    return matchesText && matchesPref;
  }).sort((a, b) => {
    if (a.prefecture === b.prefecture) {
      return a.name.localeCompare(b.name, 'ja');
    }
    return a.prefecture.localeCompare(b.prefecture, 'ja');
  });

  municipalityListBody.innerHTML = '';
  entries.forEach((item) => {
    const row = document.createElement('tr');
    row.dataset.id = item.code;
    row.tabIndex = 0;
    row.innerHTML = `
      <td>${item.prefecture}</td>
      <td>${item.name}</td>
      <td>${formatScoreCell('municipalities', item.code)}</td>
    `;
    row.addEventListener('click', () => openScoreDialog('municipalities', item.code));
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        openScoreDialog('municipalities', item.code);
      }
    });
    municipalityListBody.appendChild(row);
  });
}

function bindMunicipalityControls() {
  const filterInput = document.getElementById('municipalityFilter');
  const prefectureSelect = document.getElementById('municipalityPrefectureFilter');
  filterInput.addEventListener('input', renderMunicipalityList);
  prefectureSelect.addEventListener('change', () => {
    renderMunicipalityList();
    selectedMunicipalityPrefectureCode = findPrefectureCodeByName(prefectureSelect.value);
    updateMunicipalityLayers();
  });
  document.getElementById('addMunicipality').addEventListener('click', () => {
    openMunicipalityCreateDialog();
  });
  document.getElementById('importMunicipalities').addEventListener('click', () => {
    document.getElementById('municipalityFile').click();
  });
  document.getElementById('municipalityFile').addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        mergeMunicipalityData(Array.isArray(data) ? data : data.municipalities);
      } else {
        const parsed = parseMunicipalityCsv(text);
        mergeMunicipalityData(parsed);
      }
      populateMunicipalityPrefectureFilter();
      renderMunicipalityList();
      saveState();
    } catch (error) {
      console.error('取込に失敗しました', error);
      alert('市区町村データの取込に失敗しました。ファイル形式をご確認ください。');
    } finally {
      event.target.value = '';
    }
  });
}

function mergeMunicipalityData(list) {
  if (!Array.isArray(list)) return;
  list.forEach((item) => {
    if (!item || !item.code || !item.name || !item.prefecture) return;
    metadata.municipalities.set(item.code, {
      code: String(item.code),
      name: String(item.name),
      prefecture: String(item.prefecture)
    });
    if (!state.municipalities[item.code]) {
      state.municipalities[item.code] = {};
    }
  });
  populateMunicipalityPrefectureFilter();
  renderMunicipalityList();
  updateMunicipalityLayers();
}

function parseMunicipalityCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines.shift();
  const columns = header.split(',').map((v) => v.trim());
  const codeIndex = columns.findIndex((col) => /code/i.test(col));
  const nameIndex = columns.findIndex((col) => /name|市区町村/i.test(col));
  const prefIndex = columns.findIndex((col) => /pref|都道府県/i.test(col));
  if (codeIndex === -1 || nameIndex === -1 || prefIndex === -1) {
    throw new Error('必須列が見つかりません');
  }
  return lines.map((line) => {
    const parts = line.split(',');
    return {
      code: parts[codeIndex]?.trim(),
      name: parts[nameIndex]?.trim(),
      prefecture: parts[prefIndex]?.trim()
    };
  }).filter((row) => row.code && row.name && row.prefecture);
}

function openMunicipalityCreateDialog() {
  alert('地図上の市区町村をクリックすると追加・編集できます。');
}

function formatScoreCell(dataset, id) {
  const entry = state[dataset][id];
  const score = typeof entry?.score === 'number' && Number.isFinite(entry.score) ? entry.score : undefined;
  const container = document.createElement('div');
  container.className = 'score-cell';
  const badge = document.createElement('span');
  renderScoreBadgeElement(badge, score, { compact: true });
  container.appendChild(badge);
  container.appendChild(createScoreMeterElement(score, { compact: true }));
  return container.outerHTML;
}

function openScoreDialog(dataset, id) {
  const info = metadata[dataset].get(id);
  if (!info) {
    console.warn('情報が見つかりません', dataset, id);
    return;
  }
  scoreDialog.innerHTML = '';
  const fragment = templates.score.content.cloneNode(true);
  const form = fragment.querySelector('form');
  const recommendedBadge = fragment.querySelector('[data-field="recommended-badge"]');
  const recommendedMeter = fragment.querySelector('[data-field="recommended-meter"]');
  const currentMeter = fragment.querySelector('[data-field="current-meter"]');
  const scoreHintField = fragment.querySelector('[data-field="score-hint"]');
  const existing = state[dataset][id] || {};

  form.querySelector('input[name="yearsLived"]').value = existing.metrics?.yearsLived ?? '';
  form.querySelector('input[name="monthsStayed"]').value = existing.metrics?.monthsStayed ?? '';
  form.querySelector('input[name="weeksStayed"]').value = existing.metrics?.weeksStayed ?? '';
  form.querySelector('input[name="totalNights"]').value = existing.metrics?.totalNights ?? '';
  form.querySelector('input[name="dayTripCount"]').value = existing.metrics?.dayTripCount ?? '';
  form.querySelector('input[name="dayTripMinPerVisitHours"]').value = existing.metrics?.dayTripMinPerVisitHours ?? '';
  form.querySelector('input[name="dayTripTotalHours"]').value = existing.metrics?.dayTripTotalHours ?? '';
  form.querySelector('input[name="maxSingleDayHours"]').value = existing.metrics?.maxSingleDayHours ?? '';
  form.querySelector('input[name="shortStop"]').checked = Boolean(existing.metrics?.shortStop);
  form.querySelector('input[name="transitOnly"]').checked = Boolean(existing.metrics?.transitOnly);
  form.querySelector('textarea[name="notes"]').value = existing.notes ?? '';
  const defaultScore = typeof existing.score === 'number' ? existing.score : '';
  const scoreInput = form.querySelector('input[name="score"]');
  scoreInput.value = defaultScore;

  let scoreWasEdited = defaultScore !== '';
  let lastRecommended = 0;

  const updateScoreHint = () => {
    if (!scoreHintField) return;
    if (scoreWasEdited) {
      const manualValue = Number(scoreInput.value);
      if (Number.isInteger(manualValue)) {
        scoreHintField.textContent = formatScoreHintText(manualValue, { explicit: true });
      } else {
        scoreHintField.textContent = 'カテゴリ：未設定';
      }
    } else {
      scoreHintField.textContent = formatScoreHintText(lastRecommended);
    }
  };

  const updateManualMeter = () => {
    if (!currentMeter) return;
    const manualValue = Number(scoreInput.value);
    if (Number.isInteger(manualValue) && manualValue >= 0 && manualValue <= 10) {
      renderScoreMeterElement(currentMeter, manualValue);
    } else {
      renderScoreMeterElement(currentMeter, undefined);
    }
  };

  const updateRecommended = () => {
    const metrics = readMetricsFromForm(form);
    lastRecommended = computeRecommendedScore(metrics);
    renderScoreBadgeElement(recommendedBadge, lastRecommended, { compact: true });
    renderScoreMeterElement(recommendedMeter, lastRecommended);
    if (!scoreWasEdited) {
      scoreInput.value = lastRecommended;
    }
    updateScoreHint();
    updateManualMeter();
  };

  form.addEventListener('input', (event) => {
    if (event.target.name === 'notes' || event.target.name === 'score') {
      return;
    }
    updateRecommended();
  });

  scoreInput.addEventListener('input', () => {
    scoreWasEdited = scoreInput.value !== '';
    updateScoreHint();
    updateManualMeter();
  });

  updateRecommended();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const metrics = readMetricsFromForm(form);
    const scoreValue = Number(formData.get('score'));
    if (!Number.isInteger(scoreValue) || scoreValue < 0 || scoreValue > 10) {
      alert('スコアは 0〜10 の整数で入力してください');
      return;
    }
    state[dataset][id] = {
      score: scoreValue,
      metrics,
      notes: (formData.get('notes') || '').toString().trim(),
      updatedAt: new Date().toISOString()
    };
    applyStateChange(dataset, id);
    saveState();
    scoreDialog.close();
  });

  fragment.querySelector('[data-action="cancel"]').addEventListener('click', () => {
    scoreDialog.close();
  });

  const headline = document.createElement('h3');
  headline.textContent = `${info.name} の到達指数`;
  scoreDialog.appendChild(headline);
  scoreDialog.appendChild(fragment);
  updateRecommended();
  scoreDialog.showModal();
}

function readMetricsFromForm(form) {
  return {
    yearsLived: toNumber(form.elements.namedItem('yearsLived').value),
    monthsStayed: toNumber(form.elements.namedItem('monthsStayed').value),
    weeksStayed: toNumber(form.elements.namedItem('weeksStayed').value),
    totalNights: toNumber(form.elements.namedItem('totalNights').value),
    dayTripCount: toNumber(form.elements.namedItem('dayTripCount').value),
    dayTripMinPerVisitHours: toNumber(form.elements.namedItem('dayTripMinPerVisitHours').value),
    dayTripTotalHours: toNumber(form.elements.namedItem('dayTripTotalHours').value),
    maxSingleDayHours: toNumber(form.elements.namedItem('maxSingleDayHours').value),
    shortStop: form.elements.namedItem('shortStop').checked,
    transitOnly: form.elements.namedItem('transitOnly').checked
  };
}

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function applyStateChange(dataset, id) {
  switch (dataset) {
    case 'world':
      updateWorldChoropleth();
      renderWorldList();
      renderWorldTotals();
      break;
    case 'prefectures':
      updatePrefectureChoropleth();
      renderPrefectureList();
      renderPrefectureTotals();
      break;
    case 'municipalities':
      updateMunicipalityLayers();
      renderMunicipalityList();
      break;
    default:
      break;
  }
}

function setupFilter(inputId, callback) {
  const input = document.getElementById(inputId);
  input.addEventListener('input', () => callback());
}

function bindGlobalButtons() {
  document.querySelectorAll('button[data-export]').forEach((button) => {
    button.addEventListener('click', () => {
      const dataset = button.dataset.export;
      exportDataset(dataset);
    });
  });

  document.getElementById('resetWorld').addEventListener('click', () => resetDataset('world'));
  document.getElementById('resetPrefectures').addEventListener('click', () => resetDataset('prefectures'));
  document.getElementById('resetMunicipalities').addEventListener('click', () => resetDataset('municipalities'));
}

function resetDataset(dataset) {
  if (!confirm('このセクションのスコアを全て削除しますか？')) {
    return;
  }
  state[dataset] = {};
  saveState();
  if (dataset === 'world') {
    updateWorldChoropleth();
    renderWorldList();
    renderWorldTotals();
  } else if (dataset === 'prefectures') {
    updatePrefectureChoropleth();
    renderPrefectureList();
    renderPrefectureTotals();
  } else if (dataset === 'municipalities') {
    updateMunicipalityLayers();
    renderMunicipalityList();
  }
}

function exportDataset(dataset) {
  const rows = [];
  const header = [
    'id',
    'name',
    'region',
    'score',
    'yearsLived',
    'monthsStayed',
    'weeksStayed',
    'totalNights',
    'dayTripCount',
    'dayTripMinPerVisitHours',
    'dayTripTotalHours',
    'maxSingleDayHours',
    'shortStop',
    'transitOnly',
    'notes',
    'updatedAt'
  ];
  rows.push(header.join(','));

  metadata[dataset].forEach((info, id) => {
    const entry = state[dataset][id] || {};
    const metrics = entry.metrics || {};
    rows.push([
      id,
      escapeCsv(info.name),
      escapeCsv(info.region || info.prefecture || ''),
      entry.score ?? '',
      metrics.yearsLived ?? '',
      metrics.monthsStayed ?? '',
      metrics.weeksStayed ?? '',
      metrics.totalNights ?? '',
      metrics.dayTripCount ?? '',
      metrics.dayTripMinPerVisitHours ?? '',
      metrics.dayTripTotalHours ?? '',
      metrics.maxSingleDayHours ?? '',
      metrics.shortStop ? 1 : 0,
      metrics.transitOnly ? 1 : 0,
      escapeCsv(entry.notes || ''),
      entry.updatedAt || ''
    ].join(','));
  });

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filenameMap = {
    world: 'world-scores.csv',
    prefectures: 'prefecture-scores.csv',
    municipalities: 'municipality-scores.csv'
  };
  link.download = filenameMap[dataset] || `${dataset}-scores.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const needsQuotes = /[",\n]/.test(value);
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

