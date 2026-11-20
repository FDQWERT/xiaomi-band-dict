#!/usr/bin/env python3
"""生成 96x96 应用图标：绿色圆底 + 白色放大镜（手环启动器图标格约 96px，用 96 只占一格）。"""
import math
import struct
import zlib

S = 96
SS = 8
GREEN = (52, 211, 153)
WHITE = (255, 255, 255)

CX = CY = S / 2.0
R_CIRCLE = S / 2.0

# 放大镜：镜圈 + 手柄
RING_CX, RING_CY = 41.0, 41.0
RING_OUT, RING_IN = 21.0, 13.0
HANDLE = (54.5, 54.5, 72.0, 72.0)
HALF_W = 4.6


def dist_seg(px, py, x1, y1, x2, y2):
    dx, dy = x2 - x1, y2 - y1
    L2 = dx * dx + dy * dy
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / L2))
    return math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))


rows = []
for y in range(S):
    row = bytearray()
    for x in range(S):
        n = 0
        hits = 0
        for sy in range(SS):
            for sx in range(SS):
                px = x + (sx + 0.5) / SS
                py = y + (sy + 0.5) / SS
                if math.hypot(px - CX, py - CY) > R_CIRCLE:
                    continue
                n += 1
                d_ring = math.hypot(px - RING_CX, py - RING_CY)
                if RING_IN <= d_ring <= RING_OUT:
                    hits += 1
                elif dist_seg(px, py, *HANDLE) <= HALF_W:
                    hits += 1
        total = SS * SS
        if n == 0:
            row += bytes((0, 0, 0, 0))
            continue
        a_bg = n / total
        a_ink = hits / n
        r = int(WHITE[0] * a_ink + GREEN[0] * (1 - a_ink))
        g = int(WHITE[1] * a_ink + GREEN[1] * (1 - a_ink))
        b = int(WHITE[2] * a_ink + GREEN[2] * (1 - a_ink))
        row += bytes((r, g, b, int(255 * a_bg)))
    rows.append(bytes(row))

raw = b"".join(b"\x00" + r for r in rows)


def chunk(tag, data):
    c = struct.pack(">I", len(data)) + tag + data
    return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", struct.pack(">IIBBBBB", S, S, 8, 6, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(raw, 9))
png += chunk(b"IEND", b"")
open("src/common/logo.png", "wb").write(png)
print("wrote src/common/logo.png", S, "x", S, len(png), "bytes")
