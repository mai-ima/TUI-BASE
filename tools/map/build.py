#!/usr/bin/env python3
"""OSM + 国土地理院 DEM → assets/js/race-map-data.js（浜松市の実地図）

座標系（ゲーム全体で共通）: 原点 = 浜松駅、x = 東 (+)、z = 南 (+)、y = 上 (+)、単位 m。
"""
import json, math, glob, os, sys, re, collections
import numpy as np
from PIL import Image, ImageDraw

OUT = sys.argv[1] if len(sys.argv) > 1 else 'race-map-data.js'
LAT0, LON0 = 34.7037, 137.7351
KX = math.cos(math.radians(LAT0)) * 111320.0
KZ = 110574.0
def proj(lat, lon): return ((lon - LON0) * KX, (LAT0 - lat) * KZ)
def unproj(x, z): return (LAT0 - z / KZ, LON0 + x / KX)

def load(n):
    return json.load(open('osm/' + n + '.json'))['elements']

# ------------------------------------------------------------------ DEM
Z = 12
tiles = {}
for fn in glob.glob('dem/12_*.txt'):
    _, x, y = os.path.basename(fn)[:-4].split('_')
    txt = open(fn).read().strip()
    if not txt: continue
    rows = [r.split(',') for r in txt.split('\n')]
    a = np.full((256, 256), np.nan, dtype=np.float32)
    for i, r in enumerate(rows[:256]):
        for j, v in enumerate(r[:256]):
            if v != 'e' and v != '': a[i, j] = float(v)
    tiles[(int(x), int(y))] = a
print('dem tiles', len(tiles))
def merc(lat, lon):
    n = 2 ** Z
    X = (lon + 180) / 360 * n
    r = math.radians(lat)
    Y = (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * n
    return X * 256, Y * 256
def dem_px(px, py):
    tx, ty = int(px // 256), int(py // 256)
    a = tiles.get((tx, ty))
    if a is None: return float('nan')
    return a[int(py - ty * 256), int(px - tx * 256)]
def elev(lat, lon, sea=0.0):
    """双線形補間。海（データなし）は sea を返す"""
    px, py = merc(lat, lon); px -= 0.5; py -= 0.5
    x0, y0 = math.floor(px), math.floor(py); fx, fy = px - x0, py - y0
    v = [dem_px(x0, y0), dem_px(x0 + 1, y0), dem_px(x0, y0 + 1), dem_px(x0 + 1, y0 + 1)]
    w = [(1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy]
    s = sw = 0.0
    for vv, ww in zip(v, w):
        if not math.isnan(vv): s += vv * ww; sw += ww
    if sw < 0.3: return sea
    return s / sw
def elev_xz(x, z, sea=0.0):
    lat, lon = unproj(x, z); return elev(lat, lon, sea)

# ------------------------------------------------------------------ encode
ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
def enc(vals):
    out = []
    for v in vals:
        v = int(v)
        z = v * 2 if v >= 0 else -v * 2 - 1
        while True:
            c = z & 31; z >>= 5
            if z: out.append(ALPHA[c | 32])
            else: out.append(ALPHA[c]); break
    return ''.join(out)
def delta(vals):
    p = 0; o = []
    for v in vals: v = int(round(v)); o.append(v - p); p = v
    return o

# ------------------------------------------------------------------ geometry helpers
def rdp(pts, eps, keep=None):
    if len(pts) < 3: return pts
    keep = keep or set()
    stack = [(0, len(pts) - 1)]; mark = [False] * len(pts); mark[0] = mark[-1] = True
    for k in keep: mark[k] = True
    while stack:
        a, b = stack.pop()
        ax, az = pts[a][0], pts[a][1]; bx, bz = pts[b][0], pts[b][1]
        dx, dz = bx - ax, bz - az; L = math.hypot(dx, dz) or 1e-9
        best, bi = -1, -1
        for i in range(a + 1, b):
            d = abs((pts[i][0] - ax) * dz - (pts[i][1] - az) * dx) / L if L > 1e-6 else math.hypot(pts[i][0] - ax, pts[i][1] - az)
            if mark[i] and i not in (a, b): d = 1e9
            if d > best: best, bi = d, i
        if best > eps:
            mark[bi] = True; stack.append((a, bi)); stack.append((bi, b))
    return [p for p, m in zip(pts, mark) if m]

# ------------------------------------------------------------------ roads
CLS = {'motorway': 0, 'trunk': 1, 'primary': 2, 'secondary': 3, 'tertiary': 4,
       'motorway_link': 5, 'trunk_link': 6, 'primary_link': 7, 'secondary_link': 8}
ways = load('roads') + load('links')
seen = set(); W = []
for w in ways:
    if w['id'] in seen or 'geometry' not in w: continue
    seen.add(w['id']); W.append(w)
coord = {}
use = collections.Counter()
for w in W:
    for nid, g in zip(w['nodes'], w['geometry']):
        if nid not in coord: coord[nid] = proj(g['lat'], g['lon'])
    for nid in set(w['nodes']): use[nid] += 1
    use[w['nodes'][0]] += 1; use[w['nodes'][-1]] += 1
def attrs(t):
    hw = t.get('highway'); c = CLS[hw]
    ow = t.get('oneway', 'no')
    one = 1 if ow in ('yes', '1', 'true') else -1 if ow == '-1' else 0
    if hw in ('motorway',) and ow == 'no' and 'oneway' not in t: one = 1
    if hw == 'motorway_link' and 'oneway' not in t: one = 1
    name = t.get('name') or t.get('ref') or ''
    ref = t.get('ref', '')
    try: lanes = int(t.get('lanes', '0').split(';')[0])
    except: lanes = 0
    try: ms = int(re.findall(r'\d+', t.get('maxspeed', '0'))[0])
    except: ms = 0
    st = 1 if t.get('bridge') and t.get('bridge') != 'no' else 2 if t.get('tunnel') and t.get('tunnel') != 'no' else 0
    return dict(c=c, one=one, name=name, ref=ref, lanes=lanes, ms=ms, st=st)

# セグメント（分岐点〜分岐点）
segs = []
for w in W:
    a = attrs(w['tags']); ns = w['nodes']
    if a['one'] == -1: ns = ns[::-1]; a['one'] = 1
    cur = [ns[0]]
    for nid in ns[1:]:
        cur.append(nid)
        if use[nid] >= 2 or nid == ns[-1]:
            if len(cur) >= 2 and cur[0] != cur[-1]: segs.append(dict(nodes=cur, **a))
            cur = [nid]
print('ways', len(W), 'segs', len(segs))
def seglen(s): return sum(math.hypot(coord[s['nodes'][i + 1]][0] - coord[s['nodes'][i]][0], coord[s['nodes'][i + 1]][1] - coord[s['nodes'][i]][1]) for i in range(len(s['nodes']) - 1))

# 交差点のクラスタ化（二車線分離の交差点・複雑な交差点をひとつに）
par = {}
def find(a):
    while par.get(a, a) != a:
        par[a] = par.get(par[a], par[a]); a = par[a]
    return a
members = collections.defaultdict(list)
ends = set()
for s in segs: ends.add(s['nodes'][0]); ends.add(s['nodes'][-1])
for n in ends: members[n] = [n]
order = sorted(segs, key=seglen)
for s in order:
    L = seglen(s)
    if L > 24: break
    if s['c'] == 0: continue   # 本線は結合しない
    a, b = find(s['nodes'][0]), find(s['nodes'][-1])
    if a == b: continue
    pts = [coord[n] for n in members[a] + members[b]]
    xs = [p[0] for p in pts]; zs = [p[1] for p in pts]
    if max(xs) - min(xs) > 55 or max(zs) - min(zs) > 55: continue
    par[b] = a; members[a] += members[b]; del members[b]
root = {n: find(n) for n in ends}
cent = {}
for r, ms in members.items():
    cent[r] = (sum(coord[n][0] for n in ms) / len(ms), sum(coord[n][1] for n in ms) / len(ms))

# 信号
sig_nodes = [(e['id'], proj(e['lat'], e['lon'])) for e in load('signals')]
sig_set = set(i for i, _ in sig_nodes)

# クラスタ間の辺
edges = []
for s in segs:
    a, b = root[s['nodes'][0]], root[s['nodes'][-1]]
    if a == b: continue
    edges.append(dict(a=a, b=b, pts=[coord[n] for n in s['nodes']], sts=[s['st']] * (len(s['nodes']) - 1),
                      nodes=s['nodes'], c=s['c'], one=s['one'], name=s['name'], ref=s['ref'], lanes=s['lanes'], ms=s['ms']))
# 次数 2 の縮約
def deg_map():
    d = collections.defaultdict(list)
    for i, e in enumerate(edges):
        if e is None: continue
        d[e['a']].append(i); d[e['b']].append(i)
    return d
sig_cluster = set()
for r, ms in members.items():
    if any(n in sig_set for n in ms): sig_cluster.add(r)
changed = True
while changed:
    changed = False
    dm = deg_map()
    for n, lst in dm.items():
        if len(lst) != 2 or n in sig_cluster: continue
        i, j = lst
        if i == j: continue
        e1, e2 = edges[i], edges[j]
        if e1 is None or e2 is None: continue
        if e1['one'] != e2['one']: continue
        # e1 を n で終わる向きに、e2 を n から始まる向きに
        def rev(e):
            return dict(e, a=e['b'], b=e['a'], pts=e['pts'][::-1], sts=e['sts'][::-1], nodes=e['nodes'][::-1])
        if e1['b'] != n:
            if e1['one']: continue
            e1 = rev(e1)
        if e2['a'] != n:
            if e2['one']: continue
            e2 = rev(e2)
        if e1['a'] == e2['b']: continue   # ループ
        L1, L2 = len(e1['pts']), len(e2['pts'])
        main = e1 if L1 >= L2 else e2
        ne = dict(main, a=e1['a'], b=e2['b'], pts=e1['pts'] + e2['pts'][1:], sts=e1['sts'] + e2['sts'], nodes=e1['nodes'] + e2['nodes'][1:],
                  c=min(e1['c'], e2['c']) if (e1['c'] < 5) == (e2['c'] < 5) else main['c'])
        edges[i] = ne; edges[j] = None; changed = True
        dm[e1['a']] = [k if k != j else i for k in dm[e1['a']]] if e1['a'] in dm else []
        dm[e2['b']] = [k if k != j else i for k in dm[e2['b']]] if e2['b'] in dm else []
        dm[n] = []
edges = [e for e in edges if e]
# 重複（同じ端点・ほぼ同じ形）を除く
used_nodes = set()
for e in edges: used_nodes.add(e['a']); used_nodes.add(e['b'])
nid_list = sorted(used_nodes, key=lambda r: (round(cent[r][1] / 500), cent[r][0]))
NI = {r: i for i, r in enumerate(nid_list)}
print('graph nodes', len(nid_list), 'edges', len(edges))

# 経路途中の信号（横断歩道など）
def mid_signals(e):
    out = []; d = 0
    for k in range(1, len(e['nodes']) - 1):
        d += math.hypot(e['pts'][k][0] - e['pts'][k - 1][0], e['pts'][k][1] - e['pts'][k - 1][1])
        if e['nodes'][k] in sig_set: out.append(d)
    return out

# 標高の付いた折れ線を作る
def road_line(e):
    a, b = cent[e['a']], cent[e['b']]
    pts = [list(p) for p in e['pts']]
    # 端をクラスタの中心へ寄せる（交差点の中心で道がつながる）
    pts[0] = [a[0], a[1]]; pts[-1] = [b[0], b[1]]
    sts = list(e['sts'])
    # 構造の変わり目を残して間引く
    keep = set(k for k in range(1, len(sts)) if sts[k] != sts[k - 1])
    idx = list(range(len(pts)))
    P = [(p[0], p[1], k) for k, p in enumerate(pts)]
    S = rdp(P, 1.2, keep)
    kept = [p[2] for p in S]
    # 長い区間は 40m ごとに点を足す（標高のため）
    out = []; ost = []
    for m in range(len(kept)):
        k = kept[m]; out.append((pts[k][0], pts[k][1]))
        if m + 1 < len(kept):
            k2 = kept[m + 1]; st = sts[k]
            L = math.hypot(pts[k2][0] - pts[k][0], pts[k2][1] - pts[k][1])
            n = int(L // 40)
            ost.append(st)
            for q in range(1, n + 1):
                f = q / (n + 1)
                out.append((pts[k][0] + (pts[k2][0] - pts[k][0]) * f, pts[k][1] + (pts[k2][1] - pts[k][1]) * f)); ost.append(st)
    # 標高
    ys = [elev_xz(x, z, 0.5) for x, z in out]
    dist = [0.0]
    for k in range(1, len(out)): dist.append(dist[-1] + math.hypot(out[k][0] - out[k - 1][0], out[k][1] - out[k - 1][1]))
    # 橋・トンネルは両端を直線で結ぶ
    k = 0
    while k < len(ost):
        if ost[k]:
            j = k
            while j < len(ost) and ost[j] == ost[k]: j += 1
            y0, y1 = ys[k], ys[j]; d0, d1 = dist[k], dist[j]
            for q in range(k + 1, j):
                f = (dist[q] - d0) / max(1e-6, d1 - d0); ys[q] = y0 + (y1 - y0) * f
            k = j
        else: k += 1
    # なめらかに（±45m の加重平均）
    sm = []
    for q in range(len(out)):
        s = w = 0
        for r in range(max(0, q - 8), min(len(out), q + 9)):
            dd = abs(dist[r] - dist[q])
            if dd > 45: continue
            ww = 1 - dd / 50; s += ys[r] * ww; w += ww
        sm.append(s / w)
    sm[0] = ys[0]; sm[-1] = ys[-1]
    return out, sm, ost, dist[-1]

node_y = {}
lines = []
for e in edges:
    pts, ys, ost, L = road_line(e)
    lines.append((pts, ys, ost, L))
    node_y.setdefault(e['a'], []).append(ys[0]); node_y.setdefault(e['b'], []).append(ys[-1])
# 交差点の高さは平均に揃える（立体交差の本線は別扱い）
ny = {r: sum(v) / len(v) for r, v in node_y.items()}
for e, (pts, ys, ost, L) in zip(edges, lines):
    ys[0] = ny[e['a']]; ys[-1] = ny[e['b']]

names = ['']
NM = {'': 0}
def name_id(s):
    if s not in NM: NM[s] = len(names); names.append(s)
    return NM[s]

E_a, E_b, E_c, E_one, E_name, E_ref, E_lanes, E_ms, E_n, P_x, P_z, P_y, P_st, E_sig = [], [], [], [], [], [], [], [], [], [], [], [], [], []
total_km = 0
for e, (pts, ys, ost, L) in zip(edges, lines):
    total_km += L / 1000
    E_a.append(NI[e['a']]); E_b.append(NI[e['b']]); E_c.append(e['c']); E_one.append(e['one'])
    E_name.append(name_id(e['name'])); E_ref.append(name_id(e['ref'])); E_lanes.append(e['lanes']); E_ms.append(e['ms'] // 10)
    E_n.append(len(pts) - 2)
    px, pz = cent[e['a']]; py = round(ys[0] * 10)
    for k in range(1, len(pts) - 1):
        x, z = round(pts[k][0]), round(pts[k][1])
        P_x.append(x - round(px)); P_z.append(z - round(pz)); px, pz = x, z
        yy = round(ys[k] * 10); P_y.append(yy - py); py = yy
    P_st.extend(ost)   # len(pts)-1 個
    ms = mid_signals(e)
    E_sig.append(len(ms)); E_sig.extend(round(d) for d in ms)
print('road km', round(total_km))
N_x = [round(cent[r][0]) for r in nid_list]; N_z = [round(cent[r][1]) for r in nid_list]
N_y = [round(ny[r] * 10) for r in nid_list]
N_f = [1 if r in sig_cluster else 0 for r in nid_list]
# 構造フラグは連長圧縮
def rle(vals):
    out = []; k = 0
    while k < len(vals):
        j = k
        while j < len(vals) and vals[j] == vals[k]: j += 1
        out += [vals[k], j - k]; k = j
    return out

road = dict(
    nx=enc(delta(N_x)), nz=enc(delta(N_z)), ny=enc(delta(N_y)), nf=enc(rle(N_f)),
    ea=enc(delta(E_a)), eb=enc([b - a for a, b in zip(E_a, E_b)]), ec=enc(E_c), eo=enc(rle(E_one)), en=enc(E_name), er=enc(E_ref),
    el=enc(E_lanes), em=enc(E_ms), ep=enc(E_n), px=enc(P_x), pz=enc(P_z), py=enc(P_y), ps=enc(rle(P_st)), es=enc(E_sig))

# ------------------------------------------------------------------ minor roads (見た目用)
minor = []
for w in load('minor'):
    if 'geometry' not in w: continue
    pts = [proj(g['lat'], g['lon']) for g in w['geometry']]
    pts = rdp([(p[0], p[1]) for p in pts], 1.5)
    minor.append(pts)
M_n, M_x, M_z = [], [], []
px = pz = 0
for pts in minor:
    M_n.append(len(pts))
    for x, z in pts:
        x, z = round(x), round(z); M_x.append(x - px); M_z.append(z - pz); px, pz = x, z
minor_d = dict(n=enc(M_n), x=enc(M_x), z=enc(M_z))
print('minor', len(minor), sum(M_n))

# ------------------------------------------------------------------ rail
def rail_kind(t):
    n = t.get('name', '') + t.get('operator', '')
    if '新幹線' in n: return 1
    if '遠州鉄道' in n or '遠鉄' in n: return 2
    if '天竜浜名湖' in n or '天浜' in n: return 3
    if '飯田' in n: return 4
    return 0
R_n, R_k, R_x, R_z, R_y, R_s = [], [], [], [], [], []
px = pz = py = 0
for w in load('rail'):
    if 'geometry' not in w: continue
    t = w.get('tags', {})
    if t.get('service') in ('yard', 'siding', 'spur', 'crossover'): continue
    st = 1 if t.get('bridge') and t.get('bridge') != 'no' else 2 if t.get('tunnel') and t.get('tunnel') != 'no' else 0
    pts = rdp([proj(g['lat'], g['lon']) for g in w['geometry']], 2.0)
    ys = [elev_xz(x, z, 0.5) for x, z in pts]
    if st: ys = [ys[0] + (ys[-1] - ys[0]) * k / max(1, len(ys) - 1) for k in range(len(ys))]
    R_n.append(len(pts)); R_k.append(rail_kind(t)); R_s.append(st)
    for (x, z), y in zip(pts, ys):
        x, z, y = round(x), round(z), round(y * 10)
        R_x.append(x - px); R_z.append(z - pz); R_y.append(y - py); px, pz, py = x, z, y
rail_d = dict(n=enc(R_n), k=enc(R_k), s=enc(R_s), x=enc(R_x), z=enc(R_z), y=enc(R_y))
print('rail', len(R_n), sum(R_n))

# ------------------------------------------------------------------ grid (landuse / water / DEM)
X0, Z0 = -23500, -67500
X1, Z1 = 30000, 12000
CELL = 100
GW, GH = int((X1 - X0) // CELL), int((Z1 - Z0) // CELL)
# DEM グリッド（200m）
DC = 200
DW, DH = int((X1 - X0) // DC) + 1, int((Z1 - Z0) // DC) + 1
dem = np.zeros((DH, DW), dtype=np.int32)
seamask = np.zeros((DH, DW), dtype=bool)
for j in range(DH):
    for i in range(DW):
        x, z = X0 + i * DC, Z0 + j * DC
        v = elev_xz(x, z, float('nan'))
        if math.isnan(v): seamask[j, i] = True; v = -4
        dem[j, i] = round(v)
print('dem grid', DW, DH, dem.max())

LU = {  # 描画順（後ろが上書き）
    'forest': 6, 'wood': 6, 'scrub': 6, 'farmland': 4, 'meadow': 7, 'grassland': 7, 'farmyard': 4, 'orchard': 5,
    'greenhouse_horticulture': 10, 'residential': 1, 'cemetery': 11, 'military': 3, 'industrial': 3, 'commercial': 2, 'retail': 2,
    'park': 7, 'golf_course': 7, 'pitch': 7, 'stadium': 12, 'wetland': 7, 'beach': 8, 'sand': 8,
}
ORDER = ['forest', 'wood', 'scrub', 'farmland', 'farmyard', 'meadow', 'grassland', 'orchard', 'greenhouse_horticulture', 'residential',
         'cemetery', 'military', 'industrial', 'commercial', 'retail', 'park', 'golf_course', 'pitch', 'stadium', 'wetland', 'beach', 'sand']
img = Image.new('L', (GW, GH), 0)
dr = ImageDraw.Draw(img)
polys = collections.defaultdict(list)
for fn in sorted(glob.glob('osm/lu_*.json')):
    for w in json.load(open(fn))['elements']:
        if 'geometry' not in w: continue
        t = w.get('tags', {})
        k = t.get('landuse') or t.get('natural') or t.get('leisure')
        if k not in LU: continue
        polys[k].append([((proj(g['lat'], g['lon'])[0] - X0) / CELL, (proj(g['lat'], g['lon'])[1] - Z0) / CELL) for g in w['geometry']])
for k in ORDER:
    for p in polys.get(k, []):
        if len(p) >= 3: dr.polygon(p, fill=LU[k])
# 水域
water_polys = []
for w in load('water'):
    t = w.get('tags', {})
    if w['type'] == 'way' and 'geometry' in w:
        if t.get('natural') == 'coastline': continue
        water_polys.append([proj(g['lat'], g['lon']) for g in w['geometry']])
    elif w['type'] == 'relation':
        for m in w.get('members', []):
            if m.get('role') == 'outer' and 'geometry' in m:
                water_polys.append([proj(g['lat'], g['lon']) for g in m['geometry']])
# リレーションの outer は分割されていることがあるので、端点でつなぐ
def stitch(rings):
    closed, open_ = [], []
    for r in rings:
        if len(r) < 2: continue
        if math.hypot(r[0][0] - r[-1][0], r[0][1] - r[-1][1]) < 1: closed.append(r)
        else: open_.append(list(r))
    while open_:
        cur = open_.pop()
        grown = True
        while grown and math.hypot(cur[0][0] - cur[-1][0], cur[0][1] - cur[-1][1]) >= 1:
            grown = False
            for i, o in enumerate(open_):
                if math.hypot(o[0][0] - cur[-1][0], o[0][1] - cur[-1][1]) < 1: cur += o[1:]; open_.pop(i); grown = True; break
                if math.hypot(o[-1][0] - cur[-1][0], o[-1][1] - cur[-1][1]) < 1: cur += o[::-1][1:]; open_.pop(i); grown = True; break
        closed.append(cur)
    return closed
water_polys = stitch(water_polys)
for p in water_polys:
    if len(p) >= 3: dr.polygon([((x - X0) / CELL, (z - Z0) / CELL) for x, z in p], fill=9)
lu = np.array(img, dtype=np.int32)
# 海（DEM のデータなし）も水に
for j in range(GH):
    for i in range(GW):
        x, z = X0 + (i + 0.5) * CELL, Z0 + (j + 0.5) * CELL
        di, dj = x / DC - X0 / DC, z / DC - Z0 / DC
        ii, jj = int(round(di)), int(round(dj))
        if 0 <= jj < DH and 0 <= ii < DW and seamask[jj, ii] and lu[j, i] in (0, 9, 8):
            # 細かい判定
            if math.isnan(elev_xz(x, z, float('nan'))): lu[j, i] = 9
lu_rows = []
for j in range(GH):
    lu_rows.extend(rle(list(lu[j])))
grid = dict(x0=X0, z0=Z0, cell=CELL, w=GW, h=GH, lu=enc(lu_rows), dc=DC, dw=DW, dh=DH,
            dem=enc([v for j in range(DH) for v in delta(list(dem[j]))]))
print('landuse runs', len(lu_rows) // 2)

# 水域ポリゴン（3D 用）
WP_n, WP_x, WP_z, WP_y = [], [], [], []
px = pz = 0
for p in water_polys:
    xs = [q[0] for q in p]; zs = [q[1] for q in p]
    area = 0
    for k in range(len(p) - 1): area += p[k][0] * p[k + 1][1] - p[k + 1][0] * p[k][1]
    if abs(area) / 2 < 3000: continue
    s = rdp(p, 5.0)
    if len(s) < 4: continue
    if s[0] == s[-1]: s = s[:-1]
    # 水面の高さ（縁の標高の低い方）
    ys = sorted(elev_xz(x, z, 0) for x, z in s[::max(1, len(s) // 20)])
    WP_y.append(round(max(0, ys[len(ys) // 5]) * 10))
    WP_n.append(len(s))
    for x, z in s:
        x, z = round(x), round(z); WP_x.append(x - px); WP_z.append(z - pz); px, pz = x, z
water_d = dict(n=enc(WP_n), x=enc(WP_x), z=enc(WP_z), y=enc(WP_y))
print('water polys', len(WP_n), sum(WP_n))

# ------------------------------------------------------------------ buildings
def hull(pts):
    pts = sorted(set(pts))
    if len(pts) < 3: return pts
    def cr(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cr(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]
def obb(pts):
    h = hull(pts); best = None
    for k in range(len(h)):
        a, b = h[k], h[(k + 1) % len(h)]
        ang = math.atan2(b[1] - a[1], b[0] - a[0]); c, s = math.cos(ang), math.sin(ang)
        us = [p[0] * c + p[1] * s for p in h]; vs = [-p[0] * s + p[1] * c for p in h]
        A = (max(us) - min(us)) * (max(vs) - min(vs))
        if best is None or A < best[0]:
            u0, v0 = (max(us) + min(us)) / 2, (max(vs) + min(vs)) / 2
            best = (A, u0 * c - v0 * s, u0 * s + v0 * c, max(us) - min(us), max(vs) - min(vs), ang)
    return best
st_xy = [proj(34.7037, 137.7351), proj(34.7080, 137.7330)]
B = []
bseen = set()
for fn in ('bld_c', 'bld_s'):
    for w in load(fn):
        if w['id'] in bseen or 'geometry' not in w: continue
        bseen.add(w['id'])
        pts = [proj(g['lat'], g['lon']) for g in w['geometry']]
        if len(pts) < 4: continue
        o = obb(pts)
        if not o: continue
        A, cx, cz, bw, bd, ang = o
        if bw < 2.5 or bd < 2.5: continue
        t = w.get('tags', {})
        lv = 0
        try:
            if 'building:levels' in t: lv = int(float(t['building:levels']))
            elif 'height' in t: lv = int(float(re.findall(r'[\d.]+', t['height'])[0]) / 3.2)
        except: lv = 0
        bt = t.get('building', 'yes')
        if not lv:
            d = min(math.hypot(cx - sx, cz - sz) for sx, sz in st_xy)
            hsh = (w['id'] * 2654435761) % 1000 / 1000
            if bt in ('house', 'detached', 'residential', 'yes') and A < 180: lv = 2 if hsh < 0.8 else 1 if hsh < 0.9 else 3
            elif bt in ('apartments',): lv = 3 + int(hsh * 6)
            elif bt in ('industrial', 'warehouse', 'factory', 'garage', 'roof', 'shed', 'hut', 'carport'): lv = 1 + (A > 1500)
            elif bt in ('temple', 'shrine'): lv = 1
            else:
                base = 2 + A / 500
                if d < 900: base += 4 * (1 - d / 900) * (1 + hsh * 2)
                lv = max(1, min(14, int(base + hsh * 2)))
        lv = max(1, min(60, lv))
        kind = {'house': 0, 'detached': 0, 'residential': 0, 'apartments': 1, 'commercial': 2, 'retail': 2, 'office': 2, 'industrial': 3,
                'warehouse': 3, 'factory': 3, 'temple': 4, 'shrine': 4, 'school': 5, 'hospital': 5, 'university': 5, 'train_station': 6}.get(bt, 0 if A < 200 else 2)
        a = int(round(math.degrees(ang) % 180)) // 2
        B.append((round(cx), round(cz), max(3, round(bw)), max(3, round(bd)), a, lv, kind))
B.sort(key=lambda b: (b[1] // 200, b[0]))
px = pz = 0
BX, BZ, BW, BD, BA, BL, BK = [], [], [], [], [], [], []
for b in B:
    BX.append(b[0] - px); BZ.append(b[1] - pz); px, pz = b[0], b[1]
    BW.append(b[2]); BD.append(b[3]); BA.append(b[4]); BL.append(b[5]); BK.append(b[6])
bld = dict(x=enc(BX), z=enc(BZ), w=enc(BW), d=enc(BD), a=enc(BA), l=enc(BL), k=enc(BK))
print('buildings', len(B), 'max lv', max(b[5] for b in B))

# ------------------------------------------------------------------ places / POI
PLACES = {
    'hm_eki': (34.7037, 137.7351), 'hm_kaji': (34.7069, 137.7319), 'hm_castle': (34.7112, 137.7249), 'hm_takatsuka': (34.6937, 137.6827),
    'hm_sanaru': (34.7112, 137.6905), 'hm_dune': (34.6668, 137.7427), 'hm_shinohara': (34.6905, 137.6545), 'hm_maisaka': (34.6857, 137.6117),
    'hm_benten': (34.6818, 137.5963), 'hm_yuto': (34.6990, 137.6376), 'hm_nishi_ic': (34.7435, 137.6560), 'hm_kanzanji': (34.7555, 137.6135),
    'hm_mikatahara': (34.7910, 137.7040), 'hm_kiga': (34.8095, 137.6588), 'hm_mikkabi': (34.8040, 137.5580), 'hm_mikkabi_ic': (34.7860, 137.5693),
    'hm_hamakita': (34.7929, 137.7862), 'hm_kasai': (34.7500, 137.7880), 'hm_ic': (34.7480, 137.7700), 'hm_hamakita_ic': (34.8397, 137.7615),
    'hm_inasa': (34.8435, 137.6615), 'hm_futamata': (34.8636, 137.8157), 'hm_haruno': (34.9660, 137.8860), 'hm_misakubo': (35.1488, 137.8698),
    'hm_airpark': (34.7476, 137.7116), 'hm_zoo': (34.7661, 137.6331), 'hm_ryugashi': (34.8452, 137.6490), 'hm_iinoya': (34.8292, 137.6679),
    'hm_sakuma': (35.0835, 137.8027), 'hm_tenryu': (34.7289, 137.8000), 'hm_shizudai': (34.7240, 137.7160), 'hm_tatsuyama': (35.0232, 137.8266),
    'hm_hosoe': (34.7960, 137.6310), 'hm_nakajima': (34.6936, 137.7550), 'hm_minami': (34.6673, 137.7522), 'hm_aritama': (34.7530, 137.7540),
    'hm_sanarudai': (34.7160, 137.6990), 'hm_akiha': (34.9818, 137.8660), 'hm_hamakita_forest': (34.8415, 137.7780),
}
pl = {}
for k, (la, lo) in PLACES.items():
    x, z = proj(la, lo)
    # いちばん近い交差点（高速道路だけの点は避ける）
    best = None
    for r in nid_list:
        d = math.hypot(cent[r][0] - x, cent[r][1] - z)
        if best is None or d < best[0]: best = (d, r)
    pl[k] = [round(x), round(z), NI[best[1]], round(best[0])]
    if best[0] > 400: print('place far', k, round(best[0]))
stations = []
for e in load('poi'):
    t = e.get('tags', {})
    if t.get('railway') == 'station' and t.get('name'):
        x, z = proj(e['lat'], e['lon']); stations.append([t['name'], round(x), round(z)])
ics = []
for e in load('poi'):
    t = e.get('tags', {})
    if t.get('highway') == 'motorway_junction' and t.get('name'):
        x, z = proj(e['lat'], e['lon']); ics.append([t['name'], round(x), round(z)])
lms = []
for e in load('lm'):
    t = e.get('tags', {}); n = t.get('name')
    c = e.get('center') or ({'lat': e['lat'], 'lon': e['lon']} if 'lat' in e else None)
    if not n or not c: continue
    kind = 'castle' if t.get('historic') == 'castle' else 'shrine' if t.get('amenity') == 'place_of_worship' else 'peak' if t.get('natural') == 'peak' else t.get('tourism') or t.get('leisure') or t.get('amenity') or ''
    if kind in ('hospital',): continue
    x, z = proj(c['lat'], c['lon'])
    lms.append([n, kind, round(x), round(z)])

data = dict(v=1, origin=[LAT0, LON0], names=names, road=road, minor=minor_d, rail=rail_d, grid=grid, water=water_d,
            bld=bld, bcov=[[round(proj(a,b)[0]),round(proj(a,b)[1]),r] for a,b,r in ((34.7037,137.7351,2550),(34.8063,137.7853,880),(34.8900,137.8130,680),(34.6920,137.6100,680),(34.7530,137.6250,680),(34.7545,137.8270,680))], places=pl, stations=stations, ics=ics, lms=lms,
            credit='© OpenStreetMap contributors (ODbL) / 国土地理院 標高タイル')
js = ('/* 浜松市の実地図データ（自動生成: OSM + 国土地理院）。' + data['credit'] + '\n'
      '   座標: 原点=浜松駅, x=東, z=南, y=上 (m)。生成スクリプト: tools/map/build.py */\n'
      '(function () { var TB = window.TB = window.TB || {}; TB.RaceMapData = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '; })();\n')
open(OUT, 'w').write(js)
print('wrote', OUT, len(js.encode()) // 1024, 'KB')
for k, v in data.items():
    if isinstance(v, dict): print(' ', k, len(json.dumps(v, ensure_ascii=False)) // 1024, 'KB')
