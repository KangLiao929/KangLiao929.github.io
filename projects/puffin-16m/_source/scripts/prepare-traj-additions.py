#!/usr/bin/env python3
"""Select and prepare additional Puffin-Traj-1M web previews.

The script reads individual ZIP members over HTTP ranges, samples the same
15 evenly spaced frames used by the existing gallery, and creates 384px H.264
previews without downloading a multi-gigabyte shard in full.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import io
import json
import struct
import subprocess
import tempfile
import urllib.request
import zipfile
import zlib
from pathlib import Path


DATASET_URL = (
    "https://huggingface.co/datasets/KangLiao/Puffin-16M/resolve/main/"
    "Puffin-Traj-1M/data/{shard}.zip?download=true"
)
SAMPLE_INDICES = tuple(range(1, 90, 6))


class HttpRangeReader(io.RawIOBase):
    """Minimal seekable reader backed by HTTP byte-range requests."""

    def __init__(self, url: str):
        with urllib.request.urlopen(
            urllib.request.Request(url, method="HEAD"), timeout=60
        ) as response:
            self.url = response.geturl()
            self.size = int(response.headers["Content-Length"])
        self.position = 0

    def readable(self) -> bool:
        return True

    def seekable(self) -> bool:
        return True

    def tell(self) -> int:
        return self.position

    def seek(self, offset: int, whence: int = io.SEEK_SET) -> int:
        if whence == io.SEEK_SET:
            self.position = offset
        elif whence == io.SEEK_CUR:
            self.position += offset
        elif whence == io.SEEK_END:
            self.position = self.size + offset
        else:
            raise ValueError(f"unsupported whence: {whence}")
        return self.position

    def read(self, size: int = -1) -> bytes:
        if size < 0:
            size = self.size - self.position
        if size <= 0:
            return b""
        start = self.position
        end = min(self.size - 1, start + size - 1)
        request = urllib.request.Request(
            self.url, headers={"Range": f"bytes={start}-{end}"}
        )
        with urllib.request.urlopen(request, timeout=180) as response:
            data = response.read()
        self.position += len(data)
        return data


def scene_prefixes(archive: zipfile.ZipFile, shard: str) -> list[str]:
    suffix = "/cameras.json"
    return [name[: -len(suffix)] for name in archive.namelist() if name.endswith(suffix)]


def fetch_range(url: str, start: int, end: int) -> bytes:
    request = urllib.request.Request(url, headers={"Range": f"bytes={start}-{end}"})
    with urllib.request.urlopen(request, timeout=180) as response:
        return response.read()


def read_member(url: str, info: zipfile.ZipInfo) -> bytes:
    """Read a member directly from its local header without reopening the archive."""
    header = fetch_range(url, info.header_offset, info.header_offset + 29)
    signature, *_fields, name_length, extra_length = struct.unpack(
        "<IHHHHHIIIHH", header
    )
    if signature != 0x04034B50:
        raise zipfile.BadZipFile(f"invalid local header for {info.filename}")
    data_offset = info.header_offset + 30 + name_length + extra_length
    compressed = fetch_range(
        url, data_offset, data_offset + info.compress_size - 1
    )
    if info.compress_type == zipfile.ZIP_STORED:
        return compressed
    if info.compress_type == zipfile.ZIP_DEFLATED:
        return zlib.decompress(compressed, -15)
    raise NotImplementedError(
        f"compression type {info.compress_type} for {info.filename}"
    )


def summarize(camera_data: dict, shard: str, scene: str) -> dict:
    motion_type = camera_data["motion_type"]
    frames = camera_data["frames"]
    angle_key = f"{motion_type}_deg"
    return {
        "type": motion_type,
        "pattern": camera_data["sub_pattern"],
        "source_shard": shard,
        "source_scene": scene,
        "vfov_deg": round(float(camera_data["vfov_deg"]), 1),
        "frame_count": len(frames),
        "sampled_frames": len(SAMPLE_INDICES),
        "start_deg": round(float(frames[0][angle_key]), 1),
        "end_deg": round(float(frames[-1][angle_key]), 1),
    }


def scan(args: argparse.Namespace) -> None:
    from PIL import Image, ImageDraw

    url = DATASET_URL.format(shard=args.shard)
    excluded = set(args.exclude)
    candidates: dict[str, list[tuple[dict, Image.Image]]] = {
        "pitch": [],
        "yaw": [],
        "roll": [],
    }
    reader = HttpRangeReader(url)
    with zipfile.ZipFile(reader) as archive:
        infos = {info.filename: info for info in archive.infolist()}
        camera_infos = [
            info
            for info in archive.infolist()
            if info.filename.endswith("/cameras.json")
            and info.filename.rsplit("/", 2)[-2] not in excluded
        ][: max(args.per_axis * 9, 24)]

    with ThreadPoolExecutor(max_workers=16) as pool:
        camera_payloads = list(
            pool.map(lambda info: read_member(reader.url, info), camera_infos)
        )

    chosen = []
    for info, payload in zip(camera_infos, camera_payloads):
        prefix = info.filename[: -len("/cameras.json")]
        scene = prefix.rsplit("/", 1)[-1]
        camera_data = json.loads(payload)
        motion_type = camera_data.get("motion_type")
        if motion_type not in candidates or len(candidates[motion_type]) >= args.per_axis:
            continue
        meta = summarize(camera_data, args.shard, scene)
        candidates[motion_type].append((meta, None))
        chosen.append((motion_type, len(candidates[motion_type]) - 1, prefix))
        if all(len(items) >= args.per_axis for items in candidates.values()):
            break

    preview_infos = [infos[f"{prefix}/000043.jpg"] for _, _, prefix in chosen]
    with ThreadPoolExecutor(max_workers=16) as pool:
        previews = list(pool.map(lambda info: read_member(reader.url, info), preview_infos))
    for (motion_type, index, _prefix), payload in zip(chosen, previews):
        meta, _ = candidates[motion_type][index]
        candidates[motion_type][index] = (
            meta,
            Image.open(io.BytesIO(payload)).convert("RGB"),
        )

    args.output.mkdir(parents=True, exist_ok=True)
    metadata = {axis: [item[0] for item in items] for axis, items in candidates.items()}
    (args.output / "candidates.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )
    for axis, items in candidates.items():
        cell = 260
        label_height = 54
        columns = 4
        rows = (len(items) + columns - 1) // columns
        sheet = Image.new("RGB", (columns * cell, rows * (cell + label_height)), "#0a0a09")
        draw = ImageDraw.Draw(sheet)
        for index, (meta, image) in enumerate(items):
            left = (index % columns) * cell
            top = (index // columns) * (cell + label_height)
            image = image.resize((cell, cell), Image.Resampling.LANCZOS)
            sheet.paste(image, (left, top))
            draw.text(
                (left + 8, top + cell + 7),
                f"{index + 1:02d}  {meta['pattern']}  vFoV {meta['vfov_deg']}\n{meta['source_scene']}",
                fill="#f3ebdd",
            )
        sheet.save(args.output / f"{axis}-candidates.jpg", quality=92)


def prepare(args: argparse.Namespace) -> None:
    selections = json.loads(args.selection.read_text(encoding="utf-8"))
    url = DATASET_URL.format(shard=args.shard)
    args.output.mkdir(parents=True, exist_ok=True)
    manifest_items = []
    reader = HttpRangeReader(url)
    with zipfile.ZipFile(reader) as archive:
        infos = {info.filename: info for info in archive.infolist()}

    selected_items = [
        (axis, order, scene, f"{args.shard}/{scene}")
        for axis in ("pitch", "yaw", "roll")
        for order, scene in enumerate(selections[axis], start=args.start_order)
    ]
    camera_infos = [infos[f"{prefix}/cameras.json"] for _, _, _, prefix in selected_items]
    with ThreadPoolExecutor(max_workers=16) as pool:
        camera_payloads = list(
            pool.map(lambda info: read_member(reader.url, info), camera_infos)
        )

    for (axis, order, scene, prefix), camera_payload in zip(
        selected_items, camera_payloads
    ):
                camera_data = json.loads(camera_payload)
                meta = summarize(camera_data, args.shard, scene)
                if meta["type"] != axis:
                    raise ValueError(f"{scene} is {meta['type']}, expected {axis}")
                axis_output = args.output / axis
                axis_output.mkdir(parents=True, exist_ok=True)
                output_video = axis_output / f"{order:02d}.mp4"
                mobile_output = args.output / "mobile" / axis / f"{order:02d}.mp4"
                superres_output = args.output / "superres" / axis / f"{order:02d}.mp4"
                mobile_output.parent.mkdir(parents=True, exist_ok=True)
                superres_output.parent.mkdir(parents=True, exist_ok=True)
                with tempfile.TemporaryDirectory(prefix=f"puffin-{axis}-{order:02d}-") as temp:
                    frame_dir = Path(temp)
                    source_infos = [
                        infos[f"{prefix}/{source_index:06d}.jpg"]
                        for source_index in SAMPLE_INDICES
                    ]
                    with ThreadPoolExecutor(max_workers=15) as pool:
                        frame_payloads = list(
                            pool.map(lambda info: read_member(reader.url, info), source_infos)
                        )
                    for output_index, payload in enumerate(frame_payloads, start=1):
                        (frame_dir / f"{output_index:03d}.jpg").write_bytes(
                            payload
                        )
                    variant_specs = {
                        "web": (384, "20", output_video),
                        "mobile": (960, "19", mobile_output),
                        "superres": (1536, "18", superres_output),
                    }
                    for variant in args.variants:
                        size, crf, target = variant_specs[variant]
                        filters = [
                            "scale=1536:1536:flags=lanczos",
                            "unsharp=5:5:0.35:5:5:0.0",
                        ]
                        if size != 1536:
                            filters.append(f"scale={size}:{size}:flags=lanczos")
                        filters.append("format=yuv420p")
                        subprocess.run([
                            "ffmpeg",
                            "-y",
                            "-loglevel",
                            "error",
                            "-framerate",
                            "6",
                            "-i",
                            str(frame_dir / "%03d.jpg"),
                            "-vf",
                            ",".join(filters),
                            "-c:v",
                            "libx264",
                            "-profile:v",
                            "high",
                            "-preset",
                            "slow",
                            "-crf",
                            crf,
                            "-movflags",
                            "+faststart",
                            str(target),
                        ], check=True)
                manifest_items.append(
                    {
                        "id": f"{axis}-{order:02d}",
                        **meta,
                        "order": order,
                        "video": f"/data/traj/{axis}/{order:02d}.mp4",
                    }
                )
    (args.output / "additions.json").write_text(
        json.dumps(manifest_items, indent=2), encoding="utf-8"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    scan_parser = subparsers.add_parser("scan")
    scan_parser.add_argument("--shard", default="000000")
    scan_parser.add_argument("--per-axis", type=int, default=12)
    scan_parser.add_argument("--exclude", action="append", default=[])
    scan_parser.add_argument("--output", type=Path, required=True)
    scan_parser.set_defaults(func=scan)

    prepare_parser = subparsers.add_parser("prepare")
    prepare_parser.add_argument("--shard", default="000000")
    prepare_parser.add_argument("--selection", type=Path, required=True)
    prepare_parser.add_argument("--output", type=Path, required=True)
    prepare_parser.add_argument("--start-order", type=int, default=9)
    prepare_parser.add_argument(
        "--variants",
        nargs="+",
        choices=("web", "mobile", "superres"),
        default=("web", "mobile", "superres"),
    )
    prepare_parser.set_defaults(func=prepare)
    return parser.parse_args()


if __name__ == "__main__":
    options = parse_args()
    options.func(options)
