from __future__ import annotations

import json
import math
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

ISO_PATH = Path('/usr/share/iso-codes/json/iso_3166-1.json')
ZONE_PATH = Path('/usr/share/zoneinfo/zone1970.tab')
OUTPUT_PATH = Path('data/world-countries.json')


@dataclass
class Country:
    alpha2: str
    name: str
    alpha3: str
    numeric: str
    lat_values: list[float]
    lon_values: list[float]
    zones: set[str]

    def add_position(self, lat: float, lon: float) -> None:
        self.lat_values.append(lat)
        self.lon_values.append(lon)

    @property
    def latitude(self) -> float | None:
        if not self.lat_values:
            return None
        return sum(self.lat_values) / len(self.lat_values)

    @property
    def longitude(self) -> float | None:
        if not self.lon_values:
            return None
        return sum(self.lon_values) / len(self.lon_values)


PREFIX_TO_REGION = {
    'Africa': 'アフリカ',
    'America': '北アメリカ',
    'Antarctica': '南極',
    'Arctic': '北極',
    'Asia': 'アジア',
    'Atlantic': '大西洋地域',
    'Australia': 'オセアニア',
    'Europe': 'ヨーロッパ',
    'Indian': 'インド洋地域',
    'Pacific': 'オセアニア',
}


MANUAL_REGION_OVERRIDES = {
    'MX': '北アメリカ',
    'BZ': '中南米',
    'CR': '中南米',
    'SV': '中南米',
    'GT': '中南米',
    'HN': '中南米',
    'NI': '中南米',
    'PA': '中南米',
    'BS': '中南米',
    'CU': '中南米',
    'DO': '中南米',
    'HT': '中南米',
    'JM': '中南米',
    'TT': '中南米',
    'BB': '中南米',
    'DM': '中南米',
    'GD': '中南米',
    'KN': '中南米',
    'LC': '中南米',
    'VC': '中南米',
    'AG': '中南米',
    'AW': '中南米',
    'AI': '中南米',
    'GP': '中南米',
    'MQ': '中南米',
    'MS': '中南米',
    'PR': '中南米',
    'TC': '中南米',
    'VG': '中南米',
    'VI': '中南米',
    'SX': '中南米',
    'CW': '中南米',
    'BQ': '中南米',
    'GF': '中南米',
    'SR': '中南米',
    'GY': '中南米',
    'VE': '中南米',
    'CO': '中南米',
    'EC': '中南米',
    'PE': '中南米',
    'CL': '中南米',
    'BO': '中南米',
    'AR': '中南米',
    'PY': '中南米',
    'UY': '中南米',
    'BR': '中南米',
    'GL': '北アメリカ',
    'PS': '中東',
    'IL': '中東',
    'JO': '中東',
    'LB': '中東',
    'SY': '中東',
    'TR': '中東',
    'CY': '中東',
    'SA': '中東',
    'AE': '中東',
    'QA': '中東',
    'KW': '中東',
    'BH': '中東',
    'OM': '中東',
    'YE': '中東',
    'IR': '中東',
    'IQ': '中東',
    'EG': '中東',
    'DZ': '北アフリカ',
    'MA': '北アフリカ',
    'TN': '北アフリカ',
    'LY': '北アフリカ',
    'SD': '北アフリカ',
    'SS': '北アフリカ',
    'EH': '北アフリカ',
    'MR': '北アフリカ',
    'ML': '西アフリカ',
    'NE': '西アフリカ',
    'TD': '中央アフリカ',
    'CF': '中央アフリカ',
    'CD': '中央アフリカ',
    'CG': '中央アフリカ',
    'GA': '中央アフリカ',
    'GQ': '中央アフリカ',
    'CM': '中央アフリカ',
    'NG': '西アフリカ',
    'BJ': '西アフリカ',
    'TG': '西アフリカ',
    'GH': '西アフリカ',
    'CI': '西アフリカ',
    'LR': '西アフリカ',
    'SL': '西アフリカ',
    'GW': '西アフリカ',
    'GM': '西アフリカ',
    'SN': '西アフリカ',
    'CV': '西アフリカ',
    'ET': '東アフリカ',
    'ER': '東アフリカ',
    'DJ': '東アフリカ',
    'SO': '東アフリカ',
    'KE': '東アフリカ',
    'UG': '東アフリカ',
    'RW': '東アフリカ',
    'BI': '東アフリカ',
    'TZ': '東アフリカ',
    'MZ': '東アフリカ',
    'MG': '東アフリカ',
    'ZM': '南部アフリカ',
    'ZW': '南部アフリカ',
    'BW': '南部アフリカ',
    'NA': '南部アフリカ',
    'ZA': '南部アフリカ',
    'LS': '南部アフリカ',
    'SZ': '南部アフリカ',
    'MW': '南部アフリカ',
    'AO': '南部アフリカ',
    'GA': '中央アフリカ',
    'ST': '中央アフリカ',
    'KM': '東アフリカ',
    'SC': '東アフリカ',
    'MU': '東アフリカ',
    'RE': '東アフリカ',
    'IN': '南アジア',
    'PK': '南アジア',
    'BD': '南アジア',
    'LK': '南アジア',
    'NP': '南アジア',
    'BT': '南アジア',
    'MV': '南アジア',
    'AF': '南アジア',
    'MM': '東南アジア',
    'TH': '東南アジア',
    'KH': '東南アジア',
    'LA': '東南アジア',
    'VN': '東南アジア',
    'MY': '東南アジア',
    'SG': '東南アジア',
    'ID': '東南アジア',
    'PH': '東南アジア',
    'BN': '東南アジア',
    'TL': '東南アジア',
    'JP': '東アジア',
    'CN': '東アジア',
    'TW': '東アジア',
    'KR': '東アジア',
    'KP': '東アジア',
    'MN': '東アジア',
    'HK': '東アジア',
    'MO': '東アジア',
}


REGION_FALLBACKS = {
    '北アメリカ': '北米',
    '中南米': '中米・南米',
    '中東': '中東・北アフリカ',
    '北アフリカ': '中東・北アフリカ',
    '西アフリカ': 'サハラ以南アフリカ',
    '中央アフリカ': 'サハラ以南アフリカ',
    '東アフリカ': 'サハラ以南アフリカ',
    '南部アフリカ': 'サハラ以南アフリカ',
    '南アジア': 'アジア',
    '東南アジア': 'アジア',
    '東アジア': 'アジア',
}


def parse_coord(token: str) -> tuple[float, float]:
    if not token:
        raise ValueError('Empty coordinate token')

    def split_lat_lon(value: str) -> tuple[str, str]:
        for i in range(1, len(value)):
            if value[i] in '+-':
                return value[:i], value[i:]
        raise ValueError(f'Cannot split coordinate: {value}')

    def decode(part: str) -> float:
        sign = 1 if part[0] == '+' else -1
        digits = part[1:]
        if len(digits) <= 4:
            deg = int(digits[:2])
            minutes = int(digits[2:4]) if len(digits) >= 4 else 0
            seconds = int(digits[4:]) if len(digits) > 4 else 0
        else:
            deg = int(digits[:3])
            minutes = int(digits[3:5]) if len(digits) >= 5 else 0
            seconds = int(digits[5:]) if len(digits) > 5 else 0
        return sign * (deg + minutes / 60 + seconds / 3600)

    lat_part, lon_part = split_lat_lon(token)
    return decode(lat_part), decode(lon_part)


def determine_region(country: Country, prefixes: set[str]) -> str:
    if country.alpha2 in MANUAL_REGION_OVERRIDES:
        region = MANUAL_REGION_OVERRIDES[country.alpha2]
        return REGION_FALLBACKS.get(region, region)

    # Use the most common prefix observed
    prefix_counts: dict[str, int] = defaultdict(int)
    for pref in prefixes:
        prefix_counts[pref] += 1
    if prefix_counts:
        primary = max(prefix_counts.items(), key=lambda item: item[1])[0]
        region = PREFIX_TO_REGION.get(primary)
        if region:
            if region == '北アメリカ' and country.latitude is not None and country.latitude < 0:
                return '中米・南米'
            if region == 'アジア':
                if country.latitude is not None and country.latitude < 10 and country.longitude is not None and country.longitude > 90:
                    return '東南アジア'
            return region
    if country.latitude is None or country.longitude is None:
        return 'その他'
    lat = country.latitude
    lon = country.longitude
    if lat < -50:
        return '南極'
    if lon > -30 and lon < 60 and lat > 30:
        return 'ヨーロッパ'
    if lon >= -120 and lon <= -30:
        return '北米' if lat >= 0 else '中米・南米'
    if lon >= 60 and lon <= 180:
        return 'アジア'
    if lon >= -30 and lon <= 60:
        return 'アフリカ'
    if lon >= 120 or lon <= -150:
        return 'オセアニア'
    return 'その他'


def main() -> None:
    iso_data = json.loads(ISO_PATH.read_text())['3166-1']
    countries: dict[str, Country] = {}
    for entry in iso_data:
        alpha2 = entry['alpha_2']
        countries[alpha2] = Country(
            alpha2=alpha2,
            name=entry['name'],
            alpha3=entry['alpha_3'],
            numeric=entry['numeric'],
            lat_values=[],
            lon_values=[],
            zones=set(),
        )

    zone_lines = [line for line in ZONE_PATH.read_text().splitlines() if line and not line.startswith('#')]
    for line in zone_lines:
        columns = line.split('\t')
        country_codes = columns[0].split(',')
        coord_token = columns[1]
        zone_name = columns[2]
        lat, lon = parse_coord(coord_token)
        for code in country_codes:
            if code not in countries:
                continue
            countries[code].add_position(lat, lon)
            countries[code].zones.add(zone_name)

    enriched = []
    for code, country in sorted(countries.items(), key=lambda item: item[0]):
        lat = country.latitude
        lon = country.longitude
        region = determine_region(country, {z.split('/')[0] for z in country.zones})
        enriched.append({
            'alpha2': country.alpha2,
            'alpha3': country.alpha3,
            'numeric': country.numeric,
            'name': country.name,
            'latitude': None if lat is None else round(lat, 6),
            'longitude': None if lon is None else round(lon, 6),
            'timezones': sorted(country.zones),
            'region': region,
        })

    OUTPUT_PATH.write_text(json.dumps({'countries': enriched}, ensure_ascii=False, indent=2))
    print(f'Wrote {len(enriched)} entries to {OUTPUT_PATH}')


if __name__ == '__main__':
    main()
