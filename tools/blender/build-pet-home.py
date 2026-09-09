"""Author the game's connected home in Blender. Run with blender -b -t 4 -P this_file."""
import bpy, math, random, pathlib, json, base64
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/animal-town/models/home-v18';OUT.mkdir(parents=True,exist_ok=True)
random.seed(17);bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,rough=.7,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
wood=material('Honey oak',(.57,.32,.13));cream=material('Warm plaster',(.89,.82,.66));sage=material('Sage painted wood',(.29,.48,.37));gold=material('Brushed brass',(.67,.42,.12),.35,.65);white=material('Ivory ceramic',(.93,.91,.83),.25);pink=material('Peach linen',(.77,.39,.30));fabric=material('Oatmeal boucle',(.83,.72,.53));dark=material('Walnut',(.17,.085,.035));leaf=material('Leaf green',(.18,.38,.15));soil=material('Soil',(.12,.07,.035));blue=material('Blue glass',(.38,.7,.79),.22);tile=material('Sage ceramic',(.55,.7,.64),.3);water=material('Bath water',(.32,.63,.68),.14);bookm=[material('Book '+str(i),c)for i,c in enumerate([(.57,.21,.13),(.28,.43,.39),(.8,.57,.2),(.54,.59,.65)])]
# Authored, packed texture maps export with the materials to the browser.
import numpy as np
for mat,kind in [(wood,'wood'),(fabric,'cloth'),(pink,'cloth')]:
 n=256;yy,xx=np.mgrid[:n,:n];rng=np.random.default_rng(31);noise=rng.random((n,n));base=np.array(mat.diffuse_color[:3]);v=(.9+.10*np.sin(xx*.22+np.sin(yy*.028)*2)+.035*noise) if kind=='wood' else (.90+.07*noise+.025*np.sin(xx*math.pi/2)*np.sin(yy*math.pi/2));pixels=np.ones((n,n,4),dtype=np.float32);pixels[:,:,:3]=np.clip(base[None,None,:]*v[:,:,None],0,1);im=bpy.data.images.new(mat.name+' texture',n,n);im.pixels.foreach_set(pixels.ravel());im.pack();node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
SPACE=math.sqrt(2)
ANCHOR=None
def finish(o,name,mat,use=None):
 if ANCHOR is not None:
  ax,az=ANCHOR;o.location.x=ax+(o.location.x-ax)/SPACE;o.location.y=-az+(o.location.y+az)/SPACE;o.scale.x/=SPACE;o.scale.y/=SPACE
 o.name=name;o.data.materials.append(mat)
 if use:o['homeUse']=use
 return o
def box(name,w,h,d,x,y,z,mat,bevel=.04,use=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.scale=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Soft crafted edges','BEVEL');mod.width=min(bevel,min(w,h,d)*.32);mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
  mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,name,mat,use)
def ell(name,w,h,d,x,y,z,mat,use=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=1,location=(x,-z,y));o=bpy.context.object;o.scale=(w/2,d/2,h/2);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for p in o.data.polygons:p.use_smooth=True
 return finish(o,name,mat,use)
def cyl(name,r,h,x,y,z,mat,r2=None,use=None):
 bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=r,radius2=r if r2 is None else r2,depth=h,location=(x,-z,y));o=bpy.context.object
 for p in o.data.polygons:p.use_smooth=True
 return finish(o,name,mat,use)
def plant(x,z,y=0,s=1):
 cyl('Terracotta pot',.27*s,.48*s,x,y+.24*s,z,pink,.34*s);cyl('Pot soil',.30*s,.035*s,x,y+.47*s,z,soil)
 for i in range(7):
  a=i*2.399;lx=x+math.cos(a)*.24*s;lz=z+math.sin(a)*.24*s;o=ell('Leaf',.26*s,.62*s,.15*s,lx,y+(.68+i*.027)*s,lz,leaf);o.rotation_euler=(math.sin(a)*.45,math.cos(a)*.45,a)
def table(x,z,w=1.6,d=1.05):
 box('Oak table',w,.13,d,x,.86,z,wood,.06,use='fridge')
 for dx in [-w*.38,w*.38]:
  for dz in [-d*.34,d*.34]:box('Tapered leg',.12,.8,.12,x+dx,.4,z+dz,wood)
def lamp(x,z,y):
 cyl('Lamp brass stem',.035,.35,x,y+.2,z,gold);cyl('Lamp base',.14,.04,x,y,z,gold);cyl('Linen shade',.24,.30,x,y+.48,z,fabric,.16)
def cabinet(x,z,w=.8):
 box('Cabinet',w,.72,.62,x,.4,z,wood)
 for y in [.24,.55]:box('Drawer',w-.08,.25,.04,x,y,z+.33,sage);box('Drawer handle',.19,.035,.06,x,y,z+.37,gold)
# Continuous house shell, same coordinates as gameplay and old saves.
box('Foundation',17,.18,15,4.5,-.13,-4,wood)
for cx,cz,w,d in [(0,0,8,7),(9,0,8,7),(0,-7.5,8,8),(4.5,-3.75,1,15)]:
 for row in range(math.ceil(d/.48)):
  z=cz-d/2+row*.48+.24
  for col in range(math.ceil(w/1.6)):
   pw=min(1.58,w-col*1.6-.01)
   if pw>0:box('Oak floor plank',pw,.075,min(.465,d-row*.48),cx-w/2+col*1.6+pw/2,-.015,z,wood,.012)
for i in range(10):
 for j in range(10):box('Bathroom floor tile',.78,.08,.78,5.4+i*.8,-.015,-11.1+j*.8,tile,.018)
box('Back wall',17,3.6,.16,4.5,1.75,-11.55,cream)
box('Left wall',.16,3.6,15,-4.05,1.75,-4,cream)
box('Back skirting',17,.24,.09,4.5,.14,-11.42,sage);box('Side skirting',.09,.24,15,-3.92,.14,-4,sage)
for x in [-2.55,2.55,6.45,11.55]:box('Room partition',2.9,.85,.16,x,.39,-3.65,cream);box('Partition cap',2.96,.09,.2,x,.85,-3.65,wood)
for z in [-9.6,-5.3,-2.3,2.3]:box('Passage partition',.16,.85,2.5,4.45,.39,z,cream);box('Partition cap',.2,.09,2.56,4.45,.85,z,wood)
# Framed windows, curtain folds, plants and soft furnishings.
for x in [-2,9]:
 box('Window sky',2.4,1.75,.09,x,2.3,-11.4,blue)
 for dx in [-1.23,0,1.23]:box('Window upright',.10,1.95,.17,x+dx,2.3,-11.29,wood)
 for y in [1.32,2.3,3.28]:box('Window rail',2.56,.10,.17,x,y,-11.29,wood)
 box('Window sill',2.8,.12,.38,x,1.29,-11.15,wood)
 for side in [-1,1]:
  for k in range(4):cyl('Curtain pleat',.095,2.15,x+side*(1.4+k*.11),2.16,-11.06,fabric)
ANCHOR=(0,0)
# Living room sofa shaped cushions and piping, to the west of the walking path.
for z in [-.65,.65]:box('Sofa foot',.15,.18,.15,-2.75,.12,z,dark)
box('Sofa base',1.18,.36,2.08,-2.68,.35,0,pink,.15)
box('Sofa upholstered back',.24,.96,2.12,-3.2,.78,0,pink,.11)
for z in [-.96,.96]:box('Sofa arm',1.15,.64,.23,-2.66,.62,z,pink,.11)
for z in [-.46,.46]:box('Seat cushion',.93,.22,.82,-2.6,.65,z,fabric,.10);box('Back cushion',.22,.62,.82,-3.03,.99,z,fabric,.09)
ell('Sage accent cushion',.22,.44,.46,-2.96,1.03,.38,sage)
ell('Woven living rug',3.0,.05,2.35,.2,.04,.4,fabric)
for x,z,s in [(-3.3,2.4,1),(-2.9,-2.7,.7),(3.3,2.7,.65)]:plant(x,z,0,s)
table(-2.9,-2.7,.85,.65);plant(-2.9,-2.7,.95,.6)
box('Low oak bookshelf',1.55,.7,.38,2.6,.4,-3,wood)
for i in range(12):box('Story book',.085,.25+(i%3)*.06,.25,2+i*.09,.91,-3,bookm[i%4],.01)
lamp(3.12,-3,.78)
ANCHOR=None
# Living-room window and framed art on the west wall, facing into the room.
box('Living window glass',.07,1.6,2.2,-3.91,2.22,-.6,blue)
for z in [-1.76,-.6,.56]:box('Living window upright',.15,1.83,.095,-3.80,2.22,z,wood)
for y in [1.32,2.22,3.12]:box('Living window rail',.15,.095,2.4,-3.80,y,-.6,wood)
box('Living sill',.37,.13,2.6,-3.68,1.29,-.6,wood)
for z in [-1.95,.77]:
 for k in range(3):cyl('Living curtain fold',.07,1.98,-3.63,2.17,z+k*.12,fabric)
box('Wall picture frame',.1,.95,.78,-3.82,2.05,2.3,wood)
box('Wall picture canvas',.035,.8,.63,-3.75,2.05,2.3,fabric)
ell('Picture paw pad',.025,.27,.27,-3.72,1.98,2.3,pink)
for z,y in [(2.08,2.18),(2.23,2.30),(2.40,2.3),(2.54,2.17)]:ell('Picture paw toe',.03,.13,.12,-3.72,y,z,pink)
ANCHOR=(0,-7.5)
# Master bedroom: layered quilt, upholstered headboard, pillows, bedside lamps.
box('Bed frame',2.8,.36,2.3,0,.28,-9,wood,.1,use='bed')
box('Mattress',2.62,.32,2.13,0,.59,-9,white,.13,use='bed');box('Quilt',2.66,.18,1.42,0,.81,-8.66,pink,.075,use='bed')
box('Upholstered headboard',2.95,1.3,.2,0,.9,-10.16,fabric,.08)
for x in [-.65,.65]:box('Pillow',1.06,.18,.49,x,.85,-9.72,white,.085)
for x in [-2,2]:cabinet(x,-9.4);lamp(x,-9.4,.83)
ell('Bedroom rug',3.8,.04,3.7,0,.035,-8.2,fabric);plant(3,-10,0,.9)
box('Wardrobe',1.25,2.3,.66,-3,1.18,-9.7,sage)
for x in [-3.32,-2.68]:box('Wardrobe panel',.54,2.16,.045,x,1.18,-9.34,cream);cyl('Wardrobe knob',.055,.06,x,1.17,-9.28,gold)
ANCHOR=(9,0)
# Kitchen cabinet fronts, inset panels, worktop and backsplash.
for x in [6.5,8.2,9.9]:
 box('Kitchen base',1.5,.91,.75,x,.49,-2.85,sage,.04,use='fridge');box('Stone worktop',1.57,.11,.83,x,.99,-2.85,white,.035,use='fridge')
 for dx in [-.36,.36]:
  box('Cabinet front',.68,.74,.05,x+dx,.5,-2.43,sage,.035);box('Recessed panel',.53,.57,.03,x+dx,.5,-2.39,cream,.02);box('Brass pull',.2,.032,.06,x+dx,.75,-2.34,gold)
box('Sink basin',.75,.06,.46,6.5,1.058,-2.85,blue,.10,use='bath');cyl('Tap',.03,.4,6.5,1.22,-3.15,gold);box('Tap spout',.04,.04,.22,6.5,1.4,-3.04,gold)
box('Fridge',1.1,2.25,.85,12,1.15,-2.6,white,.09,use='fridge')
for y in [.63,1.8]:box('Fridge door',1.03,.98,.07,12,y,-2.13,sage,.045,use='fridge');box('Fridge handle',.06,.48,.09,11.62,y,-2.04,gold)
cyl('Dining tabletop',1.05,.13,9,.9,1,wood,use='fridge');cyl('Dining pedestal',.15,.83,9,.43,1,sage);cyl('Pedestal foot',.45,.08,9,.08,1,sage)
for x,z in [(7.6,1),(10.4,1),(9,-.3),(9,2.3)]:
 box('Dining seat',.6,.12,.62,x,.51,z,wood);box('Chair cushion',.52,.10,.52,x,.62,z,fabric)
 for dx in [-.23,.23]:
  for dz in [-.23,.23]:box('Chair leg',.055,.46,.055,x+dx,.25,z+dz,wood,.018)
 box('Chair back',.6,.52,.085,x,.85,z-.27,sage,.06)
for x in [8.5,9.5]:cyl('Dinner plate',.23,.03,x,.983,1,white);cyl('Cup',.085,.17,x,1.06,.58,white)
plant(12,2.7,0,.9)
ANCHOR=(9,-7.5)
# Bathroom: rounded rim and recessed water, shower tray, basin, towel rail.
box('Tub pedestal',1.55,.12,2.1,6.8,.1,-9.5,white,.055,use='bath');box('Tub body',1.55,.52,2.1,6.8,.36,-9.5,white,.18,use='bath');box('Recessed bath water',1.26,.055,1.78,6.8,.62,-9.5,water,.09,use='bath')
for x in [6.09,7.51]:box('Tub side rim',.14,.12,1.97,x,.65,-9.5,white,.055,use='bath')
for z in [-10.48,-8.52]:box('Tub end rim',1.53,.12,.14,6.8,.65,z,white,.05,use='bath')
cyl('Bath tap',.035,.55,6.8,.83,-10.4,gold);box('Tap outlet',.04,.04,.3,6.8,1.1,-10.24,gold)
box('Shower tray',1.6,.12,1.6,11.7,.1,-9.6,white,.08,use='bath');cyl('Shower pipe',.027,2.2,12.23,1.2,-10.25,gold);ell('Shower head',.3,.055,.3,12.23,2.3,-10.02,gold)
box('Vanity',1.05,.8,.65,9.2,.44,-10.6,sage,.05);ell('Wash basin',.85,.14,.55,9.2,.94,-10.6,white,use='bath');box('Mirror frame',1.15,1.3,.09,9.2,2.0,-11.33,wood);box('Mirror',1.02,1.17,.04,9.2,2,-11.26,blue)
box('Washer',1.1,1.0,.85,11.8,.55,-6,white,.09);ell('Washer front',.69,.69,.06,11.8,.52,-5.55,dark);ell('Washer glass',.53,.53,.065,11.8,.52,-5.50,blue)
cabinet(6.4,-5.2,1.1)
for y in [.86,.96,1.06]:box('Folded towel',.73,.085,.4,6.4,y,-5.2,fabric,.03)
ell('Bath mat',1.6,.045,1.2,9,.04,-7,fabric);plant(6,-10.7,0,.7)
# Merge meshes by material and use; preserve semantic interaction metadata in glTF extras.
groups={}
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':groups.setdefault((o.data.materials[0].name,o.get('homeUse','')),[]).append(o)
for (mat,use),obs in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in obs:o.select_set(True)
 bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();o=bpy.context.object;o.name='Home '+mat+(' '+use if use else '')
 if use:o['homeUse']=use
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'pet-home.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'pet-home.glb'),export_format='GLB',export_extras=True,export_yup=True)
raw=(OUT/'pet-home.glb').read_bytes();(OUT/'pet-home.js').write_text('window.KittyHomeGLB="'+base64.b64encode(raw).decode()+'";\n')
print('HOME_EXPORT',len(raw),'bytes',len(bpy.context.scene.objects),'draw groups')
