import json, math, os, urllib.request, collections, sys
sys.setrecursionlimit(10000)
def proj0(la0, lo0):
    kx = math.cos(math.radians(la0)) * 111320.0; kz = 110574.0
    return lambda la, lo: ((lo - lo0) * kx, (la0 - la) * kz)
# ---- DEM (z14) ----
Z = 14; tiles = {}
def tile(x, y):
    k = (x, y)
    if k in tiles: return tiles[k]
    fn = 'crs/dem_%d_%d_%d.txt' % (Z, x, y)
    if not os.path.exists(fn):
        try: d = urllib.request.urlopen('https://cyberjapandata.gsi.go.jp/xyz/dem/%d/%d/%d.txt' % (Z, x, y), timeout=60).read()
        except Exception: d = b''
        open(fn, 'wb').write(d)
    t = open(fn).read().strip()
    a = [[(float(v) if v not in ('e', '') else None) for v in r.split(',')] for r in t.split('\n')] if t else None
    tiles[k] = a; return a
def elev(la, lo):
    n = 2 ** Z; X = (lo + 180) / 360 * n * 256 - 0.5; r = math.radians(la)
    Y = (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * n * 256 - 0.5
    x0, y0 = math.floor(X), math.floor(Y); fx, fy = X - x0, Y - y0; s = w = 0
    for dx, dy, ww in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
        px, py = x0 + dx, y0 + dy; t = tile(px // 256, py // 256)
        if not t: continue
        try: v = t[py % 256][px % 256]
        except IndexError: v = None
        if v is not None: s += v * ww; w += ww
    return s / w if w else 0
def ways(fn):
    return [w for w in json.load(open(fn))['elements'] if w['type'] == 'way' and 'geometry' in w]
def graph(ws):
    adj = collections.defaultdict(list); coord = {}
    for w in ws:
        ns = w.get('nodes') or [(round(g['lat'], 7), round(g['lon'], 7)) for g in w['geometry']]
        for i, (n, g) in enumerate(zip(ns, w['geometry'])): coord[n] = (g['lat'], g['lon'])
        for i in range(len(ns) - 1):
            a, b = ns[i], ns[i + 1]
            la, lo = coord[a]; lb, lob = coord[b]
            d = math.hypot((lob - lo) * 91000, (lb - la) * 110574)
            adj[a].append((b, d)); adj[b].append((a, d))
    return adj, coord
def contract(adj):
    """次数 2 の点をまとめた辺: {(u,v,k): (len, [nodes])}"""
    keep = set(n for n in adj if len(adj[n]) != 2)
    if not keep: keep = {next(iter(adj))}
    keep = keep
    E = []; seen = set()
    for u in keep:
        for (v, d) in adj[u]:
            path = [u, v]; L = d; prev, cur = u, v
            while cur not in keep:
                nxt = [x for x in adj[cur] if x[0] != prev]
                if not nxt: break
                prev, (cur, dd) = cur, nxt[0]; path.append(cur); L += dd
            key = tuple(path) if str(path[0]) <= str(path[-1]) else tuple(reversed(path))
            if key in seen: continue
            seen.add(key); E.append((path[0], path[-1], L, path))
    return keep, E
def best_cycle(adj, target):
    keep, E = contract(adj)
    inc = collections.defaultdict(list)
    for i, (a, b, L, p) in enumerate(E): inc[a].append(i); inc[b].append(i)
    best = [None, 1e18]
    def dfs(start, u, used, visited, L, path):
        if L > target * 1.25: return
        for ei in inc[u]:
            if ei in used: continue
            a, b, l, p = E[ei]; v = b if a == u else a
            seg = p if a == u else list(reversed(p))
            if v == start and len(used) >= 1:
                tot = L + l
                if abs(tot - target) < best[1]: best[0] = path + seg[1:]; best[1] = abs(tot - target)
                continue
            if v in visited: continue
            used.add(ei); visited.add(v)
            dfs(start, v, used, visited, L + l, path + seg[1:])
            used.discard(ei); visited.discard(v)
    for s in list(keep)[:60]: dfs(s, s, set(), {s}, 0, [s])
    return best[0]
def longest_path(adj):
    import heapq
    def far(src):
        dist = {src: 0}; prev = {}; h = [(0, src)]
        while h:
            d, u = heapq.heappop(h)
            if d > dist[u]: continue
            for v, w in adj[u]:
                if d + w < dist.get(v, 1e18): dist[v] = d + w; prev[v] = u; heapq.heappush(h, (d + w, v))
        t = max(dist, key=dist.get); return t, prev
    a, _ = far(next(iter(adj))); b, prev = far(a)
    p = [b]
    while p[-1] != a: p.append(prev[p[-1]])
    return p
def smooth_y(ys, dist, win):
    out = []
    for i in range(len(ys)):
        s = w = 0
        for j in range(max(0, i - 40), min(len(ys), i + 41)):
            dd = abs(dist[j] - dist[i])
            if dd > win: continue
            ww = 1 - dd / (win + 1); s += ys[j] * ww; w += ww
        out.append(s / w)
    return out
def resample(pts, step):
    out = [pts[0]]; acc = 0
    for i in range(1, len(pts)):
        a, b = pts[i - 1], pts[i]; L = math.hypot(b[0] - a[0], b[1] - a[1])
        if L < 1e-6: continue
        t = step - acc
        while t <= L: out.append((a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L)); t += step
        acc = L - (t - step)
    return out
def process(nodes, coord, loop):
    la0, lo0 = coord[nodes[0]]; P = proj0(la0, lo0)
    pts = [P(*coord[n]) for n in nodes]
    pts = resample(pts, 4.0)
    if loop and math.hypot(pts[-1][0] - pts[0][0], pts[-1][1] - pts[0][1]) < 6: pts = pts[:-1]
    # 高さ
    import itertools
    inv = lambda x, z: (la0 - z / 110574.0, lo0 + x / (math.cos(math.radians(la0)) * 111320.0))
    ys = [elev(*inv(x, z)) for x, z in pts]
    dist = [0]
    for i in range(1, len(pts)): dist.append(dist[-1] + math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
    ys = smooth_y(ys, dist, 60 if not loop else 80)
    return pts, ys, dist[-1] + (math.hypot(pts[-1][0] - pts[0][0], pts[-1][1] - pts[0][1]) if loop else 0)
def start_on_straight(pts):
    n = len(pts); best = (1e9, 0)
    def hd(i): a, b = pts[i % n], pts[(i + 1) % n]; return math.atan2(b[0] - a[0], b[1] - a[1])
    for i in range(n):
        s = 0
        for k in range(-12, 12):
            d = hd(i + k + 1) - hd(i + k); d = (d + math.pi) % (2 * math.pi) - math.pi; s += abs(d)
        if s < best[0]: best = (s, i)
    i0 = best[1]
    return pts[i0:] + pts[:i0], i0
OUT = {}
CIR = {'suzuka': 5807, 'fuji': 4563, 'motegi': 4801, 'sugo': 3586, 'okayama': 3703, 'tsukuba': 2045, 'autopolis': 4674}
for k, target in CIR.items():
    ws = [w for w in ways('crs/c_%s.json' % k) if 'pit' not in (w.get('tags', {}).get('name', '') + w.get('tags', {}).get('service', '')).lower() and w.get('tags', {}).get('area') != 'yes']
    adj, coord = graph(ws)
    cyc = best_cycle(adj, target)
    if not cyc: print('no cycle', k); continue
    pts, ys, L = process(cyc, coord, True)
    pts2, i0 = start_on_straight(pts); ys = ys[i0:] + ys[:i0]
    OUT[k] = {'loop': 1, 'pts': pts2, 'ys': ys, 'len': L}
    print(k, 'len', round(L), 'target', target, 'n', len(pts2), 'dy', round(max(ys) - min(ys)))
for k in ['haruna', 'usui', 'iroha', 'turnpike', 'tsubaki', 'akagi', 'myogi']:
    ws = ways('crs/t_%s.json' % k)
    if not ws: print('none', k); continue
    adj, coord = graph(ws)
    # 一番大きなつながりだけ
    comp = {}; big = None
    for s in adj:
        if s in comp: continue
        st = [s]; comp[s] = s; mem = [s]
        while st:
            u = st.pop()
            for v, _ in adj[u]:
                if v not in comp: comp[v] = s; st.append(v); mem.append(v)
        if big is None or len(mem) > len(big): big = mem
    bs = set(big); adj2 = {u: [x for x in adj[u] if x[0] in bs] for u in big}
    path = longest_path(adj2)
    pts, ys, L = process(path, coord, False)
    if ys[0] > ys[-1]: pts = pts[::-1]; ys = ys[::-1]   # 上りを基本に
    OUT[k] = {'loop': 0, 'pts': pts, 'ys': ys, 'len': L}
    print(k, 'len', round(L), 'n', len(pts), 'climb', round(ys[-1] - ys[0]))
json.dump({k: {'loop': v['loop'], 'len': round(v['len']), 'x': [round(p[0], 1) for p in v['pts']], 'z': [round(p[1], 1) for p in v['pts']], 'y': [round(y, 1) for y in v['ys']]} for k, v in OUT.items()}, open('crs/courses.json', 'w'))
