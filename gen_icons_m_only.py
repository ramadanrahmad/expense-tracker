from PIL import Image

logo = Image.open(r'frontend\public\moneta-logo-transparent.png')
w, h = logo.size
pixels = logo.load()

# Find the right edge of the 'M' symbol by looking for a vertical transparent gap
# Start scanning from x = h//2 (to skip the 'M' itself)
split_x = None
for x in range(h // 2, w):
    is_empty = True
    for y in range(h):
        if pixels[x, y][3] > 0: # If pixel is not fully transparent
            is_empty = False
            break
    if is_empty:
        # We found the first completely empty column!
        split_x = x
        break

if split_x is None:
    split_x = int(h * 1.2) # Fallback

icon_only = logo.crop((0, 0, split_x, h))
bbox = icon_only.getbbox()
if bbox:
    icon_only = icon_only.crop(bbox)

lw, lh = icon_only.size

def create_icon(s):
    # Square icon taking up 80% of canvas
    tw = int(s * 0.8)
    th = int(tw * (lh / lw))
    if th > int(s * 0.8):
        th = int(s * 0.8)
        tw = int(th * (lw / lh))
        
    rl = icon_only.resize((tw, th), Image.Resampling.LANCZOS)
    c = Image.new('RGBA', (s, s), (255, 255, 255, 0))
    c.paste(rl, ((s - tw) // 2, (s - th) // 2), rl)
    return c

create_icon(512).save(r'frontend\public\pwa-512x512.png')
create_icon(192).save(r'frontend\public\pwa-192x192.png')
create_icon(180).save(r'frontend\public\apple-touch-icon.png')
create_icon(64).save(r'frontend\public\favicon.png')
