from PIL import Image

logo = Image.open(r'frontend\public\moneta-logo-transparent.png')
lw, lh = logo.size

def create_icon(s):
    tw = int(s * 0.9) # Takes up 90% of the width
    th = int(tw * (lh / lw))
    rl = logo.resize((tw, th), Image.Resampling.LANCZOS)
    c = Image.new('RGBA', (s, s), (255, 255, 255, 0))
    c.paste(rl, ((s - tw) // 2, (s - th) // 2), rl)
    return c

create_icon(512).save(r'frontend\public\pwa-512x512.png')
create_icon(192).save(r'frontend\public\pwa-192x192.png')
create_icon(180).save(r'frontend\public\apple-touch-icon.png')
create_icon(64).save(r'frontend\public\favicon.png')
