import json, math
d = json.load(open('crs/courses.json'))
ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
def enc(vals):
    out = []
    for v in vals:
        v = int(v); z = v * 2 if v >= 0 else -v * 2 - 1
        while True:
            c = z & 31; z >>= 5
            if z: out.append(ALPHA[c | 32])
            else: out.append(ALPHA[c]); break
    return ''.join(out)
def delta(vals):
    p = 0; o = []
    for v in vals: v = int(round(v)); o.append(v - p); p = v
    return o
WIN = {'haruna': 7000, 'usui': 7500, 'iroha': 6500, 'turnpike': 8000, 'tsubaki': 8000, 'akagi': 7500, 'myogi': 7000}
res = {}
for k, v in d.items():
    x, z, y = v['x'], v['z'], v['y']
    if not v['loop']:
        n = len(x); step = 4.0; w = int(WIN[k] / step)
        if n > w:
            hd = [math.atan2(x[i + 1] - x[i], z[i + 1] - z[i]) for i in range(n - 1)]
            turn = [0] + [abs((hd[i] - hd[i - 1] + math.pi) % (2 * math.pi) - math.pi) for i in range(1, n - 1)]
            cs = [0]
            for t in turn: cs.append(cs[-1] + t)
            best = max(range(0, n - w), key=lambda i: cs[i + w - 1] - cs[i])
            x, z, y = x[best:best + w], z[best:best + w], y[best:best + w]
        if y[0] > y[-1]: x, z, y = x[::-1], z[::-1], y[::-1]
    x0, z0, y0 = x[0], z[0], y[0]
    res[k] = {'loop': v['loop'], 'x': enc(delta([(a - x0) * 10 for a in x])), 'z': enc(delta([(a - z0) * 10 for a in z])), 'y': enc(delta([(a - y0) * 10 for a in y])), 'y0': round(y0, 1)}
    L = sum(math.hypot(x[i + 1] - x[i], z[i + 1] - z[i]) for i in range(len(x) - 1))
    print(k, round(L), 'climb', round(y[-1] - y[0]), 'n', len(x))
js = '/* 実在のサーキット・峠の形（OpenStreetMap, ODbL）と高さ（国土地理院 標高タイル）。単位 0.1m、差分を 64 文字の可変長で符号化。 */\n(function () { var TB = window.TB = window.TB || {}; TB.RaceCourseData = ' + json.dumps(res, separators=(',', ':')) + '; })();\n'
open('/home/user/TUI-BASE/assets/js/race-courses-data.js', 'w').write(js)
print(len(js) // 1024, 'KB')
