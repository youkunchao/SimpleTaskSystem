#!/usr/bin/env python3
# 预合成脚本：读取 phrases.json，用 edge-tts 把每条固定文案合成 MP3 落盘。
#
# 用法：
#   1) pip install edge-tts
#   2) python server/scripts/gen_tts.py
#
# 说明：
#   - 输出目录 server/tts-audio/，文件名用 key 的 sha1 前 12 位（避免中文/特殊字符路径问题）。
#   - 生成 manifest.json：key -> 文件名，供后端 /api/tts 按 key 取音频。
#   - 可断点续跑：已存在且非空的 mp3 自动跳过。
#   - 失败的条目会打印 FAIL 并跳过，不影响其余；补跑即可。
#   - 并发合成（CONCURRENCY 路），大幅提升速度；仍为断点续跑安全。
#
# 注意：本机若无法连通微软 TTS 端点（被网络/WAF 拦截），请在你"能连通的机器"上跑本脚本，
#       把生成的 server/tts-audio/ 整个目录拷回项目即可。

import asyncio
import edge_tts
import json
import os
import hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
# 固定文案来自多个生成器：phrases.json（中文识字五步）、phrases_en.json（英语模块）
PHRASE_FILES = ['phrases.json', 'phrases_en.json']
OUT_DIR = os.path.join(HERE, '..', 'tts-audio')
MANIFEST = os.path.join(OUT_DIR, 'manifest.json')
CONCURRENCY = 12


def fname(key):
    return hashlib.sha1(key.encode('utf-8')).hexdigest()[:12] + '.mp3'


async def synth(phrase, path):
    # rate 可选：需要放慢的条目（如英语单词慢速版）单独指定，其余用默认语速
    rate = phrase.get('rate')
    comm = edge_tts.Communicate(phrase['text'], phrase['voice'], rate=rate) if rate \
        else edge_tts.Communicate(phrase['text'], phrase['voice'])
    with open(path, 'wb') as f:
        async for chunk in comm.stream():
            if chunk['type'] == 'audio':
                f.write(chunk['data'])


async def worker(semaphore, queue, manifest, stats):
    while True:
        item = await queue.get()
        try:
            if item is None:
                break
            idx, p = item
            fn = fname(p['key'])
            fp = os.path.join(OUT_DIR, fn)
            if os.path.exists(fp) and os.path.getsize(fp) > 0:
                manifest[p['key']] = fn
                stats['skipped'] += 1
                continue
            async with semaphore:
                try:
                    await synth(p, fp)
                    manifest[p['key']] = fn
                    stats['done'] += 1
                except Exception as e:
                    print(f'FAIL [{idx}] {p["key"]}: {e}')
                    stats['failed'] += 1
            if (stats['done'] + stats['skipped']) % 50 == 0:
                with open(MANIFEST, 'w', encoding='utf-8') as f:
                    json.dump(manifest, f, ensure_ascii=False, indent=2)
                print(f'progress done={stats["done"]} skipped={stats["skipped"]} failed={stats["failed"]}')
        finally:
            queue.task_done()


async def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    phrases = []
    seen = set()
    for name in PHRASE_FILES:
        p = os.path.join(HERE, name)
        if not os.path.exists(p):
            continue
        with open(p, 'r', encoding='utf-8') as f:
            for item in json.load(f):
                k = item.get('key')
                if not k or k in seen:
                    continue  # 多文件之间按 key 去重，避免重复合成
                seen.add(k)
                phrases.append(item)

    manifest = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST, 'r', encoding='utf-8') as f:
            manifest = json.load(f)

    stats = {'done': 0, 'skipped': 0, 'failed': 0}
    queue = asyncio.Queue()
    for i, p in enumerate(phrases):
        queue.put_nowait((i + 1, p))

    sem = asyncio.Semaphore(CONCURRENCY)
    workers = [asyncio.create_task(worker(sem, queue, manifest, stats)) for _ in range(CONCURRENCY)]

    await queue.join()
    for _ in range(CONCURRENCY):
        await queue.put(None)
    await asyncio.gather(*workers)

    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f'DONE. synthesized={stats["done"]} skipped={stats["skipped"]} failed={stats["failed"]} total_keys={len(manifest)}')


if __name__ == '__main__':
    asyncio.run(main())
