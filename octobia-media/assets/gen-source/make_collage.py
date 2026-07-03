import random, math
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

OUT = "/tmp/claude-0/-home-user-portfolio/3bc092c8-0423-55b5-8477-a6d81f4c7e47/scratchpad/gen"
random.seed(23)

W, H = 1600, 1000
INK = (16, 14, 10)
PAPER = (250, 246, 236)
YELLOW = (255, 241, 0)
MIDGREY = (98, 92, 78)

img = Image.new('RGB', (W, H), INK)
d = ImageDraw.Draw(img)

def rough_rect(draw, box, fill, jitter=3):
    x0, y0, x1, y1 = box
    pts_top = [(x0 + (x1-x0)*i/12 + random.uniform(-jitter,jitter), y0 + random.uniform(-jitter,jitter)) for i in range(13)]
    pts_right = [(x1 + random.uniform(-jitter,jitter), y0 + (y1-y0)*i/8 + random.uniform(-jitter,jitter)) for i in range(1,9)]
    pts_bottom = [(x1 - (x1-x0)*i/12 + random.uniform(-jitter,jitter), y1 + random.uniform(-jitter,jitter)) for i in range(13)]
    pts_left = [(x0 + random.uniform(-jitter,jitter), y1 - (y1-y0)*i/8 + random.uniform(-jitter,jitter)) for i in range(1,9)]
    poly = pts_top + pts_right + pts_bottom + pts_left
    draw.polygon(poly, fill=fill)

cols, rows = 6, 4
margin = 40
gx, gy = (W - margin*2)/cols, (H - margin*2)/rows
for r in range(rows):
    for c in range(cols):
        if random.random() < 0.26:
            continue
        x0 = margin + c*gx + random.uniform(4,10)
        y0 = margin + r*gy + random.uniform(4,10)
        x1 = x0 + gx - random.uniform(14,22)
        y1 = y0 + gy - random.uniform(14,22)
        tone = random.choices([PAPER, MIDGREY, YELLOW, INK], weights=[3,2,3,1])[0]
        rough_rect(d, (x0,y0,x1,y1), tone, jitter=2.5)

def crop_mark(draw, x, y, size=15, color=(230,224,208)):
    draw.line([(x-size, y), (x-4, y)], fill=color, width=2)
    draw.line([(x+4, y), (x+size, y)], fill=color, width=2)
    draw.line([(x, y-size), (x, y-4)], fill=color, width=2)
    draw.line([(x, y+4), (x, y+size)], fill=color, width=2)

for _ in range(12):
    cx = random.uniform(margin, W-margin)
    cy = random.uniform(margin, H-margin)
    crop_mark(d, cx, cy, size=14)

bar_h = 70
bar_y = H - bar_h - 30
bars = [(235,235,235),(235,235,60),(60,220,235),(60,215,70),(220,60,215),(220,55,60),(60,80,220)]
bar_w = (W - margin*2) / len(bars)
for i, col in enumerate(bars):
    x0 = margin + i*bar_w
    d.rectangle([x0, bar_y, x0+bar_w, bar_y+bar_h], fill=col)

tri_cx, tri_cy, tri_r = W*0.16, H*0.30, 46
d.polygon([(tri_cx-tri_r*0.55, tri_cy-tri_r),(tri_cx-tri_r*0.55, tri_cy+tri_r),(tri_cx+tri_r*0.9, tri_cy)], fill=YELLOW)

# scratches: thin random near-vertical light/dark lines (film damage grunge)
for _ in range(26):
    x = random.uniform(0, W)
    y0 = random.uniform(-50, H*0.3)
    y1 = y0 + random.uniform(H*0.4, H*1.1)
    col = random.choice([(255,255,255), (0,0,0)])
    op = random.uniform(0.08, 0.22)
    layer = Image.new('RGBA', (W,H), (0,0,0,0))
    ld = ImageDraw.Draw(layer)
    wobble_x = x + random.uniform(-6,6)
    ld.line([(x,y0),(wobble_x,y1)], fill=col+(int(255*op),), width=random.choice([1,1,2]))
    img.paste(Image.alpha_composite(img.convert('RGBA'), layer).convert('RGB'))

# fine grain
noise = (np.random.rand(H, W) * 255).astype('uint8')
grain_img = Image.fromarray(noise, mode='L')
grain_rgba = Image.merge('RGBA', (grain_img, grain_img, grain_img, Image.eval(grain_img, lambda p: int(p*0.045))))
img = Image.alpha_composite(img.convert('RGBA'), grain_rgba)

# very light corner darken only (subtle depth, not muddying)
vign = Image.new('L', (W,H), 0)
vd = ImageDraw.Draw(vign)
vd.ellipse([-W*0.3,-H*0.4,W*1.3,H*1.4], fill=255)
vign = vign.filter(ImageFilter.GaussianBlur(140))
dark = Image.new('RGBA', (W,H), (0,0,0,255))
mask = Image.eval(vign, lambda p: max(0, 60 - int(p*60/255)))
img = Image.composite(dark, img, mask)

img.convert('RGB').save(f"{OUT}/hero-collage.jpg", quality=84, optimize=True)
print("saved", __import__('os').path.getsize(f"{OUT}/hero-collage.jpg"))
