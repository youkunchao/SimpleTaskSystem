#!/usr/bin/env python3
# 补齐 manifest 中"有 key 但磁盘缺文件"的孤儿条目。
# 从 key( lang|role|text )反推 phrase，用与 gen_phrases.mjs 一致的音色映射合成。
import asyncio, edge_tts, json, os, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, '..', 'tts-audio')
MANIFEST = os.path.join(OUT_DIR, 'manifest.json')
CONCURRENCY = 12

def fname(key):
    return hashlib.sha1(key.encode('utf-8')).hexdigest()[:12] + '.mp3'

def voice_of(lang, role):
    if lang == 'en-US':
        return 'en-US-JennyNeural' if role == 'feedback' else 'en-US-AriaNeural'
    return 'zh-CN-XiaoyiNeural' if role == 'feedback' else 'zh-CN-XiaoxiaoNeural'

async def synth(phrase, path):
    comm = edge_tts.Communicate(phrase['text'], phrase['voice'])
    with open(path, 'wb') as f:
        async for chunk in comm.stream():
            if chunk['type'] == 'audio':
                f.write(chunk['data'])

async def worker(sem, queue, manifest, stats):
    while True:
        item = await queue.get()
        try:
            if item is None: break
            key = item
            fn = fname(key); fp = os.path.join(OUT_DIR, fn)
            if os.path.exists(fp) and os.path.getsize(fp) > 0:
                manifest[key] = fn; stats['skip'] += 1; continue
            async with sem:
                try:
                    lang, role, text = key.split('|', 2)
                    await synth({'text': text, 'voice': voice_of(lang, role)}, fp)
                    manifest[key] = fn; stats['done'] += 1
                except Exception as e:
                    print('FAIL', key, e); stats['fail'] += 1
        finally:
            queue.task_done()

async def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    manifest = json.load(open(MANIFEST, encoding='utf-8'))
    have = set(f for f in os.listdir(OUT_DIR) if f.endswith('.mp3'))
    q = asyncio.Queue()
    for k in manifest:
        if not have.issuperset({manifest[k]}):
            q.put_nowait(k)
    print('待补孤儿:', q.qsize())
    stats = {'done':0,'skip':0,'fail':0}
    sem = asyncio.Semaphore(CONCURRENCY)
    ws = [asyncio.create_task(worker(sem, q, manifest, stats)) for _ in range(CONCURRENCY)]
    await q.join()
    for _ in range(CONCURRENCY): await q.put(None)
    await asyncio.gather(*ws)
    json.dump(manifest, open(MANIFEST,'w',encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'DONE done={stats["done"]} skip={stats["skip"]} fail={stats["fail"]} total={len(manifest)}')

asyncio.run(main())
