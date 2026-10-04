from PIL import Image

# Read the original transparent cropped logo (the 'M' part)
logo = Image.open(r'frontend\public\moneta-logo-transparent.png')
w, h = logo.size

# We need to crop just the 'M' again (since the previous script didn't save the cropped 'M' separately, it just generated the icons from it in memory)
pixels = logo.load()

# Find the gap
split_x = None
for x in range(h // 2, w):
    is_empty = True
    for y in range(h):
        if pixels[x, y][3] > 0:
            is_empty = False
            break
    if is_empty:
        split_x = x
        break

if split_x is None:
    split_x = int(h * 1.2)

icon_only = logo.crop((0, 0, split_x, h))
bbox = icon_only.getbbox()
if bbox:
    icon_only = icon_only.crop(bbox)

lw, lh = icon_only.size

# The app background is #0f172a which is RGB(15, 23, 42)
BG_COLOR = (15, 23, 42, 255)

def create_icon(s):
    # Square icon taking up 80% of canvas
    tw = int(s * 0.8)
    th = int(tw * (lh / lw))
    if th > int(s * 0.8):
        th = int(s * 0.8)
        tw = int(th * (lw / lh))
        
    rl = icon_only.resize((tw, th), Image.Resampling.LANCZOS)
    
    # Create a SOLID dark blue background canvas
    c = Image.new('RGBA', (s, s), BG_COLOR)
    
    # We must use 'rl' as the mask when pasting so the transparency works correctly
    c.paste(rl, ((s - tw) // 2, (s - th) // 2), rl)
    
    # Since PWA icons don't need alpha if they have a solid background, we can convert to RGB
    return c.convert('RGB')

create_icon(512).save(r'frontend\public\pwa-512x512.png')
create_icon(192).save(r'frontend\public\pwa-192x192.png')
create_icon(180).save(r'frontend\public\apple-touch-icon.png')
create_icon(64).save(r'frontend\public\favicon.png')
