import random, math
from PIL import Image, ImageDraw, ImageFilter, ImageOps
import numpy as np

OUT = "/tmp/claude-0/-home-user-portfolio/3bc092c8-0423-55b5-8477-a6d81f4c7e47/scratchpad/gen"

random.seed(7)
np.random.seed(7)

# ---------- 1. Grain texture (tileable, transparent, for mix-blend overlay) ----------
def make_grain(size=256, alpha_scale=70):
    noise = np.random.rand(size, size)
    # sharpen distribution so it reads as grit, not smooth cloud
    noise = (noise ** 3) if False else noise
    img = Image.fromarray((noise * 255).astype('uint8'), mode='L')
    img = img.filter(ImageFilter.SHARPEN)
    # build RGBA: white speckle with alpha from noise, on transparent
    arr = np.array(img).astype('uint8')
    rgba = np.zeros((size, size, 4), dtype='uint8')
    rgba[..., 0] = 255
    rgba[..., 1] = 255
    rgba[..., 2] = 255
    rgba[..., 3] = (arr.astype('float32') / 255.0 * alpha_scale).astype('uint8')
    out = Image.fromarray(rgba, mode='RGBA')
    out.save(f"{OUT}/grain.png")

make_grain()

# ---------- 2. Yellow grunge splat (rough torn brush blob, transparent bg) ----------
def make_splat(w=900, h=700):
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w / 2, h / 2
    base_r = min(w, h) * 0.36
    points = []
    n = 60
    for i in range(n):
        ang = (i / n) * 2 * math.pi
        wob = 1 + 0.28 * math.sin(ang * 5 + 1.3) + 0.16 * math.sin(ang * 11 + 0.4) + random.uniform(-0.09, 0.09)
        r = base_r * wob
        points.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    draw.polygon(points, fill=(245, 234, 20, 255))
    # a couple of detached spatter flecks
    for _ in range(14):
        ang = random.uniform(0, 2 * math.pi)
        dist = base_r * random.uniform(1.05, 1.55)
        fx, fy = cx + dist * math.cos(ang), cy + dist * math.sin(ang)
        fr = random.uniform(4, 22)
        draw.ellipse([fx - fr, fy - fr, fx + fr, fy + fr], fill=(245, 234, 20, 255))
    # rough up the edge: displace via noise-based erosion using alpha threshold on blurred+thresholded noise mask
    mask = img.split()[3]
    blurred = mask.filter(ImageFilter.GaussianBlur(3))
    n2 = (np.random.rand(h, w) * 60 - 30)
    arr = np.array(blurred).astype('int16')
    arr = np.clip(arr + n2, 0, 255).astype('uint8')
    rough_mask = Image.fromarray(arr, mode='L').point(lambda p: 255 if p > 110 else 0)
    rough_mask = rough_mask.filter(ImageFilter.GaussianBlur(1.2))
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    yellow = Image.new('RGBA', (w, h), (245, 234, 20, 255))
    out.paste(yellow, (0, 0), rough_mask)
    out.save(f"{OUT}/splat.png")

make_splat()

print("done")
