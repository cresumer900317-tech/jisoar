"""hf/H*.png 를 번호 붙인 2열 시트(JPG)로."""
import glob, os, sys
from PIL import Image, ImageDraw, ImageFont
files = sorted(glob.glob("hf/H*.png"))
W, H = 900, 600
cols = 2
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * W + (cols + 1) * 12, rows * H + (rows + 1) * 12), "#dddddd")
font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 30)
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB")
    im.thumbnail((W, H))
    cell = Image.new("RGB", (W, H), "#ffffff")
    cell.paste(im, ((W - im.width) // 2, (H - im.height) // 2))
    ImageDraw.Draw(cell).text((14, 10), os.path.basename(f)[1:3], fill="#e0281e", font=font)
    r, c = divmod(i, cols)
    sheet.paste(cell, (12 + c * (W + 12), 12 + r * (H + 12)))
sheet.save(sys.argv[1] if len(sys.argv) > 1 else "hf_sheet.jpg", quality=88)
print(len(files))
