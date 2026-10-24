"""Generate test fixtures, not application output. Run from any working directory."""
from pathlib import Path
import math, json
import numpy as np
import trimesh
import shapely
from shapely.geometry import Polygon
from shapely.ops import triangulate

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'fixtures'
OUT.mkdir(exist_ok=True)
N = 64

def circle(x, y, r):
    return [(x+r*math.cos(2*math.pi*i/N), y+r*math.sin(2*math.pi*i/N)) for i in range(N)]

def rectangle(x, y):
    return [(-x/2,-y/2),(x/2,-y/2),(x/2,y/2),(-x/2,y/2)]

def cap(tris, poly, z, up=True):
    accepted = [t for t in triangulate(poly) if poly.covers(t)]
    area = sum(t.area for t in accepted)
    if not math.isclose(area, poly.area, abs_tol=1e-7):
        raise ValueError('Cap triangulation area mismatch')
    for t in accepted:
        c = list(t.exterior.coords)[:3]
        a,b,d = c
        if (b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0]) < 0:
            c.reverse()
        pts = [(p[0],p[1],z) for p in c]
        tris.append(pts if up else pts[::-1])

def side(tris, loop, z0, z1, hole=False):
    ring = list(reversed(loop)) if hole else loop
    for i, a in enumerate(ring):
        b=ring[(i+1)%len(ring)]
        a0,b0,a1,b1=(a[0],a[1],z0),(b[0],b[1],z0),(a[0],a[1],z1),(b[0],b[1],z1)
        tris.extend([[a0,b0,b1],[a0,b1,a1]])

def mesh(tris):
    arr=np.asarray(tris,dtype=float)
    m=trimesh.Trimesh(vertices=arr.reshape(-1,3),faces=np.arange(len(arr)*3).reshape(-1,3),process=True)
    if not m.is_watertight or not m.is_winding_consistent or m.volume <= 0:
        raise ValueError('Invalid generated mesh')
    return m

def prism(outer, holes, low, high):
    poly=Polygon(outer, holes)
    tris=[]
    cap(tris,poly,low,False); cap(tris,poly,high)
    side(tris,outer,low,high)
    for h in holes: side(tris,h,low,high,True)
    return mesh(tris)

def part(base, features, base_height=4, top=18):
    # Every feature is an outer loop plus zero or more through-hole loops.
    all_holes=[h for outer, holes in features for h in holes]
    tris=[]
    cap(tris,Polygon(base,all_holes),0,False)
    cap(tris,Polygon(base,[outer for outer,holes in features]),base_height)
    side(tris,base,0,base_height)
    for outer, holes in features:
        cap(tris,Polygon(outer,holes),top)
        side(tris,outer,base_height,top)
        for h in holes: side(tris,h,0,top,True)
    return mesh(tris)

cases=[
 ('single_boss',circle(0,0,15),[(circle(0,0,6),[circle(0,0,2.5)])],[(0,0)],18),
 ('straight_wall',rectangle(50,24),[(rectangle(34,4),[])],[(0,0)],18),
 ('ten_bosses',rectangle(110,50),[(circle(x,y,6),[circle(x,y,2.5)]) for y in [-12,12] for x in [-44,-22,0,22,44]],[(x,y) for y in [-12,12] for x in [-44,-22,0,22,44]],16),
]
manifest={'units':'mm','build_axis':'+Z','root_z':4,'reference_depth':3,'reference_overlap':2,'modifier_z_range':[1,6],'fixture_note':'Synthetic test data, not user original geometry or automatic app output.','cases':[]}
results=[]

def save(m,name,expected):
    path=OUT/name
    m.export(path)
    loaded=trimesh.load_mesh(path,process=True)
    assert loaded.is_watertight and loaded.is_winding_consistent
    assert np.isclose(loaded.volume,expected,rtol=1e-6,atol=1e-5)
    results.append({'file':name,'triangles':len(loaded.faces),'watertight':bool(loaded.is_watertight),'consistent_winding':bool(loaded.is_winding_consistent),'bounds_mm':loaded.bounds.tolist(),'volume_mm3':float(loaded.volume),'expected_polyhedral_volume_mm3':float(expected)})

for name,base,features,centres,top in cases:
    m=part(base,features,top=top)
    basepoly=Polygon(base,[h for outer,holes in features for h in holes])
    upper=sum(Polygon(outer,holes).area for outer,holes in features)
    expected=basepoly.area*4+upper*(top-4)
    modelname=name+'.stl'
    save(m,modelname,expected)
    mods=[]
    for i,(outer,holes) in enumerate(features,1):
        modifier=prism(outer,holes,1,6)
        filename=f'{name}_modifier_{i:02d}.stl'
        save(modifier,filename,Polygon(outer,holes).area*5)
        mods.append({'file':filename,'centre_xy':list(centres[i-1]),'outer_loop_xy':outer,'holes_xy':holes})
    manifest['cases'].append({'name':name,'model':modelname,'root_z':4,'top_z':top,'modifier_count':len(mods),'modifiers':mods})

(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
(OUT/'mesh_validation.json').write_text(json.dumps({'status':'all generated STL geometry checks passed','not_tested':['application UI','generated 3MF','Bambu import','Bambu slicing','print strength'],'libraries':{'numpy':np.__version__,'trimesh':trimesh.__version__,'shapely':shapely.__version__},'checks':results},indent=2),encoding='utf-8')
print(f'Validated {len(results)} STL files across {len(cases)} cases.')
