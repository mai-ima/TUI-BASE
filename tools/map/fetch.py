#!/usr/bin/env python3
"""浜松市の地図データを取ってくる（OpenStreetMap / Overpass API と 国土地理院 標高タイル）。

  python3 tools/map/fetch.py        → osm/*.json と dem/*.txt を作る
  python3 tools/map/build.py assets/js/race-map-data.js

Overpass のメインサーバーは混むので、ミラー（maps.mail.ru）を使う。
"""
import urllib.request, urllib.parse, json, sys, time, os, math, concurrent.futures as cf
URL = 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
os.makedirs('osm', exist_ok=True); os.makedirs('dem', exist_ok=True)
def q(name, query):
    if os.path.exists('osm/' + name + '.json') and os.path.getsize('osm/' + name + '.json') > 300: return
    for attempt in range(4):
        try:
            data = urllib.parse.urlencode({'data': query}).encode()
            with urllib.request.urlopen(URL, data=data, timeout=400) as r: body = r.read()
            open('osm/' + name + '.json', 'wb').write(body); print(name, len(body)); return
        except Exception as e:
            print(name, 'err', e); time.sleep(5)
AREA = 'area["name"="浜松市"]["admin_level"="7"]->.a;'
jobs = {
 'roads': '[out:json][timeout:300];' + AREA + 'way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"](area.a);out geom;',
 'links': '[out:json][timeout:300];' + AREA + 'way["highway"~"^(motorway_link|trunk_link|primary_link|secondary_link)$"](area.a);out geom;',
 'signals': '[out:json][timeout:200];' + AREA + 'node["highway"="traffic_signals"](area.a);out;',
 'rail': '[out:json][timeout:200];' + AREA + 'way["railway"="rail"](area.a);out geom;',
 'water': '[out:json][timeout:300];' + AREA + '(way["natural"="water"](area.a);relation["natural"="water"](area.a);way["waterway"="riverbank"](area.a);way["natural"="coastline"](34.55,137.45,34.80,138.10););out geom;',
 'minor': '[out:json][timeout:300];(way["highway"~"^(unclassified|residential)$"](around:2200,34.7037,137.7351););out geom;',
 'poi': '[out:json][timeout:200];' + AREA + '(node["railway"="station"](area.a);node["highway"="motorway_junction"](area.a););out;',
 'lm': '[out:json][timeout:200];' + AREA + '(nwr["historic"="castle"](area.a);nwr["amenity"="place_of_worship"]["name"](area.a);nwr["tourism"~"attraction|museum|viewpoint|theme_park|zoo"](area.a);nwr["leisure"~"stadium|park"]["name"](area.a);nwr["amenity"~"university|hospital|townhall"]["name"](area.a);nwr["shop"="mall"](area.a);nwr["man_made"="lighthouse"](area.a);nwr["natural"~"peak|beach"]["name"](area.a););out center tags;',
 'bld_c': '[out:json][timeout:300];way["building"](around:2600,34.7037,137.7351);out tags geom;',
 'bld_s': '[out:json][timeout:300];(way["building"](around:900,34.8063,137.7853);way["building"](around:700,34.8900,137.8130);way["building"](around:700,34.6920,137.6100);way["building"](around:700,34.7530,137.6250);way["building"](around:700,34.7545,137.8270););out tags geom;',
}
for k, v in jobs.items(): q(k, v)
lat0, lat1, lon0, lon1 = 34.40, 35.31, 137.48, 138.06
for i in range(6):
    for j in range(3):
        a = lat0 + (lat1 - lat0) * i / 6; b = lat0 + (lat1 - lat0) * (i + 1) / 6; c = lon0 + (lon1 - lon0) * j / 3; d = lon0 + (lon1 - lon0) * (j + 1) / 3
        bb = '(%.4f,%.4f,%.4f,%.4f)' % (a, c, b, d)
        q('lu_%d_%d' % (i, j), '[out:json][timeout:300];(way["landuse"~"^(residential|commercial|industrial|retail|farmland|orchard|forest|meadow|farmyard|greenhouse_horticulture|cemetery|military)$"]' + bb + ';way["natural"~"^(wood|beach|sand|scrub|wetland|grassland)$"]' + bb + ';way["leisure"~"^(park|golf_course|pitch|stadium)$"]' + bb + ';);out geom;')
# 標高タイル（ズーム 12）
Z = 12
def tx(lon): return int((lon + 180) / 360 * 2 ** Z)
def ty(lat): r = math.radians(lat); return int((1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2 ** Z)
def get(xy):
    x, y = xy; fn = 'dem/%d_%d_%d.txt' % (Z, x, y)
    if os.path.exists(fn): return
    try: d = urllib.request.urlopen('https://cyberjapandata.gsi.go.jp/xyz/dem/%d/%d/%d.txt' % (Z, x, y), timeout=60).read()
    except Exception: d = b''
    open(fn, 'wb').write(d)
with cf.ThreadPoolExecutor(6) as ex:
    list(ex.map(get, [(x, y) for x in range(tx(137.48), tx(138.07) + 1) for y in range(ty(35.31), ty(34.40) + 1)]))
