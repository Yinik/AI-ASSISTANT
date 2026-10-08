#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_prototype_pdf.py —— 整理「完整原型图 PDF」：去掉重复页 + 补书签（大纲）。

为什么要这个脚本
----------------
原型图 PDF 由 32 张画面排版而成（封面 00 + 编号 01–31），原始文件存在两个问题：

1. **重复页**：有 9 张截图被整页重复渲染了一次（同一张图的像素指纹出现在相邻两页），
   于是 PDF 变成 37 页 —— 页数与《02-页面与状态清单.md》的编号对不上，评审翻着会困惑。
2. **没有书签**：PDF 页码 ≠ 截图编号（因为部分页面放了两张图），评审想找「21_F1」只能一页页翻。

本脚本做两件事，每步都校验，任一步校验不过就不写回原文件：

- 去重：只删除「页面上的图片指纹与上一页完全相同、且本页没有编号标签」的页。
- 书签：用页面上的编号标签文本（如 `21_F1_家属端_首页_正常日`）自动建立编号 → 页码的映射，
  再写入两层大纲（老人端 E1–E17 / 家属端 F1–F9）。不改变任何画面内容与分辨率。

用法
----
    pip install pypdf
    python fix_prototype_pdf.py <原型图.pdf> [输出PDF]

默认原地更新（先写临时文件，校验通过后再替换）。不传输出路径时会自动备份一份 <原名>.orig.pdf。
"""

import hashlib
import os
import re
import sys

from pypdf import PdfReader, PdfWriter

LABEL_RE = re.compile(r'^(\d{2})_((?:E|F)\d+)_(.+)$')


# --------------------------------------------------------------------- 工具
def image_fingerprints(page):
    """返回该页所有图片的数据指纹（用 pypdf 解出的原始像素数据做 MD5）。"""
    out = []
    for im in page.images:
        out.append(hashlib.md5(im.data).hexdigest())
    return out


def collect_labels(reader):
    """扫描每页文本，收集编号标签。返回 页码/标题/编号 三张映射表。"""
    page_of, title_of, code_of = {}, {}, {}
    for pi, page in enumerate(reader.pages):
        text = page.extract_text() or ''
        for line in text.splitlines():
            m = LABEL_RE.match(line.strip())
            if not m:
                continue
            idx, code, name = m.group(1), m.group(2), m.group(3)
            page_of[idx], code_of[idx] = pi, code
            parts = name.split('_')
            if parts and parts[0] in ('老人端', '家属端'):
                parts = parts[1:]
            title_of[idx] = '%s %s %s' % (idx, code, ' · '.join(parts))
    return page_of, title_of, code_of


# ------------------------------------------------------------- 步骤 1：去重
def find_duplicate_pages(reader):
    """找出重复页（0 基页码）。

    原始 PDF 的重复形态是「一张无编号页 + 紧跟一张带编号页」，两页渲染的是同一张图，
    例如 [p3: 无标签 | 图A] [p4: 标签 02_E2 | 图A]；也有 [p7: 无标签 | 图A] [p8: 标签 04/05 | 图A + 图B]。

    因此判定规则：**自身没有编号标签、且它的图片指纹全部出现在下一页**，才算重复页。
    这样只删掉纯粹的重复，不会误删任何一张独立画面（删完会再校验图片集合不变）。
    """
    dups = []
    pages = reader.pages
    for pi in range(len(pages) - 1):
        page, nxt = pages[pi], pages[pi + 1]
        fp = image_fingerprints(page)
        if not fp:
            continue
        has_label = any(LABEL_RE.match(l.strip())
                        for l in (page.extract_text() or '').splitlines())
        if has_label:
            continue
        if set(fp) <= set(image_fingerprints(nxt)):
            dups.append(pi)
    return dups


# --------------------------------------------------------------------- 主流程
def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else src
    work = dst + '.work.pdf'

    reader = PdfReader(src)
    total_in = len(reader.pages)
    fps_in = set()
    for p in reader.pages:
        fps_in.update(image_fingerprints(p))

    # ---- 步骤 1：去重 ----
    dups = find_duplicate_pages(reader)
    print('[1/2] 去重')
    print('      检出重复页（1 基页码）: %s' % ([d + 1 for d in dups] or '无'))

    writer = PdfWriter()
    keep = [pi for pi in range(len(reader.pages)) if pi not in set(dups)]
    for pi in keep:
        writer.add_page(reader.pages[pi])
    with open(work, 'wb') as f:
        writer.write(f)

    mid = PdfReader(work)
    fps_mid = set()
    for p in mid.pages:
        fps_mid.update(image_fingerprints(p))
    if fps_mid != fps_in:
        os.remove(work)
        print('      ✗ 去重后图片集合发生变化，可能有画面被误删 —— 已放弃，原文件未改动。')
        return 1
    print('      页数 %d -> %d，图片集合不变（%d 张）' % (total_in, len(mid.pages), len(fps_in)))

    # ---- 步骤 2：书签 ----
    page_of, title_of, code_of = collect_labels(mid)
    print('[2/2] 补书签')
    if not page_of:
        os.remove(work)
        print('      ✗ 未在页面上找到编号标签 —— 已放弃，原文件未改动。')
        return 1

    final = PdfWriter(clone_from=work)
    cover = final.add_outline_item('封面与编号索引（含 00 演示控制条）', 0)
    for prefix, group in (('E', '老人端 E1–E17'), ('F', '家属端 F1–F9')):
        items = [i for i in sorted(page_of) if code_of[i].startswith(prefix)]
        if not items:
            continue
        parent = final.add_outline_item(group, page_of[items[0]], parent=cover)
        for idx in items:
            final.add_outline_item(title_of[idx], page_of[idx], parent=parent)
    with open(work, 'wb') as f:
        final.write(f)

    # ---- 总校验 ----
    check = PdfReader(work)
    outlined = b'/Outlines' in open(work, 'rb').read()
    ok = (fps_in == _fps(check)) and outlined and len(check.pages) == total_in - len(dups)
    print('      编号覆盖: %d / 31 张（缺: %s）'
          % (len(page_of), sorted(set('%02d' % i for i in range(1, 32)) - set(page_of)) or '无'))
    print('      书签条数: %d，大纲已写入: %s' % (2 + len(page_of), '是' if outlined else '否'))

    if not ok:
        os.remove(work)
        print('      ✗ 总校验未通过 —— 已放弃，原文件未改动。')
        return 1

    if dst == src:
        # 原文件备份放到系统临时目录，避免把备份文件一起提交进仓库
        import tempfile
        backup = os.path.join(tempfile.gettempdir(), os.path.basename(src) + '.orig.pdf')
        if not os.path.exists(backup):
            with open(backup, 'wb') as f:
                f.write(open(src, 'rb').read())
            print('      原文件已备份到: %s' % backup)
    os.replace(work, dst)
    print('\n完成：%s（%d -> %d 页）' % (dst, total_in, len(check.pages)))
    return 0


def _fps(reader):
    s = set()
    for p in reader.pages:
        s.update(image_fingerprints(p))
    return s


if __name__ == '__main__':
    sys.exit(main())
