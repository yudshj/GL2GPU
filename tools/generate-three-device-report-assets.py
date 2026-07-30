#!/usr/bin/env python3

import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = REPO_ROOT / "reports" / "assets"

DEVICES = ["Echo M4", "Mac mini M4", "Genesis M1"]
COLORS = ["#3274A1", "#E1812C", "#6B8E23"]
HATCHES = ["", "//", "xx"]
SCENES = ["Aquarium", "MotionMark", "Sprites"]


def read_json(path):
    with path.open("r", encoding="utf-8") as source:
        return json.load(source)


def demo_summary(path):
    report = read_json(path)
    return {row["benchmark"]: row for row in report["summary"]}


def demo_ratios():
    values = {}
    for objects in (100000, 300000):
        local = demo_summary(
            REPO_ROOT
            / "output"
            / "multidevice-20260714"
            / "local"
            / f"demo-n{objects}"
            / "results.json"
        )
        mini = demo_summary(
            REPO_ROOT
            / "output"
            / "multidevice-20260714"
            / "mac-mini-m4"
            / f"demo-n{objects}"
            / "results.json"
        )
        genesis_report = read_json(
            REPO_ROOT
            / "output"
            / "multidevice-20260714"
            / "genesis-m1"
            / "chrome150-performance-summary.json"
        )
        genesis = {
            row["scene"]: row["summary"]
            for row in genesis_report["demo"]
            if row["objects"] == objects
        }
        values[objects] = {
            "Echo M4": {scene: local[scene.lower()]["tintVsManualFpsRatio"] for scene in SCENES},
            "Mac mini M4": {scene: mini[scene.lower()]["tintVsManualFpsRatio"] for scene in SCENES},
            "Genesis M1": {scene: genesis[scene.lower()]["tintVsManualFpsRatio"] for scene in SCENES},
        }
    return values


def spark_ratios():
    summaries = {device: report["summary"] for device, report in spark_source_reports().items()}
    names = ["Van Gogh Room", "Bicycle cleaned", "Bicycle full"]
    keys = ["van_gogh_room", "bicycle_30000_cleaned", "bicycle_30000"]
    return names, {
        device: {
            name: next(row for row in summaries[device] if row["scene"] == key)["tintVsWebglFpsRatio"]
            for name, key in zip(names, keys)
        }
        for device in DEVICES
    }


def spark_source_reports():
    return {
        "Echo M4": read_json(
            REPO_ROOT
            / "output"
            / "multidevice-20260715"
            / "local"
            / "spark-requested-scenes"
            / "results.json"
        ),
        "Mac mini M4": read_json(
            REPO_ROOT
            / "output"
            / "multidevice-20260715"
            / "mac-mini-m4"
            / "spark-requested-scenes"
            / "results.json"
        ),
        "Genesis M1": read_json(
            REPO_ROOT
            / "output"
            / "multidevice-20260715"
            / "genesis-m1"
            / "spark-requested-scenes"
            / "results.json"
        ),
    }


def validate_spark_reports():
    for device, report in spark_source_reports().items():
        assert report["browser"]["headless"] is False, f"{device} did not use headed Chrome"
        assert report["specializeBooleanUniforms"] is False
        assert report["measurementMode"] == "gpu-throughput"
        assert report["trials"] == 3
        assert report["maxTrials"] == 5
        assert report["varianceThreshold"] == 0.05
        assert len(report["summary"]) == 3
        for scene in report["summary"]:
            assert scene["pass"] is True, f"{device}/{scene['scene']} failed"
            assert scene["medianSsim"] >= 0.9999
            initial_cvs = []
            for mode in ("webgl", "gl2gpu-tint"):
                values = sorted(
                    (
                        result["trial"],
                        result["frameSummary"]["medianMs"],
                    )
                    for result in report["results"]
                    if result["scene"] == scene["scene"]
                    and result["mode"] == mode
                    and 1 <= result["trial"] <= report["trials"]
                    and result["valid"]
                )
                assert len(values) == report["trials"]
                frame_times = np.array([value for _, value in values])
                initial_cvs.append(float(np.std(frame_times) / np.mean(frame_times)))
            expected = report["maxTrials"] if any(
                cv > report["varianceThreshold"] for cv in initial_cvs
            ) else report["trials"]
            for mode in ("webgl", "gl2gpu-tint"):
                assert scene["modes"][mode]["validTrials"] == expected
                assert scene["modes"][mode]["totalTrials"] == expected
            assert scene["modes"]["gl2gpu-tint"]["shaderDbRequests"] == 0


def style():
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "font.size": 11,
            "axes.titlesize": 13,
            "axes.labelsize": 11,
            "axes.edgecolor": "#5A5A5A",
            "axes.linewidth": 0.8,
            "axes.grid": True,
            "axes.axisbelow": True,
            "grid.color": "#D9D9D9",
            "grid.linewidth": 0.7,
            "grid.alpha": 0.8,
            "figure.facecolor": "white",
            "axes.facecolor": "white",
            "text.color": "#242424",
        }
    )


def add_labels(axis, bars, digits=2):
    for bar in bars:
        height = bar.get_height()
        axis.text(
            bar.get_x() + bar.get_width() / 2,
            height + 0.025,
            f"{height:.{digits}f}x",
            ha="center",
            va="bottom",
            fontsize=8.5,
            color="#242424",
        )


def plot_demo_ratios():
    values = demo_ratios()
    figure, axes = plt.subplots(1, 2, figsize=(12.2, 5.2), sharey=True)
    width = 0.24
    x = np.arange(len(SCENES))
    for axis, objects in zip(axes, (100000, 300000)):
        for index, device in enumerate(DEVICES):
            bars = axis.bar(
                x + (index - 1) * width,
                [values[objects][device][scene] for scene in SCENES],
                width,
                label=device,
                color=COLORS[index],
                edgecolor="#333333",
                linewidth=0.6,
                hatch=HATCHES[index],
            )
            add_labels(axis, bars)
        axis.axhline(1.0, color="#222222", linewidth=1.1, linestyle="-", label="Parity" if objects == 100000 else None)
        axis.axhline(0.9, color="#8A6D1D", linewidth=1.0, linestyle="--", label="90% gate" if objects == 100000 else None)
        axis.set_title(f"N = {objects:,}")
        axis.set_xticks(x, SCENES)
        axis.set_ylim(0, 1.16)
        axis.set_ylabel("Tint / manual median FPS" if objects == 100000 else "")
        axis.spines[["top", "right"]].set_visible(False)
        axis.grid(axis="x", visible=False)
    handles, labels = axes[0].get_legend_handles_labels()
    figure.legend(handles, labels, loc="upper center", ncol=5, frameon=False, bbox_to_anchor=(0.5, 1.02))
    figure.suptitle("GL2GPU Demo performance ratio", y=1.10, fontsize=15, fontweight="semibold")
    figure.text(
        0.5,
        -0.01,
        "Three headed Chrome 150 devices; median of three ABBA trials. "
        "MotionMark captures fail the RMSE gate and are exploratory.",
        ha="center",
        fontsize=9.5,
        color="#555555",
    )
    figure.tight_layout(rect=(0, 0.04, 1, 0.96))
    save_figure(figure, "demo-tint-manual-ratios")


def plot_spark_ratios():
    scene_names, values = spark_ratios()
    figure, axis = plt.subplots(figsize=(9.6, 5.2))
    width = 0.24
    x = np.arange(len(scene_names))
    for index, device in enumerate(DEVICES):
        bars = axis.bar(
            x + (index - 1) * width,
            [values[device][scene] for scene in scene_names],
            width,
            label=device,
            color=COLORS[index],
            edgecolor="#333333",
            linewidth=0.6,
            hatch=HATCHES[index],
        )
        add_labels(axis, bars)
    axis.axhline(1.0, color="#222222", linewidth=1.1, linestyle="-", label="WebGL parity")
    axis.set_xticks(x, scene_names)
    axis.set_ylim(0, 3.45)
    axis.set_ylabel("Complete GL2GPU / WebGL median FPS")
    axis.set_title("Spark v2.1.0 complete-path performance ratio", pad=18, fontweight="semibold")
    axis.spines[["top", "right"]].set_visible(False)
    axis.grid(axis="x", visible=False)
    axis.legend(loc="upper left", ncol=2, frameon=False)
    figure.text(
        0.5,
        0.01,
        "Static cameras; complete GL2GPU includes runtime Tint plus explicit vertex precompute/compaction.\n"
        "3 trials, extended to 5 when initial frame-time CV > 5%.",
        ha="center",
        fontsize=9,
        color="#555555",
    )
    figure.tight_layout(rect=(0, 0.05, 1, 1))
    save_figure(figure, "spark-tint-webgl-ratios")


def plot_cts_triangle_montage():
    images = [
        ("Echo M4", REPO_ROOT / "output" / "webgl-cts-20260715-local-serial" / "chunk-600" / "conformance_rendering_triangle.html.png"),
        ("Mac mini M4", REPO_ROOT / "output" / "webgl-cts-20260715-visual" / "m4" / "triangle.png"),
        ("Genesis M1", REPO_ROOT / "output" / "webgl-cts-20260715-visual" / "m1" / "triangle.png"),
    ]
    figure, axes = plt.subplots(1, 3, figsize=(12.2, 3.3))
    for axis, (title, image_path) in zip(axes, images):
        pixels = plt.imread(image_path)
        axis.imshow(pixels[:420, :780])
        axis.set_title(title, fontsize=11, fontweight="semibold")
        axis.axis("off")
    figure.suptitle("WebGL CTS rendering/triangle.html (GL2GPU Tint)", fontsize=14, fontweight="semibold")
    figure.tight_layout(rect=(0, 0, 1, 0.91))
    save_raster_figure(figure, "cts-triangle-three-device")


def plot_remote_spark_montage():
    rows = [
        (
            "Mac mini M4",
            REPO_ROOT / "output" / "multidevice-20260715" / "mac-mini-m4" / "spark-requested-scenes",
        ),
        (
            "Genesis M1",
            REPO_ROOT / "output" / "multidevice-20260715" / "genesis-m1" / "spark-requested-scenes",
        ),
    ]
    scenes = [
        ("Van Gogh Room", "van_gogh_room-gl2gpu-tint-preflight-gl2gpu-tint.png"),
        ("Bicycle cleaned", "bicycle_30000_cleaned-gl2gpu-tint-preflight-gl2gpu-tint.png"),
        ("Bicycle full", "bicycle_30000-gl2gpu-tint-preflight-gl2gpu-tint.png"),
    ]
    figure, axes = plt.subplots(2, 3, figsize=(12.2, 7.0))
    for row_index, (device, root) in enumerate(rows):
        for column_index, (scene, filename) in enumerate(scenes):
            axis = axes[row_index, column_index]
            axis.imshow(plt.imread(root / filename))
            if row_index == 0:
                axis.set_title(scene, fontsize=11, fontweight="semibold")
            if column_index == 0:
                axis.set_ylabel(device, fontsize=10.5, fontweight="semibold")
            axis.set_xticks([])
            axis.set_yticks([])
    figure.suptitle("Remote GL2GPU Tint rendering (Spark v2.1.0)", fontsize=14, fontweight="semibold")
    figure.tight_layout(rect=(0, 0, 1, 0.95))
    save_raster_figure(figure, "spark-remote-rendering-montage")


def save_figure(figure, name):
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    figure.savefig(OUTPUT_ROOT / f"{name}.png", dpi=180, bbox_inches="tight", facecolor="white")
    svg_path = OUTPUT_ROOT / f"{name}.svg"
    figure.savefig(svg_path, bbox_inches="tight", facecolor="white")
    svg_lines = svg_path.read_text(encoding="utf-8").splitlines()
    svg_path.write_text("\n".join(line.rstrip() for line in svg_lines) + "\n", encoding="utf-8")
    plt.close(figure)


def save_raster_figure(figure, name):
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    figure.savefig(OUTPUT_ROOT / f"{name}.png", dpi=160, bbox_inches="tight", facecolor="white")
    plt.close(figure)


def main():
    style()
    validate_spark_reports()
    plot_demo_ratios()
    plot_spark_ratios()
    plot_cts_triangle_montage()
    plot_remote_spark_montage()
    print(OUTPUT_ROOT)


if __name__ == "__main__":
    main()
