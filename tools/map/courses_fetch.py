import urllib.request, urllib.parse, json, time, os, sys
URL='https://maps.mail.ru/osm/tools/overpass/api/interpreter'
def q(name, query):
    fn='crs/'+name+'.json'
    if os.path.exists(fn) and os.path.getsize(fn)>400: return
    for a in range(4):
        try:
            d=urllib.parse.urlencode({'data':query}).encode()
            with urllib.request.urlopen(URL,data=d,timeout=300) as r: b=r.read()
            open(fn,'wb').write(b); print(name,len(b)); return
        except Exception as e: print(name,'err',e); time.sleep(6)
C={'suzuka':(34.8431,136.5410,2200),'fuji':(35.3717,138.9275,2200),'motegi':(36.5329,140.2272,2000),'sugo':(38.1400,140.7766,1500),'okayama':(34.9150,134.2210,1500),'tsukuba':(36.1500,139.9197,900),'autopolis':(33.0379,130.9690,1800)}
for k,(la,lo,r) in C.items():
    q('c_'+k,'[out:json][timeout:120];way["highway"="raceway"](around:%d,%f,%f);out geom tags;'%(r,la,lo))
T={
 'haruna':'[out:json][timeout:120];way["highway"]["ref"="33"](36.43,138.83,36.50,138.93);out geom tags;',
 'usui':'[out:json][timeout:120];way["highway"]["ref"="18"](36.33,138.62,36.37,138.72);out geom tags;',
 'iroha':'[out:json][timeout:120];way["highway"]["ref"="120"](36.72,139.48,36.75,139.55);out geom tags;',
 'turnpike':'[out:json][timeout:120];way["highway"]["name"~"ターンパイク"](35.15,139.05,35.30,139.20);out geom tags;',
 'tsubaki':'[out:json][timeout:120];way["highway"]["ref"="75"](35.12,139.02,35.20,139.12);out geom tags;',
 'akagi':'[out:json][timeout:120];way["highway"]["ref"="4"](36.50,139.14,36.56,139.20);out geom tags;',
 'myogi':'[out:json][timeout:120];way["highway"]["ref"="196"](36.28,138.70,36.32,138.76);out geom tags;',
}
for k,v in T.items(): q('t_'+k,v)
